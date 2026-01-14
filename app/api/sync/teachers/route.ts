/**
 * 教师同步API
 * 从PowerSchool获取教师数据并保存到数据库
 */

import { NextResponse } from 'next/server';
import { settingsRepository, schoolRepository, teacherRepository, syncLogRepository } from '@/lib/database/repositories';

// PowerSchool返回的教师数据结构
interface PSTeacherRecord {
  id: number;
  name: string;
  tables: {
    teachers: {
      id: string;
      dcid: string;
      first_name: string;
      last_name: string;
      lastfirst: string;
      email_addr: string;
      schoolid: string;
      staffstatus: string;
    };
  };
}

interface PSTeachersResponse {
  name: string;
  record: PSTeacherRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/teachers - 同步教师数据
 */
export async function POST() {
  const startTime = Date.now();
  
  try {
    // 获取PowerSchool配置
    const config = await settingsRepository.getPowerSchoolConfig();
    
    if (!config.endpoint || !config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: 'PowerSchool configuration is incomplete' },
        { status: 400 }
      );
    }
    
    if (!config.accessToken) {
      return NextResponse.json(
        { error: 'PowerSchool access token not found. Please get a token first.' },
        { status: 401 }
      );
    }

    // 创建同步日志
    const log = await syncLogRepository.create('teachers');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.teachers`;
    console.log(`Calling PowerSchool API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PowerSchool API error:', errorText);
      await syncLogRepository.fail(log.id, `PowerSchool API error: ${response.status}`);
      throw new Error(`PowerSchool API error: ${response.status} ${response.statusText}`);
    }

    const data: PSTeachersResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} teachers from PowerSchool`);

    // 按schoolId分组教师，并确保每个学校存在
    const teachersBySchool = new Map<number, typeof data.record>();
    for (const record of data.record) {
      const schoolId = parseInt(record.tables.teachers.schoolid, 10);
      if (!teachersBySchool.has(schoolId)) {
        teachersBySchool.set(schoolId, []);
      }
      teachersBySchool.get(schoolId)!.push(record);
    }

    // 确保所有涉及的学校存在
    const schoolMap = new Map<number, string>();
    for (const psSchoolId of teachersBySchool.keys()) {
      let school = await schoolRepository.findByPsId(psSchoolId);
      if (!school) {
        school = await schoolRepository.upsert({
          psId: psSchoolId,
          name: psSchoolId === 0 ? 'District Office' : `School ${psSchoolId}`,
        });
      }
      schoolMap.set(psSchoolId, school.id);
    }

    // 解析并保存教师数据
    const teachersToSave = data.record.map((record) => {
      const teacher = record.tables.teachers;
      const psSchoolId = parseInt(teacher.schoolid, 10);
      return {
        psId: parseInt(teacher.id, 10),
        psDcid: parseInt(teacher.dcid, 10),
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        lastFirst: teacher.lastfirst || undefined,
        email: teacher.email_addr || undefined,
        staffStatus: teacher.staffstatus ? parseInt(teacher.staffstatus, 10) : undefined,
        isActive: teacher.staffstatus === '1',
        schoolId: schoolMap.get(psSchoolId)!,
      };
    });

    console.log(`Parsed ${teachersToSave.length} teachers`);

    // 批量保存到数据库
    await teacherRepository.upsertMany(teachersToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, teachersToSave.length, {
      teachers: teachersToSave.map(t => ({ id: t.psId, name: `${t.firstName} ${t.lastName}` })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${teachersToSave.length} teachers`,
      data: {
        count: teachersToSave.length,
        duration: `${duration}ms`,
        teachers: teachersToSave.map(t => ({
          psId: t.psId,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          isActive: t.isActive,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync teachers:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync teachers',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/teachers - 获取已同步的教师列表
 */
export async function GET() {
  try {
    const teachers = await teacherRepository.findAll();
    
    return NextResponse.json({
      teachers: teachers.map(t => ({
        id: t.id,
        psId: t.psId,
        psDcid: t.psDcid,
        firstName: t.firstName,
        lastName: t.lastName,
        lastFirst: t.lastFirst,
        email: t.email,
        staffStatus: t.staffStatus,
        isActive: t.isActive,
        schoolId: t.schoolId,
      })),
      total: teachers.length,
    });
  } catch (error) {
    console.error('Failed to get teachers:', error);
    return NextResponse.json(
      { error: 'Failed to get teachers', teachers: [] },
      { status: 500 }
    );
  }
}

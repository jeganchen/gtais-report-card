/**
 * 学生同步API
 * 从PowerSchool获取学生数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, studentRepository, syncLogRepository } from '@/lib/database/repositories';

// PowerSchool返回的学生数据结构
interface PSStudentRecord {
  id: number;
  name: string;
  tables: {
    students: {
      id: string;
      dcid: string;
      student_number: string;
      first_name: string;
      last_name: string;
      middle_name: string | null;
      gender: string | null;
      grade_level: string;
      schoolid: string;
      home_room: string | null;
      enroll_status: string;
      entrydate: string | null;
      exitdate: string | null;
      dob: string | null;
      family_ident: string | null;
      street: string | null;
      city: string | null;
      home_phone: string | null;
      guardianemail: string | null;
    };
  };
}

interface PSStudentsResponse {
  name: string;
  record: PSStudentRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/students - 同步学生数据（获取所有学生，不需要传递 schoolId 参数）
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
    const log = await syncLogRepository.create('students');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API（不传递 schoolid 参数，获取所有学生）
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.students`;
    console.log(`Calling PowerSchool API: ${apiUrl} (fetching all students)`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({}),  // 空对象，不传递参数
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PowerSchool API error:', errorText);
      await syncLogRepository.fail(log.id, `PowerSchool API error: ${response.status}`);
      throw new Error(`PowerSchool API error: ${response.status} ${response.statusText}`);
    }

    const data: PSStudentsResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} students from PowerSchool`);

    // 解析并保存学生数据
    const studentsToSave = data.record.map((record) => {
      const student = record.tables.students;
      return {
        psId: parseInt(student.id, 10),
        psDcid: parseInt(student.dcid, 10),
        studentNumber: student.student_number,
        firstName: student.first_name,
        lastName: student.last_name,
        middleName: student.middle_name || undefined,
        gender: student.gender || undefined,
        gradeLevel: parseInt(student.grade_level, 10),
        homeRoom: student.home_room || undefined,
        enrollStatus: student.enroll_status ? parseInt(student.enroll_status, 10) : undefined,
        entryDate: student.entrydate ? new Date(student.entrydate) : undefined,
        exitDate: student.exitdate ? new Date(student.exitdate) : undefined,
        dob: student.dob && student.dob !== '' ? new Date(student.dob) : undefined,
        familyIdent: student.family_ident ? parseInt(student.family_ident, 10) : undefined,
        street: student.street || undefined,
        city: student.city || undefined,
        homePhone: student.home_phone || undefined,
        guardianEmail: student.guardianemail || undefined,
        schoolId: parseInt(student.schoolid, 10),  // 直接存储 PowerSchool 的 schoolid
      };
    });

    console.log(`Parsed ${studentsToSave.length} students`);

    // 批量保存到数据库
    await studentRepository.upsertMany(studentsToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, studentsToSave.length, {
      students: studentsToSave.map(s => ({ 
        id: s.psId, 
        name: `${s.firstName} ${s.lastName}`,
        studentNumber: s.studentNumber,
        schoolId: s.schoolId,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${studentsToSave.length} students`,
      data: {
        count: studentsToSave.length,
        duration: `${duration}ms`,
        students: studentsToSave.map(s => ({
          psId: s.psId,
          studentNumber: s.studentNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          gradeLevel: s.gradeLevel,
          homeRoom: s.homeRoom,
          schoolId: s.schoolId,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync students:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync students',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/students - 获取已同步的学生列表
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const gradeLevel = searchParams.get('gradeLevel');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    
    const filter: { schoolId?: number; gradeLevel?: number } = {};
    if (schoolId) filter.schoolId = parseInt(schoolId, 10);  // schoolId 现在是 number 类型 (ps_school_id)
    if (gradeLevel) filter.gradeLevel = parseInt(gradeLevel, 10);
    
    const result = await studentRepository.findMany(filter, { page, pageSize });
    
    return NextResponse.json({
      students: result.students.map(s => ({
        id: s.id,
        psId: s.psId,
        psDcid: s.psDcid,
        studentNumber: s.studentNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        chineseName: s.chineseName,
        gender: s.gender,
        gradeLevel: s.gradeLevel,
        homeRoom: s.homeRoom,
        enrollStatus: s.enrollStatus,
        entryDate: s.entryDate?.toISOString().split('T')[0],
        exitDate: s.exitDate?.toISOString().split('T')[0],
        guardianEmail: s.guardianEmail,
        pdfGenerated: s.pdfGenerated,
        pdfGeneratedAt: s.pdfGeneratedAt?.toISOString(),
        schoolId: s.schoolId,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error('Failed to get students:', error);
    return NextResponse.json(
      { error: 'Failed to get students', students: [], total: 0 },
      { status: 500 }
    );
  }
}

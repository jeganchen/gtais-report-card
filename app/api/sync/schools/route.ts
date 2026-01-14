/**
 * 学校同步API
 * 从PowerSchool获取学校数据并保存到数据库
 */

import { NextResponse } from 'next/server';
import { settingsRepository, schoolRepository, syncLogRepository } from '@/lib/database/repositories';

// PowerSchool返回的学校数据结构
interface PSSchoolRecord {
  id: number;
  name: string;
  tables: {
    schools: {
      id: string;
      dcid: string;
      name: string;
      abbreviation: string;
      school_number: string;
    };
  };
}

interface PSSchoolsResponse {
  name: string;
  record: PSSchoolRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/schools - 同步学校数据
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
    const log = await syncLogRepository.create('schools');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.schools`;
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

    const data: PSSchoolsResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} schools from PowerSchool`);

    // 解析并保存学校数据
    const schoolsToSave = data.record.map((record) => {
      const school = record.tables.schools;
      return {
        psId: parseInt(school.id, 10),
        psDcid: parseInt(school.dcid, 10),
        name: school.name,
        abbreviation: school.abbreviation || undefined,
        schoolNumber: school.school_number || undefined,
      };
    });

    console.log(`Parsed ${schoolsToSave.length} schools`);

    // 批量保存到数据库
    await schoolRepository.upsertMany(schoolsToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, schoolsToSave.length, {
      schools: schoolsToSave.map(s => ({ id: s.psId, name: s.name })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${schoolsToSave.length} schools`,
      data: {
        count: schoolsToSave.length,
        duration: `${duration}ms`,
        schools: schoolsToSave.map(s => ({
          psId: s.psId,
          name: s.name,
          abbreviation: s.abbreviation,
          schoolNumber: s.schoolNumber,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync schools:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync schools',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/schools - 获取已同步的学校列表
 */
export async function GET() {
  try {
    const schools = await schoolRepository.findAll();
    
    return NextResponse.json({
      schools: schools.map(s => ({
        id: s.id,
        psId: s.psId,
        psDcid: s.psDcid,
        name: s.name,
        abbreviation: s.abbreviation,
        schoolNumber: s.schoolNumber,
      })),
      total: schools.length,
    });
  } catch (error) {
    console.error('Failed to get schools:', error);
    return NextResponse.json(
      { error: 'Failed to get schools', schools: [] },
      { status: 500 }
    );
  }
}

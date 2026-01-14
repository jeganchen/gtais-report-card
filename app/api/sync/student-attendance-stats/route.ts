/**
 * 学生考勤统计 API
 * 从 PowerSchool 获取学生考勤统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository } from '@/lib/database/repositories';
import { getPowerSchoolClient } from '@/lib/powerschool/client';

interface PSAttendanceStatsRecord {
  name: string;
  tables: {
    students: {
      tardyq4: string;
      tardyq3: string;
      firstname: string;
      tardyq2: string;
      tardyq1: string;
      studentnumber: string;
      absentq3: string;
      absentq2: string;
      absentq1: string;
      lastname: string;
      absentq4: string;
    };
  };
}

export interface AttendanceStatsResult {
  studentNumber: string;
  firstName: string;
  lastName: string;
  quarters: Array<{
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    absent: number;
    tardy: number;
  }>;
}

/**
 * 从 PowerSchool 获取学生考勤统计
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { sdcid, yearid } = await request.json();

    if (!sdcid || !yearid) {
      return NextResponse.json(
        { error: 'Missing sdcid or yearid parameter' },
        { status: 400 }
      );
    }

    const config = await settingsRepository.getPowerSchoolConfig();
    if (!config.endpoint || !config.accessToken) {
      return NextResponse.json(
        { error: 'PowerSchool configuration incomplete or token missing' },
        { status: 400 }
      );
    }

    const psClient = getPowerSchoolClient({
      endpoint: config.endpoint,
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      accessToken: config.accessToken,
      tokenExpiresAt: config.tokenExpiresAt || undefined,
    });

    console.log(`[AttendanceStats] Fetching attendance stats for sdcid: ${sdcid}, yearid: ${yearid}`);

    const records = await psClient.executeNamedQuery<PSAttendanceStatsRecord>(
      'org.infocare.sync.student_attendance_stats',
      { sdcid, yearid }
    );

    if (!records || records.length === 0) {
      console.log('[AttendanceStats] No attendance data returned');
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No attendance data found',
        duration: `${Date.now() - startTime}ms`,
      });
    }

    const record = records[0];
    const stats = record.tables.students;

    const result: AttendanceStatsResult = {
      studentNumber: stats.studentnumber,
      firstName: stats.firstname,
      lastName: stats.lastname,
      quarters: [
        {
          quarter: 'Q1',
          absent: parseInt(stats.absentq1, 10) || 0,
          tardy: parseInt(stats.tardyq1, 10) || 0,
        },
        {
          quarter: 'Q2',
          absent: parseInt(stats.absentq2, 10) || 0,
          tardy: parseInt(stats.tardyq2, 10) || 0,
        },
        {
          quarter: 'Q3',
          absent: parseInt(stats.absentq3, 10) || 0,
          tardy: parseInt(stats.tardyq3, 10) || 0,
        },
        {
          quarter: 'Q4',
          absent: parseInt(stats.absentq4, 10) || 0,
          tardy: parseInt(stats.tardyq4, 10) || 0,
        },
      ],
    };

    console.log(`[AttendanceStats] Successfully fetched attendance stats for ${result.firstName} ${result.lastName}`);

    return NextResponse.json({
      success: true,
      data: result,
      duration: `${Date.now() - startTime}ms`,
    });

  } catch (error) {
    console.error('[AttendanceStats] Failed to fetch attendance stats:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch attendance stats',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET 方法支持查询参数
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sdcid = parseInt(searchParams.get('sdcid') || '', 10);
  const yearid = parseInt(searchParams.get('yearid') || '', 10);

  if (isNaN(sdcid) || isNaN(yearid)) {
    return NextResponse.json(
      { error: 'Invalid sdcid or yearid parameter' },
      { status: 400 }
    );
  }

  // 复用 POST 逻辑
  const mockRequest = {
    json: async () => ({ sdcid, yearid }),
  } as NextRequest;

  return POST(mockRequest);
}

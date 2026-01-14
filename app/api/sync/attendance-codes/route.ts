/**
 * 考勤代码同步API
 * 从PowerSchool获取考勤代码数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, attendanceCodeRepository, syncLogRepository } from '@/lib/database/repositories';

// PowerSchool返回的考勤代码数据结构
interface PSAttendanceCodeRecord {
  id: number;
  name: string;
  tables: {
    attendance_code: {
      schoolid: string;
      description: string;
      dcid: string;
      presence_status_cd: string;
      yearid: string;
      id: string;
      att_code: string;
    };
  };
}

interface PSAttendanceCodesResponse {
  name: string;
  record: PSAttendanceCodeRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/attendance-codes - 同步考勤代码数据
 */
export async function POST(request: NextRequest) {
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
    const log = await syncLogRepository.create('attendance');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API - 无参数
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.attendance_code`;
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

    const data: PSAttendanceCodesResponse = await response.json();
    const totalReceived = data.record?.length || 0;
    console.log(`Received ${totalReceived} attendance codes from PowerSchool`);

    // 解析并保存考勤代码数据（过滤掉 att_code 为 null 或空的记录）
    const codesToSave = data.record
      .filter((record) => {
        const attCode = record.tables.attendance_code.att_code;
        return attCode !== null && attCode !== undefined && attCode !== '';
      })
      .map((record) => {
        const code = record.tables.attendance_code;
        return {
          psId: parseInt(code.id, 10),
          psDcid: parseInt(code.dcid, 10),
          schoolId: parseInt(code.schoolid, 10),
          yearId: parseInt(code.yearid, 10),
          attCode: code.att_code,
          description: code.description || undefined,
          presenceStatus: code.presence_status_cd || undefined,
        };
      });

    const skippedCount = totalReceived - codesToSave.length;
    console.log(`Parsed ${codesToSave.length} attendance codes, skipped ${skippedCount} (null att_code)`);

    // 批量保存到数据库
    await attendanceCodeRepository.upsertMany(codesToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, codesToSave.length, {
      attendanceCodes: codesToSave.map(c => ({ 
        id: c.psId, 
        attCode: c.attCode,
        description: c.description,
        presenceStatus: c.presenceStatus,
        schoolId: c.schoolId,
        yearId: c.yearId,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${codesToSave.length} attendance codes (skipped ${skippedCount} with null att_code)`,
      data: {
        count: codesToSave.length,
        skipped: skippedCount,
        duration: `${duration}ms`,
        attendanceCodes: codesToSave.map(c => ({
          psId: c.psId,
          attCode: c.attCode,
          description: c.description,
          presenceStatus: c.presenceStatus,
          schoolId: c.schoolId,
          yearId: c.yearId,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync attendance codes:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync attendance codes',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/attendance-codes - 获取已同步的考勤代码列表
 */
export async function GET() {
  try {
    const codes = await attendanceCodeRepository.findAll();
    
    return NextResponse.json({
      attendanceCodes: codes.map(c => ({
        id: c.id,
        psId: c.psId,
        psDcid: c.psDcid,
        schoolId: c.schoolId,
        yearId: c.yearId,
        attCode: c.attCode,
        description: c.description,
        presenceStatus: c.presenceStatus,
      })),
      total: codes.length,
    });
  } catch (error) {
    console.error('Failed to get attendance codes:', error);
    return NextResponse.json(
      { error: 'Failed to get attendance codes', attendanceCodes: [], total: 0 },
      { status: 500 }
    );
  }
}

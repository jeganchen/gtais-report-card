/**
 * 学生同步API
 * 从PowerSchool获取学生数据并保存到数据库
 * 支持分页查询，自动获取所有学生
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, studentRepository, syncLogRepository } from '@/lib/database/repositories';
import { tokenManager } from '@/lib/powerschool/token-manager';

// 分页配置
const PAGE_SIZE = 50;

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
 * 调用 PowerSchool API 获取一页学生数据
 * 如果返回 401，自动刷新 token 并重试
 */
async function fetchStudentsPage(
  apiUrl: string,
  accessToken: string,
  startrow: number,
  endrow: number,
  isRetry = false
): Promise<{ records: PSStudentRecord[]; newToken?: string }> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ startrow, endrow }),
  });

  // 如果返回 401 且不是重试，则刷新 token 并重试
  if (response.status === 401 && !isRetry) {
    console.log('[SyncStudents] Token expired, refreshing...');
    try {
      const newTokenInfo = await tokenManager.fetchNewToken();
      console.log('[SyncStudents] Token refreshed successfully, retrying request...');
      return fetchStudentsPage(apiUrl, newTokenInfo.accessToken, startrow, endrow, true);
    } catch (refreshError) {
      console.error('[SyncStudents] Failed to refresh token:', refreshError);
      throw new Error('PowerSchool access token expired and refresh failed.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PowerSchool API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: PSStudentsResponse = await response.json();
  return { records: data.record || [] };
}

/**
 * POST /api/sync/students - 同步学生数据（分页获取所有学生）
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
    
    // 使用 tokenManager 确保有有效 token（过期会自动刷新）
    let accessToken: string;
    try {
      accessToken = await tokenManager.ensureValidToken();
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to obtain valid PowerSchool access token. Please check your configuration.' },
        { status: 401 }
      );
    }

    // 创建同步日志
    const log = await syncLogRepository.create('students');
    await syncLogRepository.start(log.id);

    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.students`;
    
    // 分页获取所有学生
    const allRecords: PSStudentRecord[] = [];
    let startrow = 1;
    let endrow = PAGE_SIZE;
    let pageCount = 0;
    
    console.log(`[SyncStudents] Starting paginated sync from ${apiUrl}`);
    
    while (true) {
      pageCount++;
      console.log(`[SyncStudents] Fetching page ${pageCount}: rows ${startrow}-${endrow}`);
      
      const { records, newToken } = await fetchStudentsPage(apiUrl, accessToken, startrow, endrow);
      
      // 如果 token 被刷新了，更新本地变量
      if (newToken) {
        accessToken = newToken;
      }
      
      console.log(`[SyncStudents] Page ${pageCount} returned ${records.length} records`);
      
      if (records.length === 0) {
        // 没有更多数据，退出循环
        break;
      }
      
      allRecords.push(...records);
      
      if (records.length < PAGE_SIZE) {
        // 返回数据少于页大小，说明已是最后一页
        break;
      }
      
      // 准备下一页
      startrow += PAGE_SIZE;
      endrow += PAGE_SIZE;
    }
    
    console.log(`[SyncStudents] Total fetched: ${allRecords.length} students in ${pageCount} pages`);

    // 解析并保存学生数据
    const studentsToSave = allRecords.map((record) => {
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

    console.log(`[SyncStudents] Parsed ${studentsToSave.length} students, saving to database...`);

    // 批量保存到数据库
    await studentRepository.upsertMany(studentsToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, studentsToSave.length, {
      pages: pageCount,
      students: studentsToSave.slice(0, 100).map(s => ({  // 只记录前100条，避免日志过大
        id: s.psId, 
        name: `${s.firstName} ${s.lastName}`,
        studentNumber: s.studentNumber,
        schoolId: s.schoolId,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${studentsToSave.length} students in ${pageCount} pages`,
      data: {
        count: studentsToSave.length,
        pages: pageCount,
        duration: `${duration}ms`,
        students: studentsToSave.slice(0, 50).map(s => ({  // 只返回前50条，避免响应过大
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

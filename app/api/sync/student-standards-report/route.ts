/**
 * 学生标准报告 API
 * 从 PowerSchool 获取学生标准成绩数据，用于生成报表
 * 数据不保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository } from '@/lib/database/repositories';
import { getPowerSchoolClient } from '@/lib/powerschool/client';

interface PSStudentStandardRecord {
  id?: number;
  name: string;
  tables: {
    students: {
      storecode: string;
      firstname: string;
      coursename: string;
      studentnumber: string;
      grade: string | null;
      standardcode: string;
      sortorder: string;
      lastname: string;
      sectionnumber: string;
      yearid: string;
      standardname: string;
    };
  };
}

export interface StudentStandardReport {
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseName: string;
  sectionNumber: string;
  storeCode: string; // Q1, Q2, Q3, Q4, etc.
  standardCode: string;
  standardName: string;
  grade: string | null;
  sortOrder: number;
  yearId: number;
}

/**
 * POST /api/sync/student-standards-report
 * 获取学生标准报告数据
 * 
 * Request body:
 * {
 *   "sdcid": 52,      // Student DCID
 *   "yearid": 35,     // Year ID
 *   "startrow": 1,    // 起始行（可选，默认1）
 *   "endrow": 100     // 结束行（可选，默认100）
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { sdcid, yearid, startrow = 1, endrow = 100 } = body;

    if (!sdcid || !yearid) {
      return NextResponse.json(
        { error: 'Missing required parameters: sdcid and yearid are required' },
        { status: 400 }
      );
    }

    const config = await settingsRepository.getPowerSchoolConfig();
    if (!config.endpoint || !config.clientId || !config.clientSecret || !config.accessToken) {
      return NextResponse.json(
        { error: 'PowerSchool configuration incomplete or token missing' },
        { status: 400 }
      );
    }

    // 类型安全的配置对象（已通过上面的检查确保非 null）
    const psConfig = {
      endpoint: config.endpoint,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      accessToken: config.accessToken,
    };

    const psClient = getPowerSchoolClient(psConfig);

    // 调用 PowerSchool 命名查询（带分页参数）
    const psRecords = await psClient.executeNamedQuery<PSStudentStandardRecord>(
      'org.infocare.sync.student_standards_report',
      { 
        sdcid: String(sdcid), 
        yearid: String(yearid),
        startrow: String(startrow),
        endrow: String(endrow)
      }
    );

    // 转换数据格式
    const reports: StudentStandardReport[] = psRecords.map((record) => {
      const student = record.tables.students;
      return {
        studentNumber: student.studentnumber,
        firstName: student.firstname,
        lastName: student.lastname,
        courseName: student.coursename,
        sectionNumber: student.sectionnumber,
        storeCode: student.storecode,
        standardCode: student.standardcode,
        standardName: student.standardname,
        grade: student.grade,
        sortOrder: parseInt(student.sortorder, 10) || 0,
        yearId: parseInt(student.yearid, 10),
      };
    });

    // 按课程和标准排序分组
    const groupedByCourse = reports.reduce((acc, report) => {
      const key = report.courseName;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(report);
      return acc;
    }, {} as Record<string, StudentStandardReport[]>);

    // 对每个课程内的标准按 sortOrder 排序
    Object.keys(groupedByCourse).forEach((course) => {
      groupedByCourse[course].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        studentNumber: reports[0]?.studentNumber || '',
        firstName: reports[0]?.firstName || '',
        lastName: reports[0]?.lastName || '',
        yearId: yearid,
        totalRecords: reports.length,
        courses: Object.keys(groupedByCourse).map((courseName) => ({
          courseName,
          sectionNumber: groupedByCourse[courseName][0]?.sectionNumber || '',
          standards: groupedByCourse[courseName].map((r) => ({
            code: r.standardCode,
            name: r.standardName,
            grades: {
              Q1: groupedByCourse[courseName].find(
                (s) => s.standardCode === r.standardCode && s.storeCode === 'Q1'
              )?.grade || null,
              Q2: groupedByCourse[courseName].find(
                (s) => s.standardCode === r.standardCode && s.storeCode === 'Q2'
              )?.grade || null,
              Q3: groupedByCourse[courseName].find(
                (s) => s.standardCode === r.standardCode && s.storeCode === 'Q3'
              )?.grade || null,
              Q4: groupedByCourse[courseName].find(
                (s) => s.standardCode === r.standardCode && s.storeCode === 'Q4'
              )?.grade || null,
            },
            sortOrder: r.sortOrder,
          })),
        })),
        // 原始记录，供调试使用
        rawRecords: reports,
      },
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('Failed to fetch student standards report:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch student standards report',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/student-standards-report
 * 通过 URL 参数获取数据（便于测试）
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sdcid = searchParams.get('sdcid');
  const yearid = searchParams.get('yearid');
  const startrow = searchParams.get('startrow') || '1';
  const endrow = searchParams.get('endrow') || '100';

  if (!sdcid || !yearid) {
    return NextResponse.json(
      { 
        error: 'Missing required parameters',
        usage: '/api/sync/student-standards-report?sdcid=52&yearid=35&startrow=1&endrow=100'
      },
      { status: 400 }
    );
  }

  // 重用 POST 逻辑
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ 
      sdcid: parseInt(sdcid), 
      yearid: parseInt(yearid),
      startrow: parseInt(startrow),
      endrow: parseInt(endrow)
    }),
  });

  return POST(mockRequest);
}

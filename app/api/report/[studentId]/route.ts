/**
 * 学生报告数据API
 * GET /api/report/[studentId] - 获取报告数据（JSON格式）
 * 
 * Query Parameters:
 * - yearid: 学年ID（可选，默认35）
 */

import { NextRequest, NextResponse } from 'next/server';
import { studentRepository, settingsRepository } from '@/lib/database/repositories';
import { fetchStudentStandardsReportDirect } from '@/lib/services/report.service';
import { getPowerSchoolClient } from '@/lib/powerschool/client';
import { mockSchoolInfo } from '@/mocks/school';
import type { ReportData, Student, SignatureSettings } from '@/types';
import type { AttendanceSummary } from '@/types/attendance';
import type { StudentGrades } from '@/types/grade';

interface RouteParams {
  params: Promise<{
    studentId: string;
  }>;
}

// 将数据库学生对象转换为 Student 类型
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDbStudentToStudent(dbStudent: any): Student | null {
  if (!dbStudent) return null;

  return {
    id: dbStudent.id,
    psId: dbStudent.psId,
    studentNumber: dbStudent.studentNumber,
    firstName: dbStudent.firstName,
    lastName: dbStudent.lastName,
    chineseName: dbStudent.chineseName || undefined,
    gradeLevel: dbStudent.gradeLevel,
    homeRoom: dbStudent.homeRoom || dbStudent.homeroom || undefined,
    enrollStatus: dbStudent.enrollStatus ?? dbStudent.enroll_status ?? undefined,
    entryDate: dbStudent.entryDate?.toISOString?.()?.split('T')[0] || dbStudent.entry_date?.toISOString?.()?.split('T')[0],
    schoolName: dbStudent.school?.name,
    pdfGenerated: dbStudent.pdfGenerated ?? dbStudent.pdf_generated ?? false,
  };
}

// 生成默认的出勤数据
function getDefaultAttendance(): AttendanceSummary {
  return {
    studentId: '',
    schoolYear: '',
    quarters: [
      { quarter: 'Q1', absent: 0, tardy: 0 },
      { quarter: 'Q2', absent: 0, tardy: 0 },
      { quarter: 'Q3', absent: 0, tardy: 0 },
      { quarter: 'Q4', absent: 0, tardy: 0 },
    ],
  };
}

// 生成默认的成绩数据
function getDefaultGrades(studentId: string): StudentGrades {
  return {
    studentId,
    schoolYear: '',
    subjects: [],
  };
}

// 计算学年字符串
function calculateSchoolYear(yearId: number): string {
  const startYear = 1990 + yearId;
  return `${startYear}-${startYear + 1}`;
}

// 从数据库获取签名设置
async function getSignatureFromDatabase(): Promise<SignatureSettings> {
  try {
    const config = await settingsRepository.getSignatureConfig();
    return {
      principalName: config.principalName || '',
      principalTitle: config.principalTitle || 'Principal',
      signatureImageUrl: config.signatureImage || undefined,
    };
  } catch (error) {
    console.error('Failed to get signature settings:', error);
    return {
      principalName: '',
      principalTitle: 'Principal',
      signatureImageUrl: undefined,
    };
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { studentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const yearId = parseInt(searchParams.get('yearid') || '35', 10);

    // 从数据库获取学生信息
    const dbStudent = await studentRepository.findById(studentId);
    if (!dbStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const student = transformDbStudentToStudent(dbStudent);
    if (!student) {
      return NextResponse.json(
        { error: 'Failed to transform student data' },
        { status: 500 }
      );
    }

    // 获取 PowerSchool 配置
    const psConfig = await settingsRepository.getPowerSchoolConfig();

    let grades: StudentGrades = getDefaultGrades(student.id);

    // 如果有 PowerSchool 配置且学生有 psDcid，从 PowerSchool 获取成绩
    if (psConfig.accessToken && psConfig.endpoint && dbStudent.psDcid) {
      try {
        const psClient = getPowerSchoolClient({
          endpoint: psConfig.endpoint,
          clientId: psConfig.clientId || '',
          clientSecret: psConfig.clientSecret || '',
          accessToken: psConfig.accessToken,
          tokenExpiresAt: psConfig.tokenExpiresAt || undefined,
        });

        const fetchedGrades = await fetchStudentStandardsReportDirect(
          dbStudent.psDcid,
          yearId,
          psClient
        );

        if (fetchedGrades && fetchedGrades.subjects.length > 0) {
          grades = fetchedGrades;
        }
      } catch (error) {
        console.error('Failed to fetch grades from PowerSchool:', error);
      }
    }

    // 计算学年
    const schoolYear = calculateSchoolYear(yearId);

    // 默认出勤数据
    const attendance = getDefaultAttendance();
    attendance.studentId = student.id;
    attendance.schoolYear = schoolYear;

    // 获取签名设置
    const signature = await getSignatureFromDatabase();

    const reportData: ReportData = {
      student,
      schoolYear,
      schoolInfo: mockSchoolInfo,
      attendance,
      grades,
      signature,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Failed to get report data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get report data' },
      { status: 500 }
    );
  }
}

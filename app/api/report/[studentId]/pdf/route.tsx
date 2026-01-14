/**
 * PDF 生成 API
 * GET /api/report/[studentId]/pdf - 生成并返回PDF文件
 * 
 * Query Parameters:
 * - yearid: 学年ID（可选，默认35）
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { readFile } from 'fs/promises';
import path from 'path';
import { ReportPDF } from '@/lib/pdf';
import { studentRepository, settingsRepository } from '@/lib/database/repositories';
import { fetchStudentStandardsReportDirect, fetchStudentAttendanceStatsDirect } from '@/lib/services/report.service';
import { getPowerSchoolClient } from '@/lib/powerschool/client';
import { mockSchoolInfo } from '@/mocks/school';
import type { ReportData, SignatureSettings, Student } from '@/types';
import type { AttendanceSummary } from '@/types/attendance';
import type { StudentGrades } from '@/types/grade';

interface RouteContext {
  params: Promise<{
    studentId: string;
  }>;
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

// 读取logo图片并转换为base64
async function getLogoAsBase64(): Promise<string | undefined> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'GTAIS.png');
    const logoBuffer = await readFile(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Failed to read logo:', error);
    return undefined;
  }
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
  // PowerSchool yearId: 35 = 2024-2025, 36 = 2025-2026
  const startYear = 1990 + yearId; // yearId 35 -> 2025
  return `${startYear}-${startYear + 1}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { studentId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const yearId = parseInt(searchParams.get('yearid') || '35', 10);

    console.log(`[PDF] Generating report for student ${studentId}, yearId ${yearId}`);

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

    // 从数据库获取签名设置
    const signature = await getSignatureFromDatabase();

    // 获取logo图片
    const logoUrl = await getLogoAsBase64();

    // 获取 PowerSchool 配置
    const psConfig = await settingsRepository.getPowerSchoolConfig();

    let grades: StudentGrades = getDefaultGrades(student.id);
    let attendance: AttendanceSummary = getDefaultAttendance();

    // 计算学年
    const schoolYear = calculateSchoolYear(yearId);

    // 如果有 PowerSchool 配置且学生有 psDcid，从 PowerSchool 获取成绩和考勤
    if (psConfig.accessToken && psConfig.endpoint && dbStudent.psDcid) {
      try {
        console.log(`[PDF] Fetching data from PowerSchool for student DCID: ${dbStudent.psDcid}`);
        
        const psClient = getPowerSchoolClient({
          endpoint: psConfig.endpoint,
          clientId: psConfig.clientId || '',
          clientSecret: psConfig.clientSecret || '',
          accessToken: psConfig.accessToken,
          tokenExpiresAt: psConfig.tokenExpiresAt || undefined,
        });

        // 并行获取成绩和考勤数据
        const [fetchedGrades, fetchedAttendance] = await Promise.all([
          fetchStudentStandardsReportDirect(dbStudent.psDcid, yearId, psClient),
          fetchStudentAttendanceStatsDirect(dbStudent.psDcid, yearId, student.id, psClient),
        ]);

        if (fetchedGrades && fetchedGrades.subjects.length > 0) {
          grades = fetchedGrades;
          console.log(`[PDF] Fetched ${grades.subjects.length} subjects for student`);
        } else {
          console.log('[PDF] No grades data returned from PowerSchool');
        }

        if (fetchedAttendance) {
          attendance = fetchedAttendance;
          console.log(`[PDF] Fetched attendance for student:`, attendance.quarters);
        } else {
          console.log('[PDF] No attendance data returned from PowerSchool');
          attendance.studentId = student.id;
          attendance.schoolYear = schoolYear;
        }
      } catch (error) {
        console.error('[PDF] Failed to fetch data from PowerSchool:', error);
        attendance.studentId = student.id;
        attendance.schoolYear = schoolYear;
      }
    } else {
      console.log('[PDF] PowerSchool not configured or student has no psDcid, using default data');
      attendance.studentId = student.id;
      attendance.schoolYear = schoolYear;
    }

    const reportData: ReportData = {
      student,
      schoolYear,
      schoolInfo: mockSchoolInfo,
      attendance,
      grades,
      signature,
      generatedAt: new Date().toISOString(),
    };

    console.log(`[PDF] Generating PDF with ${grades.subjects.length} subjects`);

    // 生成PDF
    const pdfBuffer = await renderToBuffer(
      <ReportPDF data={reportData} logoUrl={logoUrl} />
    );

    // 生成文件名
    const fileName = `Report_${student.firstName}_${student.lastName}_${schoolYear}_${new Date().toISOString().split('T')[0]}.pdf`;

    console.log(`[PDF] Generated PDF: ${fileName}, size: ${pdfBuffer.length} bytes`);

    // 更新学生的 PDF 生成状态
    try {
      await studentRepository.updatePdfStatus(studentId, fileName);
      console.log(`[PDF] Updated PDF status for student ${studentId}`);
    } catch (updateError) {
      console.error('[PDF] Failed to update PDF status:', updateError);
      // 不影响 PDF 返回，继续执行
    }

    // 返回PDF文件
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

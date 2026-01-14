/**
 * 学生报告预览页
 */

import { notFound } from 'next/navigation';
import { ReportPreview } from '@/components/report/ReportPreview';
import { studentRepository, settingsRepository } from '@/lib/database/repositories';
import { fetchStudentStandardsReportDirect, fetchStudentAttendanceStatsDirect } from '@/lib/services/report.service';
import { getPowerSchoolClient } from '@/lib/powerschool/client';
import { mockSchoolInfo } from '@/mocks/school';
import type { ReportData, SignatureSettings, Student } from '@/types';
import type { AttendanceSummary } from '@/types/attendance';
import type { StudentGrades } from '@/types/grade';

interface ReportPageProps {
  params: Promise<{
    studentId: string;
  }>;
  searchParams: Promise<{
    yearid?: string;
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

// 数据库学生类型（包含关联）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbStudentWithRelations = any;

// 获取学生的所有监护人邮箱
function getAllGuardianEmails(dbStudent: DbStudentWithRelations): string[] {
  const emails: Set<string> = new Set();

  // 首先检查学生表中的 guardianEmail 字段
  if (dbStudent.guardianEmail) {
    emails.add(dbStudent.guardianEmail);
  }

  // 然后检查所有联系人关联
  if (dbStudent.contacts && dbStudent.contacts.length > 0) {
    for (const contact of dbStudent.contacts) {
      if (contact.person?.emails && contact.person.emails.length > 0) {
        for (const emailAssoc of contact.person.emails) {
          if (emailAssoc.email?.emailAddress) {
            emails.add(emailAssoc.email.emailAddress);
          }
        }
      }
    }
  }

  return Array.from(emails);
}

// 将数据库学生对象转换为 Student 类型
function transformDbStudentToStudent(dbStudent: DbStudentWithRelations): Student {
  const guardianEmails = getAllGuardianEmails(dbStudent);
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
    guardianEmail: guardianEmails.length > 0 ? guardianEmails.join(', ') : undefined,
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

export async function generateMetadata({ params }: ReportPageProps) {
  const { studentId } = await params;
  const dbStudent = await studentRepository.findById(studentId);
  
  if (!dbStudent) {
    return { title: 'Student Not Found' };
  }

  return {
    title: `Report - ${dbStudent.firstName} ${dbStudent.lastName} - PS Report Card`,
    description: `View report card for ${dbStudent.firstName} ${dbStudent.lastName}`,
  };
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const { studentId } = await params;
  const { yearid } = await searchParams;
  const yearId = parseInt(yearid || '35', 10);

  // 从数据库获取学生信息
  const dbStudent = await studentRepository.findById(studentId);
  if (!dbStudent) {
    notFound();
  }

  const student = transformDbStudentToStudent(dbStudent);

  // 获取 PowerSchool 配置
  const psConfig = await settingsRepository.getPowerSchoolConfig();

  let grades: StudentGrades = getDefaultGrades(student.id);
  let attendance: AttendanceSummary = getDefaultAttendance();

  // 计算学年
  const schoolYear = calculateSchoolYear(yearId);

  // 如果有 PowerSchool 配置且学生有 psDcid，从 PowerSchool 获取成绩和考勤
  if (psConfig.accessToken && psConfig.endpoint && dbStudent.psDcid) {
    try {
      console.log(`[ReportPage] Fetching data from PowerSchool for student DCID: ${dbStudent.psDcid}`);
      
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
        console.log(`[ReportPage] Fetched ${grades.subjects.length} subjects for student`);
      } else {
        console.log('[ReportPage] No grades data returned from PowerSchool');
      }

      if (fetchedAttendance) {
        attendance = fetchedAttendance;
        console.log(`[ReportPage] Fetched attendance for student:`, attendance.quarters);
      } else {
        console.log('[ReportPage] No attendance data returned from PowerSchool');
        attendance.studentId = student.id;
        attendance.schoolYear = schoolYear;
      }
    } catch (error) {
      console.error('[ReportPage] Failed to fetch data from PowerSchool:', error);
      attendance.studentId = student.id;
      attendance.schoolYear = schoolYear;
    }
  } else {
    console.log('[ReportPage] PowerSchool not configured or student has no psDcid, using default data');
    attendance.studentId = student.id;
    attendance.schoolYear = schoolYear;
  }

  // 从数据库获取签名设置
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

  return <ReportPreview reportData={reportData} />;
}

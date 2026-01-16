/**
 * PowerSchool数据转换器
 * 将PowerSchool API返回的数据转换为本地数据格式
 */

import { 
  PSStudent, 
  PSContact, 
  PSTerm, 
  PSStandard, 
  PSStandardGrade,
  PSStandardGradeComment,
  PSCourse,
} from './types';
import type { Student, AttendanceQuarter, Subject, Standard } from '@/types';
import type { AttendanceSummary } from './api/attendance.api';

/**
 * 转换学生数据
 */
export function transformStudent(
  psStudent: PSStudent,
  contacts?: PSContact[]
): Partial<Student> {
  // 找到主要监护人
  const primaryGuardian = contacts?.find(c => c.isprimarycontact && c.isguardian);
  const guardian = primaryGuardian || contacts?.find(c => c.isguardian);

  return {
    id: String(psStudent.id),
    studentNumber: psStudent.student_number,
    firstName: psStudent.first_name,
    lastName: psStudent.last_name,
    gradeLevel: psStudent.grade_level,
    homeRoom: psStudent.home_room || undefined,
    guardianName: guardian ? `${guardian.firstname} ${guardian.lastname}` : undefined,
    guardianEmail: guardian?.email,
  };
}

/**
 * 转换学生数据为Prisma格式
 */
export function transformStudentForPrisma(
  psStudent: PSStudent,
  contacts?: PSContact[]
) {
  const primaryGuardian = contacts?.find(c => c.isprimarycontact && c.isguardian);
  const guardian = primaryGuardian || contacts?.find(c => c.isguardian);

  return {
    psId: psStudent.id,
    psDcid: psStudent.dcid,
    studentNumber: psStudent.student_number,
    firstName: psStudent.first_name,
    lastName: psStudent.last_name,
    gradeLevel: psStudent.grade_level,
    homeroom: psStudent.home_room || null,
    guardianName: guardian ? `${guardian.firstname} ${guardian.lastname}` : null,
    guardianEmail: guardian?.email || null,
    guardianPhone: guardian?.phonedaytime || null,
    status: 'active',
  };
}

/**
 * 转换学年数据
 */
export function transformSchoolYear(psTerm: PSTerm) {
  return {
    psId: psTerm.id,
    psDcid: psTerm.dcid,
    name: psTerm.name,
    abbreviation: psTerm.abbreviation || null,
    firstDay: new Date(psTerm.firstday),
    lastDay: new Date(psTerm.lastday),
    yearId: psTerm.yearid,
  };
}

/**
 * 转换考勤摘要数据
 */
export function transformAttendance(summary: AttendanceSummary): AttendanceQuarter {
  return {
    quarter: summary.quarter as AttendanceQuarter['quarter'],
    absent: summary.absentDays,
    tardy: summary.tardyCount,
  };
}

/**
 * 转换考勤数据为Prisma格式
 */
export function transformAttendanceForPrisma(
  summary: AttendanceSummary,
  studentId: string
) {
  return {
    studentId,
    quarter: summary.quarter,
    absent: summary.absentDays,
    tardy: summary.tardyCount,
  };
}

/**
 * 转换课程为科目
 */
export function transformCourseToSubject(psCourse: PSCourse) {
  return {
    psId: psCourse.dcid,
    name: psCourse.course_name,
    courseNumber: psCourse.course_number,
  };
}

/**
 * 转换学习标准
 */
export function transformStandard(
  psStandard: PSStandard,
  subjectId: string
) {
  return {
    psId: psStandard.id,
    identifier: psStandard.identifier,
    name: psStandard.name,
    description: psStandard.description || null,
    subjectId,
    parentId: psStandard.parentstandardid ? String(psStandard.parentstandardid) : null,
    displayOrder: psStandard.displayposition || 0,
    isActive: psStandard.isactive === 1,
  };
}

/**
 * 转换成绩数据
 */
export function transformGrade(
  psGrade: PSStandardGrade,
  studentId: string,
  subjectId: string,
  standardId: string | null,
  comment?: PSStandardGradeComment
) {
  return {
    studentId,
    subjectId,
    standardId,
    quarter: psGrade.storecode,
    score: psGrade.grade || null,
    comment: comment?.commentvalue || null,
  };
}

/**
 * 将Prisma学生模型转换为前端格式
 * 支持多种 Prisma 查询返回的数据结构
 */
export function transformPrismaStudentToFrontend(student: {
  id: string;
  psId: number;
  studentNumber: string;
  firstName: string;
  lastName: string;
  chineseName?: string | null;
  gradeLevel: number;
  homeRoom?: string | null;
  guardianEmail?: string | null;
  homePhone?: string | null;
  entryDate?: Date | null;
  enrollStatus?: number | null;
  pdfGenerated: boolean;
  pdfGeneratedAt?: Date | null;
  pdfUrl?: string | null;
  emailSent?: boolean;
  emailSentAt?: Date | null;
  schoolId?: number;  // 改为 number 类型，存储 PowerSchool school ID
  contacts?: Array<{
    person: {
      firstName?: string | null;
      lastName?: string | null;
      emails?: Array<{
        isPrimary: boolean;
        email: {
          emailAddress: string;
        };
      }>;
    };
  }>;
}): Student {
  // 从 contacts 关联中提取家长信息（显示所有联系人）
  let guardianName = '';
  let guardianEmail = student.guardianEmail || '';
  const guardianPhone = student.homePhone || undefined;

  // 如果有 contacts 关联，显示所有联系人的信息
  if (student.contacts && student.contacts.length > 0) {
    const names: string[] = [];
    const emails: string[] = [];
    
    for (const contact of student.contacts) {
      const person = contact.person;
      if (!person) continue;
      
      // 获取联系人姓名
      const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
      if (name && !names.includes(name)) {
        names.push(name);
      }
      
      // 获取所有邮箱（不重复）
      if (person.emails && person.emails.length > 0) {
        for (const emailAssoc of person.emails) {
          const email = emailAssoc.email.emailAddress;
          if (email && !emails.includes(email)) {
            emails.push(email);
          }
        }
      }
    }
    
    // 合并所有联系人信息
    guardianName = names.join(', ');
    guardianEmail = emails.join(', ') || guardianEmail;
  }

  return {
    id: student.id,
    psId: student.psId,
    studentNumber: student.studentNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    chineseName: student.chineseName || undefined,
    gradeLevel: student.gradeLevel,
    homeRoom: student.homeRoom || undefined,
    enrollStatus: student.enrollStatus ?? undefined,
    guardianName: guardianName || undefined,
    guardianEmail: guardianEmail || undefined,
    guardianPhone: guardianPhone,
    entryDate: student.entryDate?.toISOString().split('T')[0] || undefined,
    schoolId: student.schoolId,  // 现在是 PowerSchool school ID (number)
    schoolName: undefined,  // 学校名称需要单独查询
    pdfGenerated: student.pdfGenerated,
    pdfGeneratedAt: student.pdfGeneratedAt?.toISOString(),
    pdfUrl: student.pdfUrl || undefined,
    emailSent: student.emailSent ?? false,
    emailSentAt: student.emailSentAt?.toISOString(),
  };
}

/**
 * 将Prisma成绩模型转换为前端格式
 */
export function transformPrismaGradesToFrontend(grades: Array<{
  id: string;
  quarter: string;
  score: string | null;
  comment: string | null;
  subject: {
    id: string;
    name: string;
  };
  standard: {
    id: string;
    identifier: string;
    name: string;
    description: string | null;
  } | null;
}>): Subject[] {
  // 按科目分组
  const subjectMap = new Map<string, Subject>();
  
  for (const grade of grades) {
    let subject = subjectMap.get(grade.subject.id);
    
    if (!subject) {
      subject = {
        id: grade.subject.id,
        name: grade.subject.name,
        standards: [],
      };
      subjectMap.set(grade.subject.id, subject);
    }
    
    // 找到或创建标准
    if (grade.standard) {
      let standard = subject.standards.find(s => s.id === grade.standard!.id);
      
      if (!standard) {
        standard = {
          id: grade.standard.id,
          name: grade.standard.name,
          quarterScores: [],
        };
        subject.standards.push(standard);
      }
      
      // 添加成绩
      const quarter = grade.quarter as 'Q1' | 'Q2' | 'Q3' | 'Q4';
      if (['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
        // 检查是否已存在该季度的成绩
        const existingScore = standard.quarterScores.find(qs => qs.quarter === quarter);
        if (!existingScore) {
          standard.quarterScores.push({
            quarter,
            score: (grade.score as 'E' | 'P' | 'A' | 'N' | '-') || '-',
          });
        }
      }
    }
  }
  
  return Array.from(subjectMap.values());
}

/**
 * 将Prisma考勤模型转换为前端格式
 */
export function transformPrismaAttendanceToFrontend(records: Array<{
  quarter: string;
  absent: number;
  tardy: number;
}>): AttendanceQuarter[] {
  return records.map(r => ({
    quarter: r.quarter as AttendanceQuarter['quarter'],
    absent: r.absent,
    tardy: r.tardy,
  }));
}

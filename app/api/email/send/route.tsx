/**
 * 邮件发送API
 * 发送带有PDF报告附件的邮件给家长
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { readFile } from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { ReportPDF } from '@/lib/pdf';
import { studentRepository, settingsRepository } from '@/lib/database/repositories';
import { fetchStudentStandardsReportDirect, fetchStudentAttendanceStatsDirect } from '@/lib/services/report.service';
import { getPowerSchoolClient } from '@/lib/powerschool/client';
import { mockSchoolInfo } from '@/mocks/school';
import type { ReportData, SignatureSettings, Student } from '@/types';
import type { AttendanceSummary } from '@/types/attendance';
import type { StudentGrades } from '@/types/grade';

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
  const startYear = 1990 + yearId;
  return `${startYear}-${startYear + 1}`;
}

// 获取学生的所有监护人邮箱
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAllGuardianEmails(dbStudent: any): string[] {
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

// 为单个学生生成PDF
async function generatePDFForStudent(
  dbStudent: NonNullable<Awaited<ReturnType<typeof studentRepository.findById>>>,
  yearId: number,
  logoUrl: string | undefined,
  signature: SignatureSettings,
  psClient: ReturnType<typeof getPowerSchoolClient> | null
): Promise<Buffer> {
  const student = transformDbStudentToStudent(dbStudent);
  if (!student) {
    throw new Error('Failed to transform student data');
  }

  let grades: StudentGrades = getDefaultGrades(student.id);
  let attendance: AttendanceSummary = getDefaultAttendance();
  const schoolYear = calculateSchoolYear(yearId);

  // 如果有 PowerSchool 客户端且学生有 psDcid，获取成绩和考勤
  if (psClient && dbStudent.psDcid) {
    try {
      // 并行获取成绩和考勤数据
      const [fetchedGrades, fetchedAttendance] = await Promise.all([
        fetchStudentStandardsReportDirect(dbStudent.psDcid, yearId, psClient),
        fetchStudentAttendanceStatsDirect(dbStudent.psDcid, yearId, student.id, psClient),
      ]);

      if (fetchedGrades && fetchedGrades.subjects.length > 0) {
        grades = fetchedGrades;
      }

      if (fetchedAttendance) {
        attendance = fetchedAttendance;
      } else {
        attendance.studentId = student.id;
        attendance.schoolYear = schoolYear;
      }
    } catch (error) {
      console.error(`[Email] Failed to fetch data for student ${student.id}:`, error);
      attendance.studentId = student.id;
      attendance.schoolYear = schoolYear;
    }
  } else {
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

  // 生成PDF
  const pdfBuffer = await renderToBuffer(
    <ReportPDF data={reportData} logoUrl={logoUrl} />
  );

  return Buffer.from(pdfBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      studentIds, 
      subject: customSubject, 
      body: customBody,
      yearId: requestYearId,
    } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      );
    }

    const yearId = requestYearId || 35;

    // 获取SMTP配置
    const smtpConfig = await settingsRepository.getSMTPConfig();
    console.log('[Email API] SMTP Config:', {
      host: smtpConfig.host ? '***' : undefined,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      username: smtpConfig.username ? '***' : undefined,
      password: smtpConfig.password ? '***' : undefined,
      fromEmail: smtpConfig.fromEmail,
      fromName: smtpConfig.fromName,
      enabled: smtpConfig.enabled,
    });

    if (!smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      console.log('[Email API] SMTP validation failed:', {
        hasHost: !!smtpConfig.host,
        hasUsername: !!smtpConfig.username,
        hasPassword: !!smtpConfig.password,
      });
      return NextResponse.json(
        { error: 'SMTP settings are incomplete. Please configure host, username and password in Settings.' },
        { status: 400 }
      );
    }

    if (!smtpConfig.enabled) {
      console.log('[Email API] SMTP is not enabled');
      return NextResponse.json(
        { error: 'SMTP is not enabled. Please enable it in Settings.' },
        { status: 400 }
      );
    }

    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    // 获取 PowerSchool 配置
    const psConfig = await settingsRepository.getPowerSchoolConfig();
    let psClient: ReturnType<typeof getPowerSchoolClient> | null = null;
    
    if (psConfig.accessToken && psConfig.endpoint) {
      psClient = getPowerSchoolClient({
        endpoint: psConfig.endpoint,
        clientId: psConfig.clientId || '',
        clientSecret: psConfig.clientSecret || '',
        accessToken: psConfig.accessToken,
        tokenExpiresAt: psConfig.tokenExpiresAt || undefined,
      });
    }

    // 预加载共享资源
    const [logoUrl, signature] = await Promise.all([
      getLogoAsBase64(),
      getSignatureFromDatabase(),
    ]);

    const schoolYear = calculateSchoolYear(yearId);
    const fromEmail = smtpConfig.fromEmail || smtpConfig.username;
    const fromName = smtpConfig.fromName || 'GTAIS Report Card System';

    const results = {
      success: true,
      sent: 0,
      failed: [] as Array<{ studentId: string; studentName: string; error: string }>,
    };

    // 处理每个学生的邮件发送
    for (const studentId of studentIds) {
      const dbStudent = await studentRepository.findById(studentId);

      if (!dbStudent) {
        results.failed.push({
          studentId,
          studentName: 'Unknown',
          error: 'Student not found',
        });
        continue;
      }

      const studentName = `${dbStudent.firstName} ${dbStudent.lastName}`;
      const guardianEmails = getAllGuardianEmails(dbStudent);

      if (guardianEmails.length === 0) {
        results.failed.push({
          studentId,
          studentName,
          error: 'No guardian email available',
        });
        continue;
      }

      try {
        console.log(`[Email] Generating PDF for student: ${studentName}`);

        // 生成PDF
        const pdfBuffer = await generatePDFForStudent(
          dbStudent,
          yearId,
          logoUrl,
          signature,
          psClient
        );

        const fileName = `Report_${dbStudent.firstName}_${dbStudent.lastName}_${schoolYear}.pdf`;

        // 构建邮件内容
        const emailSubject = customSubject || 
          `Student Progress Report - ${dbStudent.firstName} ${dbStudent.lastName} (${schoolYear})`;

        const emailHtml = customBody || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #6b2d5b; margin: 0;">GTIIT Affiliated International School</h2>
              <p style="color: #8b3d75; margin: 5px 0;">汕头市广东以色列理工学院附属外籍人员子女学校</p>
            </div>
            
            <p>Dear Parent/Guardian,</p>
            
            <p>Please find attached the Progress Report for <strong>${dbStudent.firstName} ${dbStudent.lastName}</strong>${dbStudent.chineseName ? ` (${dbStudent.chineseName})` : ''} for the ${schoolYear} school year.</p>
            
            <div style="background-color: #f5eaf3; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Student:</strong> ${dbStudent.firstName} ${dbStudent.lastName}</p>
              <p style="margin: 5px 0 0;"><strong>Grade:</strong> ${dbStudent.gradeLevel}</p>
              <p style="margin: 5px 0 0;"><strong>School Year:</strong> ${schoolYear}</p>
            </div>
            
            <p>If you have any questions about this report, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            <strong>GTAIS Administration</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <p style="color: #666; font-size: 12px;">
              This is an automated email from the GTAIS Report Card System.<br>
              Please do not reply directly to this email.
            </p>
          </div>
        `;

        // 发送邮件给所有家长/联系人
        const allRecipients = guardianEmails.join(', ');
        console.log(`[Email] Sending email to ${guardianEmails.length} recipient(s): ${allRecipients}`);

        // 发送邮件（所有收件人在同一封邮件中）
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: allRecipients,
          subject: emailSubject,
          html: emailHtml,
          attachments: [
            {
              filename: fileName,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ],
        });

        // 更新学生的 PDF 状态
        await studentRepository.updatePdfStatus(studentId, fileName);

        results.sent++;
        console.log(`[Email] Successfully sent email to ${guardianEmails.length} recipient(s) [${allRecipients}] for student ${studentName}`);

      } catch (error) {
        console.error(`[Email] Failed to send email for student ${studentId}:`, error);
        results.failed.push({
          studentId,
          studentName,
          error: error instanceof Error ? error.message : 'Failed to send email',
        });
      }
    }

    if (results.failed.length > 0) {
      results.success = results.failed.length < studentIds.length;
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send emails' },
      { status: 500 }
    );
  }
}

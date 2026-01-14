/**
 * 报告卡类型定义
 */

import type { Student } from './student';
import type { AttendanceSummary } from './attendance';
import type { StudentGrades } from './grade';
import type { SignatureSettings } from './settings';

export interface SchoolInfo {
  name: string;
  nameChinese?: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  principalName?: string;
  principalTitle?: string;
}

export interface ReportData {
  student: Student;
  schoolYear: string;         // 学年，如 "2025-2026"
  schoolInfo: SchoolInfo;
  attendance: AttendanceSummary;
  grades: StudentGrades;
  signature?: SignatureSettings;  // 校长签名设置
  generatedAt?: string;
  generatedDate?: string;     // 格式化的日期时间
}

export interface ReportGenerationRequest {
  studentId: string;
  schoolYear?: string;
}

export interface ReportGenerationResponse {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

export interface EmailSendRequest {
  studentIds: string[];
  subject?: string;
  body?: string;
}

export interface EmailSendResponse {
  success: boolean;
  sent: number;
  failed: Array<{
    studentId: string;
    error: string;
  }>;
}

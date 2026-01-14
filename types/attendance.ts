/**
 * 考勤信息类型定义
 * 基于真实Report Card样本调整 - 简化为Absent和Tardy
 */

export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface AttendanceQuarter {
  quarter: Quarter;
  absent: number;             // 缺勤天数
  tardy: number;              // 迟到次数
}

export interface AttendanceSummary {
  studentId: string;
  schoolYear: string;
  quarters: AttendanceQuarter[];
}

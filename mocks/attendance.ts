/**
 * 考勤Mock数据 - 基于真实Report Card样本
 */

import type { AttendanceSummary, AttendanceQuarter } from '@/types';

// 预生成的考勤数据
export const mockAttendanceData: Record<string, AttendanceSummary> = {
  'stu-001': {
    studentId: 'stu-001',
    schoolYear: '2025-2026',
    quarters: [
      { quarter: 'Q1', absent: 2, tardy: 1 },
      { quarter: 'Q2', absent: 1, tardy: 0 },
      { quarter: 'Q3', absent: 0, tardy: 2 },
      { quarter: 'Q4', absent: 1, tardy: 1 },
    ],
  },
  'stu-002': {
    studentId: 'stu-002',
    schoolYear: '2025-2026',
    quarters: [
      { quarter: 'Q1', absent: 3, tardy: 2 },
      { quarter: 'Q2', absent: 2, tardy: 1 },
      { quarter: 'Q3', absent: 1, tardy: 0 },
      { quarter: 'Q4', absent: 2, tardy: 1 },
    ],
  },
};

export function generateAttendanceForStudent(studentId: string): AttendanceSummary {
  return {
    studentId,
    schoolYear: '2025-2026',
    quarters: [
      { quarter: 'Q1', absent: Math.floor(Math.random() * 5), tardy: Math.floor(Math.random() * 3) },
      { quarter: 'Q2', absent: Math.floor(Math.random() * 5), tardy: Math.floor(Math.random() * 3) },
      { quarter: 'Q3', absent: Math.floor(Math.random() * 5), tardy: Math.floor(Math.random() * 3) },
      { quarter: 'Q4', absent: Math.floor(Math.random() * 5), tardy: Math.floor(Math.random() * 3) },
    ],
  };
}

export function getAttendanceByStudentId(studentId: string): AttendanceSummary {
  return mockAttendanceData[studentId] || generateAttendanceForStudent(studentId);
}

/**
 * 报表服务
 * 处理报表数据获取和转换
 */

import type { StudentGrades, Subject, Standard, QuarterScore, ScoreLevel } from '@/types/grade';
import type { AttendanceSummary, AttendanceQuarter } from '@/types/attendance';

// API 返回的原始数据类型
interface ApiStandardGrade {
  code: string;
  name: string;
  grades: {
    Q1: string | null;
    Q2: string | null;
    Q3: string | null;
    Q4: string | null;
  };
  sortOrder: number;
}

interface ApiCourse {
  courseName: string;
  sectionNumber: string;
  standards: ApiStandardGrade[];
}

interface ApiStudentStandardsResponse {
  success: boolean;
  data: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    yearId: number;
    totalRecords: number;
    courses: ApiCourse[];
    rawRecords: unknown[];
  };
  duration: string;
}

/**
 * 将成绩字符串转换为 ScoreLevel 类型
 */
function toScoreLevel(grade: string | null): ScoreLevel {
  if (!grade) return '-';
  const upperGrade = grade.toUpperCase();
  if (['E', 'P', 'A', 'N'].includes(upperGrade)) {
    return upperGrade as ScoreLevel;
  }
  return '-';
}

/**
 * 从 PowerSchool API 获取学生标准成绩
 * @param studentDcid 学生 DCID
 * @param yearId 学年 ID
 * @param baseUrl 基础 URL（服务端调用时需要）
 */
export async function fetchStudentStandardsReport(
  studentDcid: number,
  yearId: number,
  baseUrl?: string
): Promise<StudentGrades | null> {
  try {
    const url = baseUrl 
      ? `${baseUrl}/api/sync/student-standards-report`
      : '/api/sync/student-standards-report';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sdcid: studentDcid,
        yearid: yearId,
      }),
    });

    if (!response.ok) {
      console.error('Failed to fetch student standards report:', response.status);
      return null;
    }

    const result: ApiStudentStandardsResponse = await response.json();

    if (!result.success || !result.data) {
      console.error('API returned error:', result);
      return null;
    }

    // 转换为 StudentGrades 格式
    return transformToStudentGrades(result.data, yearId);
  } catch (error) {
    console.error('Error fetching student standards report:', error);
    return null;
  }
}

/**
 * 将 API 响应转换为 StudentGrades 格式
 */
function transformToStudentGrades(
  data: ApiStudentStandardsResponse['data'],
  yearId: number
): StudentGrades {
  const subjects: Subject[] = data.courses.map((course, courseIndex) => {
    // 去重标准（因为同一个标准可能有多个季度的成绩记录）
    const uniqueStandards = new Map<string, ApiStandardGrade>();
    
    course.standards.forEach((std) => {
      if (!uniqueStandards.has(std.code)) {
        uniqueStandards.set(std.code, std);
      } else {
        // 合并成绩
        const existing = uniqueStandards.get(std.code)!;
        existing.grades.Q1 = existing.grades.Q1 || std.grades.Q1;
        existing.grades.Q2 = existing.grades.Q2 || std.grades.Q2;
        existing.grades.Q3 = existing.grades.Q3 || std.grades.Q3;
        existing.grades.Q4 = existing.grades.Q4 || std.grades.Q4;
      }
    });

    const standards: Standard[] = Array.from(uniqueStandards.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((std, stdIndex) => {
        const quarterScores: QuarterScore[] = [
          { quarter: 'Q1', score: toScoreLevel(std.grades.Q1) },
          { quarter: 'Q2', score: toScoreLevel(std.grades.Q2) },
          { quarter: 'Q3', score: toScoreLevel(std.grades.Q3) },
          { quarter: 'Q4', score: toScoreLevel(std.grades.Q4) },
        ];

        return {
          id: `std-${courseIndex}-${stdIndex}-${std.code}`,
          name: std.name,
          quarterScores,
        };
      });

    return {
      id: `course-${courseIndex}-${course.courseName}`,
      name: course.courseName,
      standards,
    };
  });

  return {
    studentId: data.studentNumber,
    schoolYear: `${2000 + Math.floor(yearId / 100)}-${2001 + Math.floor(yearId / 100)}`, // 根据 yearId 计算学年
    subjects,
  };
}

/**
 * 直接从 PowerSchool 客户端获取学生标准成绩（服务端使用）
 * 不经过 API 路由
 */
export async function fetchStudentStandardsReportDirect(
  studentDcid: number,
  yearId: number,
  psClient: {
    executeNamedQuery: <T>(queryName: string, params?: Record<string, string | number>) => Promise<T[]>;
  }
): Promise<StudentGrades | null> {
  try {
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

    const psRecords = await psClient.executeNamedQuery<PSStudentStandardRecord>(
      'org.infocare.sync.student_standards_report',
      { sdcid: String(studentDcid), yearid: String(yearId) }
    );

    if (!psRecords || psRecords.length === 0) {
      console.log('No standards report data found for student:', studentDcid);
      return null;
    }

    // 按课程分组
    const courseMap = new Map<string, {
      courseName: string;
      sectionNumber: string;
      standards: Map<string, {
        code: string;
        name: string;
        sortOrder: number;
        grades: { Q1: string | null; Q2: string | null; Q3: string | null; Q4: string | null };
      }>;
    }>();

    for (const record of psRecords) {
      const s = record.tables.students;
      const courseName = s.coursename;

      if (!courseMap.has(courseName)) {
        courseMap.set(courseName, {
          courseName,
          sectionNumber: s.sectionnumber,
          standards: new Map(),
        });
      }

      const course = courseMap.get(courseName)!;
      const standardKey = s.standardcode;

      if (!course.standards.has(standardKey)) {
        course.standards.set(standardKey, {
          code: s.standardcode,
          name: s.standardname,
          sortOrder: parseInt(s.sortorder, 10) || 0,
          grades: { Q1: null, Q2: null, Q3: null, Q4: null },
        });
      }

      const standard = course.standards.get(standardKey)!;
      const storeCode = s.storecode as 'Q1' | 'Q2' | 'Q3' | 'Q4';
      if (['Q1', 'Q2', 'Q3', 'Q4'].includes(storeCode)) {
        standard.grades[storeCode] = s.grade;
      }
    }

    // 转换为 Subject[] 格式
    const subjects: Subject[] = Array.from(courseMap.values()).map((course, courseIndex) => {
      const standards: Standard[] = Array.from(course.standards.values())
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((std, stdIndex) => ({
          id: `std-${courseIndex}-${stdIndex}-${std.code}`,
          name: std.name,
          quarterScores: [
            { quarter: 'Q1' as const, score: toScoreLevel(std.grades.Q1) },
            { quarter: 'Q2' as const, score: toScoreLevel(std.grades.Q2) },
            { quarter: 'Q3' as const, score: toScoreLevel(std.grades.Q3) },
            { quarter: 'Q4' as const, score: toScoreLevel(std.grades.Q4) },
          ],
        }));

      return {
        id: `course-${courseIndex}-${course.courseName}`,
        name: course.courseName,
        standards,
      };
    });

    const firstRecord = psRecords[0].tables.students;

    return {
      studentId: firstRecord.studentnumber,
      schoolYear: `${2000 + Math.floor(yearId / 100)}-${2001 + Math.floor(yearId / 100)}`,
      subjects,
    };
  } catch (error) {
    console.error('Error fetching student standards report directly:', error);
    return null;
  }
}

/**
 * 直接从 PowerSchool 客户端获取学生考勤统计（服务端使用）
 * 不经过 API 路由
 */
export async function fetchStudentAttendanceStatsDirect(
  studentDcid: number,
  yearId: number,
  studentId: string,
  psClient: {
    executeNamedQuery: <T>(queryName: string, params?: Record<string, string | number>) => Promise<T[]>;
  }
): Promise<AttendanceSummary | null> {
  try {
    interface PSAttendanceStatsRecord {
      name: string;
      tables: {
        students: {
          tardyq4: string;
          tardyq3: string;
          firstname: string;
          tardyq2: string;
          tardyq1: string;
          studentnumber: string;
          absentq3: string;
          absentq2: string;
          absentq1: string;
          lastname: string;
          absentq4: string;
        };
      };
    }

    const psRecords = await psClient.executeNamedQuery<PSAttendanceStatsRecord>(
      'org.infocare.sync.student_attendance_stats',
      { sdcid: String(studentDcid), yearid: String(yearId) }
    );

    if (!psRecords || psRecords.length === 0) {
      console.log('[AttendanceStats] No attendance data found for student:', studentDcid);
      return null;
    }

    const record = psRecords[0];
    const stats = record.tables.students;

    const schoolYear = calculateSchoolYearFromYearId(yearId);

    const quarters: AttendanceQuarter[] = [
      {
        quarter: 'Q1',
        absent: parseInt(stats.absentq1, 10) || 0,
        tardy: parseInt(stats.tardyq1, 10) || 0,
      },
      {
        quarter: 'Q2',
        absent: parseInt(stats.absentq2, 10) || 0,
        tardy: parseInt(stats.tardyq2, 10) || 0,
      },
      {
        quarter: 'Q3',
        absent: parseInt(stats.absentq3, 10) || 0,
        tardy: parseInt(stats.tardyq3, 10) || 0,
      },
      {
        quarter: 'Q4',
        absent: parseInt(stats.absentq4, 10) || 0,
        tardy: parseInt(stats.tardyq4, 10) || 0,
      },
    ];

    console.log(`[AttendanceStats] Successfully fetched attendance for ${stats.firstname} ${stats.lastname}`);

    return {
      studentId,
      schoolYear,
      quarters,
    };
  } catch (error) {
    console.error('Error fetching student attendance stats directly:', error);
    return null;
  }
}

/**
 * 根据 yearId 计算学年字符串
 * PowerSchool 的 yearId 通常是从某个基准年开始的数字
 * 例如：yearId 35 对应 2025-2026 学年
 */
function calculateSchoolYearFromYearId(yearId: number): string {
  // PowerSchool 的 yearId 计算方式：yearId = year - 1990
  // 例如：2025 年对应 yearId = 35
  const startYear = 1990 + yearId;
  return `${startYear}-${startYear + 1}`;
}

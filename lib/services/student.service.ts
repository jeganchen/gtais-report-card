/**
 * 学生服务
 * 提供学生相关的业务逻辑
 */

import { 
  studentRepository, 
  storedGradeRepository, 
  attendanceRepository,
  settingsRepository,
  schoolRepository,
  type StudentFilter, 
  type PaginationOptions 
} from '../database/repositories';
import { 
  transformPrismaStudentToFrontend, 
} from '../powerschool/transformer';
import type { Student, ReportData, AttendanceQuarter, Subject } from '@/types';
import { mockSchoolInfo } from '@/mocks/school';

export interface StudentListResult {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class StudentService {
  /**
   * 获取学生列表
   */
  async getStudents(
    filter?: StudentFilter,
    pagination?: PaginationOptions
  ): Promise<StudentListResult> {
    // 并行获取学生列表和学校列表
    const [result, schools] = await Promise.all([
      studentRepository.findMany(filter, pagination),
      schoolRepository.findAll(),
    ]);
    
    // 创建 psId -> school 的映射
    const schoolMap = new Map<number, { name: string; abbreviation: string | null }>();
    for (const school of schools) {
      schoolMap.set(school.psId, { name: school.name, abbreviation: school.abbreviation });
    }
    
    // 转换学生数据并填充学校名称
    const students = result.students.map(student => {
      const transformed = transformPrismaStudentToFrontend(student);
      // 根据 schoolId (psId) 获取学校信息
      if (student.schoolId) {
        const school = schoolMap.get(student.schoolId);
        if (school) {
          transformed.schoolName = school.abbreviation || school.name;
        }
      }
      return transformed;
    });
    
    return {
      students,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  /**
   * 获取单个学生详情
   */
  async getStudent(id: string): Promise<Student | null> {
    const student = await studentRepository.findById(id);
    if (!student) return null;
    
    return transformPrismaStudentToFrontend(student);
  }

  /**
   * 获取学生详情并触发实时同步
   */
  async getStudentWithSync(id: string): Promise<Student | null> {
    // TODO: 实现单个学生数据同步
    // 目前直接返回学生信息，不触发同步
    return this.getStudent(id);
  }

  /**
   * 获取学生成绩
   */
  async getStudentGrades(studentId: string): Promise<Subject[]> {
    // TODO: 实现成绩数据转换
    // 目前返回空数组，等成绩数据同步后再实现
    const grades = await storedGradeRepository.findByStudent(studentId);
    
    // 暂时返回空数组，因为数据结构需要转换
    if (grades.length === 0) {
      return [];
    }
    
    // 按课程分组
    const subjectMap = new Map<string, Subject>();
    
    for (const grade of grades) {
      const course = grade.section?.course;
      if (!course) continue;
      
      let subject = subjectMap.get(course.id);
      if (!subject) {
        subject = {
          id: course.id,
          name: course.courseName,
          standards: [],
        };
        subjectMap.set(course.id, subject);
      }
      
      // 暂时不处理 standards，因为数据结构不同
    }
    
    return Array.from(subjectMap.values());
  }

  /**
   * 获取学生考勤
   */
  async getStudentAttendance(studentId: string): Promise<AttendanceQuarter[]> {
    // TODO: 实现按季度汇总考勤数据
    // 目前返回空数组，等考勤数据同步后再实现
    const summary = await attendanceRepository.getStudentAttendanceSummary(studentId);
    
    // 暂时返回一个汇总记录（作为年度汇总）
    if (summary.total > 0) {
      return [{
        quarter: 'Q1' as const,
        absent: summary.absent,
        tardy: summary.tardy,
      }];
    }
    
    return [];
  }

  /**
   * 获取学生完整报告数据
   */
  async getStudentReportData(studentId: string): Promise<ReportData | null> {
    const student = await this.getStudent(studentId);
    if (!student) return null;
    
    const schoolYear = '2025-2026'; // TODO: 从当前学年获取
    
    const [subjects, quarters, signatureConfig] = await Promise.all([
      this.getStudentGrades(studentId),
      this.getStudentAttendance(studentId),
      settingsRepository.getSignatureConfig(),
    ]);
    
    return {
      student,
      schoolYear,
      schoolInfo: mockSchoolInfo, // TODO: 从数据库获取学校信息
      attendance: {
        studentId,
        schoolYear,
        quarters,
      },
      grades: {
        studentId,
        schoolYear,
        subjects,
      },
      signature: signatureConfig.principalName ? {
        principalName: signatureConfig.principalName,
        principalTitle: signatureConfig.principalTitle || 'Principal',
        signatureImageUrl: signatureConfig.signatureImage || undefined,
      } : undefined,
    };
  }

  /**
   * 获取年级列表
   */
  async getGradeLevels(): Promise<number[]> {
    return studentRepository.getGradeLevels();
  }

  /**
   * 获取班级列表
   */
  async getHomerooms(schoolId?: number, gradeLevel?: number): Promise<string[]> {
    return studentRepository.getHomerooms(schoolId, gradeLevel);
  }

  /**
   * 更新PDF生成状态
   */
  async updatePdfStatus(studentId: string, pdfUrl: string): Promise<Student> {
    const updated = await studentRepository.updatePdfStatus(studentId, pdfUrl);
    return transformPrismaStudentToFrontend(updated);
  }

  /**
   * 批量获取学生报告数据
   */
  async getBatchReportData(studentIds: string[]): Promise<ReportData[]> {
    const results: ReportData[] = [];
    
    for (const id of studentIds) {
      const data = await this.getStudentReportData(id);
      if (data) {
        results.push(data);
      }
    }
    
    return results;
  }

  /**
   * 获取学生统计
   */
  async getStats() {
    const [total, byGrade] = await Promise.all([
      studentRepository.count({ enrollStatus: 0 }), // enrollStatus: 0 表示在校
      this.getStudentCountByGrade(),
    ]);
    
    return { total, byGrade };
  }

  /**
   * 按年级统计学生数量
   */
  private async getStudentCountByGrade(): Promise<Map<number, number>> {
    const gradeLevels = await studentRepository.getGradeLevels();
    const counts = new Map<number, number>();
    
    for (const grade of gradeLevels) {
      const count = await studentRepository.count({ gradeLevel: grade, enrollStatus: 0 });
      counts.set(grade, count);
    }
    
    return counts;
  }
}

// 导出单例
export const studentService = new StudentService();


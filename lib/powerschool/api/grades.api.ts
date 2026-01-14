/**
 * PowerSchool 成绩API
 */

import { PowerSchoolClient } from '../client';
import { 
  PSStandard, 
  PSStandardGrade, 
  PSStandardGradeComment,
  PSCourse,
  PSSection,
  PSCC 
} from '../types';

export class GradesAPI {
  constructor(private client: PowerSchoolClient) {}

  /**
   * 获取学习标准列表
   */
  async getStandards(yearId?: number): Promise<PSStandard[]> {
    try {
      const params: Record<string, number> = {};
      if (yearId) params.yearid = yearId;
      
      const records = await this.client.executeNamedQuery<PSStandard>(
        'org.infocare.standards.list',
        params
      );
      return records;
    } catch (error) {
      console.error('Failed to fetch standards:', error);
      return [];
    }
  }

  /**
   * 获取学生的标准成绩
   */
  async getStudentStandardGrades(studentDcid: number): Promise<PSStandardGrade[]> {
    try {
      const records = await this.client.executeNamedQuery<PSStandardGrade>(
        'org.infocare.student.standardgrades',
        { studentsdcid: studentDcid }
      );
      return records;
    } catch (error) {
      console.error(`Failed to fetch standard grades for student ${studentDcid}:`, error);
      return [];
    }
  }

  /**
   * 获取标准成绩评语
   */
  async getStandardGradeComments(standardGradeSectionIds: number[]): Promise<PSStandardGradeComment[]> {
    try {
      const allComments: PSStandardGradeComment[] = [];
      
      // 批量获取评语
      for (const id of standardGradeSectionIds) {
        const records = await this.client.executeNamedQuery<PSStandardGradeComment>(
          'org.infocare.standardgrade.comments',
          { standardgradesectionid: id }
        );
        allComments.push(...records);
      }
      
      return allComments;
    } catch (error) {
      console.error('Failed to fetch standard grade comments:', error);
      return [];
    }
  }

  /**
   * 获取课程列表
   */
  async getCourses(schoolId: number): Promise<PSCourse[]> {
    try {
      const response = await this.client.get<{ course: PSCourse[] }>(
        `/ws/v1/school/${schoolId}/course`
      );
      return response.data.course || [];
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      return [];
    }
  }

  /**
   * 获取学生选课记录
   */
  async getStudentEnrollments(studentId: number): Promise<PSCC[]> {
    try {
      const records = await this.client.executeNamedQuery<PSCC>(
        'org.infocare.student.enrollments',
        { studentid: studentId }
      );
      return records;
    } catch (error) {
      console.error(`Failed to fetch enrollments for student ${studentId}:`, error);
      return [];
    }
  }

  /**
   * 获取Section信息
   */
  async getSections(schoolId: number, termId?: number): Promise<PSSection[]> {
    try {
      const params: Record<string, number> = { schoolid: schoolId };
      if (termId) params.termid = termId;
      
      const records = await this.client.executeNamedQuery<PSSection>(
        'org.infocare.sections.list',
        params
      );
      return records;
    } catch (error) {
      console.error('Failed to fetch sections:', error);
      return [];
    }
  }

  /**
   * 获取学生完整成绩报告
   */
  async getStudentGradeReport(studentDcid: number): Promise<{
    grades: PSStandardGrade[];
    comments: PSStandardGradeComment[];
  }> {
    const grades = await this.getStudentStandardGrades(studentDcid);
    
    // 提取所有standardgradesectionid
    const sectionIds = grades.map(g => g.standardgradesectionid);
    const uniqueIds = [...new Set(sectionIds)];
    
    const comments = await this.getStandardGradeComments(uniqueIds);
    
    return { grades, comments };
  }

  /**
   * 获取按学期分组的成绩
   */
  async getStudentGradesByQuarter(studentDcid: number): Promise<Map<string, PSStandardGrade[]>> {
    const grades = await this.getStudentStandardGrades(studentDcid);
    
    const groupedGrades = new Map<string, PSStandardGrade[]>();
    
    for (const grade of grades) {
      const quarter = grade.storecode;
      if (!groupedGrades.has(quarter)) {
        groupedGrades.set(quarter, []);
      }
      groupedGrades.get(quarter)!.push(grade);
    }
    
    return groupedGrades;
  }
}


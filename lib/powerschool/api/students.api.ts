/**
 * PowerSchool 学生API
 */

import { PowerSchoolClient } from '../client';
import { PSStudent, PSContact, PSStudentUserFields, PSPaginationParams } from '../types';

export interface StudentQueryParams extends PSPaginationParams {
  schoolid?: number;
  grade_level?: number;
}

export interface StudentsResponse {
  students: { student: PSStudent[] };
}

export class StudentsAPI {
  constructor(private client: PowerSchoolClient) {}

  /**
   * 获取所有学生列表
   */
  async getStudents(params?: StudentQueryParams): Promise<PSStudent[]> {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pagesize) queryParams.pagesize = String(params.pagesize);
    if (params?.q) queryParams.q = params.q;
    if (params?.projection) queryParams.projection = params.projection;
    if (params?.order) queryParams.order = params.order;

    const query = new URLSearchParams(queryParams).toString();
    const url = `/ws/v1/school/${params?.schoolid}/student${query ? `?${query}` : ''}`;
    
    try {
      const response = await this.client.get<StudentsResponse>(url);
      return response.data.students?.student || [];
    } catch (error) {
      console.error('Failed to fetch students:', error);
      throw error;
    }
  }

  /**
   * 获取单个学生详情
   */
  async getStudent(studentId: number): Promise<PSStudent | null> {
    try {
      const response = await this.client.get<{ student: PSStudent }>(`/ws/v1/student/${studentId}`);
      return response.data.student;
    } catch (error) {
      console.error(`Failed to fetch student ${studentId}:`, error);
      return null;
    }
  }

  /**
   * 获取学生联系人信息
   */
  async getStudentContacts(studentId: number): Promise<PSContact[]> {
    try {
      const response = await this.client.get<{ contact: PSContact[] }>(
        `/ws/v1/student/${studentId}/contact`
      );
      return response.data.contact || [];
    } catch (error) {
      console.error(`Failed to fetch contacts for student ${studentId}:`, error);
      return [];
    }
  }

  /**
   * 获取学生自定义字段
   */
  async getStudentUserFields(studentDcid: number): Promise<PSStudentUserFields | null> {
    try {
      const records = await this.client.executeNamedQuery<PSStudentUserFields>(
        'org.infocare.student.userfields',
        { studentsdcid: studentDcid }
      );
      return records[0] || null;
    } catch (error) {
      console.error(`Failed to fetch user fields for student ${studentDcid}:`, error);
      return null;
    }
  }

  /**
   * 批量获取学生（使用分页）
   */
  async getAllStudents(schoolId: number, pageSize: number = 100): Promise<PSStudent[]> {
    const allStudents: PSStudent[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const students = await this.getStudents({
        schoolid: schoolId,
        page,
        pagesize: pageSize,
      });

      allStudents.push(...students);
      hasMore = students.length === pageSize;
      page++;
    }

    return allStudents;
  }

  /**
   * 获取活跃学生
   */
  async getActiveStudents(schoolId: number): Promise<PSStudent[]> {
    return this.getStudents({
      schoolid: schoolId,
      q: 'enroll_status==0',
    });
  }

  /**
   * 按年级获取学生
   */
  async getStudentsByGrade(schoolId: number, gradeLevel: number): Promise<PSStudent[]> {
    return this.getStudents({
      schoolid: schoolId,
      q: `grade_level==${gradeLevel}`,
    });
  }
}


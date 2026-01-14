/**
 * PowerSchool 课程API
 */

import { PowerSchoolClient } from '../client';

// PowerSchool返回的课程记录结构
interface PSCourseRecord {
  id: number;
  name: string;
  tables: {
    courses: {
      course_number: string;
      course_name: string;
      credit_hours: string;
      id: string;
      dcid: string;
    };
  };
}

// 转换后的课程数据
export interface PSCourse {
  psId: number;
  psDcid: number;
  courseNumber: string;
  courseName: string;
  creditHours: number;
}

export class CoursesAPI {
  constructor(private client: PowerSchoolClient) {}

  /**
   * 获取所有课程
   * 调用 Named Query: org.infocare.sync.courses
   */
  async getAllCourses(): Promise<PSCourse[]> {
    try {
      const records = await this.client.executeNamedQuery<PSCourseRecord>(
        'org.infocare.sync.courses'
      );
      
      return records.map((record) => {
        const course = record.tables.courses;
        return {
          psId: parseInt(course.id, 10),
          psDcid: parseInt(course.dcid, 10),
          courseNumber: course.course_number,
          courseName: course.course_name,
          creditHours: parseFloat(course.credit_hours) || 0,
        };
      });
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      return [];
    }
  }
}

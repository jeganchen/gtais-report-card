/**
 * 课程数据仓库
 */

import prisma from '../client';

export class CourseRepository {
  /**
   * 根据PowerSchool ID查找课程
   */
  async findByPsId(psId: number) {
    return prisma.course.findUnique({
      where: { psId },
    });
  }

  /**
   * 根据课程编号查找
   */
  async findByCourseNumber(courseNumber: string) {
    return prisma.course.findFirst({
      where: { courseNumber },
    });
  }

  /**
   * 获取所有课程
   */
  async findAll() {
    return prisma.course.findMany({
      where: { isActive: true },
      orderBy: { courseName: 'asc' },
    });
  }

  /**
   * 创建或更新课程
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    courseNumber: string;
    courseName: string;
    creditHours?: number;
    isActive?: boolean;
  }) {
    return prisma.course.upsert({
      where: { psId: data.psId },
      create: {
        ...data,
        creditHours: data.creditHours,
      },
      update: {
        psDcid: data.psDcid,
        courseNumber: data.courseNumber,
        courseName: data.courseName,
        creditHours: data.creditHours,
        isActive: data.isActive,
      },
    });
  }

  /**
   * 批量创建或更新课程
   */
  async upsertMany(courses: Array<{
    psId: number;
    psDcid?: number;
    courseNumber: string;
    courseName: string;
    creditHours?: number;
    isActive?: boolean;
  }>) {
    const results = [];
    for (const course of courses) {
      const result = await this.upsert(course);
      results.push(result);
    }
    return results;
  }
}

export class SectionRepository {
  /**
   * 根据PowerSchool ID查找课节
   */
  async findByPsId(psId: number) {
    return prisma.section.findUnique({
      where: { psId },
      include: { course: true, teacher: true, term: true },
    });
  }

  /**
   * 获取所有课节
   */
  async findAll(filters?: { schoolId?: string; termId?: string; teacherId?: string }) {
    return prisma.section.findMany({
      where: filters,
      include: { course: true, teacher: true, term: true },
      orderBy: { courseNumber: 'asc' },
    });
  }

  /**
   * 创建或更新课节
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    courseNumber: string;
    sectionNumber: string;
    expression?: string;
    schoolId: string;
    termId: string;
    teacherId?: string;
    courseId?: string;
  }) {
    return prisma.section.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        courseNumber: data.courseNumber,
        sectionNumber: data.sectionNumber,
        expression: data.expression,
        schoolId: data.schoolId,
        termId: data.termId,
        teacherId: data.teacherId,
        courseId: data.courseId,
      },
    });
  }

  /**
   * 批量创建或更新课节
   */
  async upsertMany(sections: Array<{
    psId: number;
    psDcid?: number;
    courseNumber: string;
    sectionNumber: string;
    expression?: string;
    schoolId: string;
    termId: string;
    teacherId?: string;
    courseId?: string;
  }>) {
    const results = [];
    for (const section of sections) {
      const result = await this.upsert(section);
      results.push(result);
    }
    return results;
  }
}

export const courseRepository = new CourseRepository();
export const sectionRepository = new SectionRepository();

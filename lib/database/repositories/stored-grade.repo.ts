/**
 * 成绩数据仓库
 */

import prisma from '../client';
import { Prisma } from '@prisma/client';

export class StandardRepository {
  /**
   * 根据PowerSchool ID查找标准
   */
  async findByPsId(psId: number) {
    return prisma.standard.findUnique({
      where: { psId },
    });
  }

  /**
   * 获取所有标准
   */
  async findAll(courseId?: string) {
    return prisma.standard.findMany({
      where: courseId ? { courseId, isActive: true } : { isActive: true },
      include: { course: true },
      orderBy: { listOrder: 'asc' },
    });
  }

  /**
   * 创建或更新标准
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    identifier: string;
    name: string;
    description?: string;
    subjectArea?: string;
    listOrder?: number;
    isActive?: boolean;
    courseId?: string;
  }) {
    return prisma.standard.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        identifier: data.identifier,
        name: data.name,
        description: data.description,
        subjectArea: data.subjectArea,
        listOrder: data.listOrder,
        isActive: data.isActive,
        courseId: data.courseId,
      },
    });
  }

  /**
   * 批量创建或更新标准
   */
  async upsertMany(standards: Array<{
    psId: number;
    psDcid?: number;
    identifier: string;
    name: string;
    description?: string;
    subjectArea?: string;
    listOrder?: number;
    isActive?: boolean;
    courseId?: string;
  }>) {
    const results = [];
    for (const standard of standards) {
      const result = await this.upsert(standard);
      results.push(result);
    }
    return results;
  }
}

export class StoredGradeRepository {
  /**
   * 根据PowerSchool ID查找成绩
   */
  async findByPsId(psId: number) {
    return prisma.storedGrade.findUnique({
      where: { psId },
      include: { student: true, term: true, section: true },
    });
  }

  /**
   * 获取学生成绩
   */
  async findByStudent(studentId: string, termId?: string) {
    return prisma.storedGrade.findMany({
      where: {
        studentId,
        ...(termId ? { termId } : {}),
      },
      include: { term: true, section: { include: { course: true } } },
      orderBy: [{ courseNumber: 'asc' }, { storeCode: 'asc' }],
    });
  }

  /**
   * 获取学生某学期的成绩
   */
  async findByStudentAndTerm(studentId: string, termId: string) {
    return prisma.storedGrade.findMany({
      where: { studentId, termId },
      include: { term: true, section: { include: { course: true } } },
      orderBy: [{ courseNumber: 'asc' }, { storeCode: 'asc' }],
    });
  }

  /**
   * 创建或更新成绩
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    courseNumber: string;
    grade?: string;
    percent?: number;
    gpaPoints?: number;
    storeCode?: string;
    comment?: string;
    studentId: string;
    schoolId: string;
    termId: string;
    sectionId?: string;
  }) {
    return prisma.storedGrade.upsert({
      where: { psId: data.psId },
      create: {
        ...data,
        percent: data.percent,
        gpaPoints: data.gpaPoints,
      },
      update: {
        psDcid: data.psDcid,
        courseNumber: data.courseNumber,
        grade: data.grade,
        percent: data.percent,
        gpaPoints: data.gpaPoints,
        storeCode: data.storeCode,
        comment: data.comment,
        studentId: data.studentId,
        schoolId: data.schoolId,
        termId: data.termId,
        sectionId: data.sectionId,
      },
    });
  }

  /**
   * 批量创建或更新成绩
   */
  async upsertMany(grades: Array<{
    psId: number;
    psDcid?: number;
    courseNumber: string;
    grade?: string;
    percent?: number;
    gpaPoints?: number;
    storeCode?: string;
    comment?: string;
    studentId: string;
    schoolId: string;
    termId: string;
    sectionId?: string;
  }>) {
    const results = [];
    for (const grade of grades) {
      const result = await this.upsert(grade);
      results.push(result);
    }
    return results;
  }
}

export const standardRepository = new StandardRepository();
export const storedGradeRepository = new StoredGradeRepository();

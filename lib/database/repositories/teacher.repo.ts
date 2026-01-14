/**
 * 教师数据仓库
 */

import prisma from '../client';

export class TeacherRepository {
  /**
   * 根据PowerSchool ID查找教师
   */
  async findByPsId(psId: number) {
    return prisma.teacher.findUnique({
      where: { psId },
    });
  }

  /**
   * 获取所有教师
   */
  async findAll(schoolId?: string) {
    return prisma.teacher.findMany({
      where: schoolId ? { schoolId } : undefined,
      orderBy: { lastName: 'asc' },
    });
  }

  /**
   * 创建或更新教师
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    firstName: string;
    lastName: string;
    lastFirst?: string;
    email?: string;
    staffStatus?: number;
    isActive?: boolean;
    schoolId: string;
  }) {
    return prisma.teacher.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        firstName: data.firstName,
        lastName: data.lastName,
        lastFirst: data.lastFirst,
        email: data.email,
        staffStatus: data.staffStatus,
        isActive: data.isActive,
        schoolId: data.schoolId,
      },
    });
  }

  /**
   * 批量创建或更新教师
   */
  async upsertMany(teachers: Array<{
    psId: number;
    psDcid?: number;
    firstName: string;
    lastName: string;
    lastFirst?: string;
    email?: string;
    staffStatus?: number;
    isActive?: boolean;
    schoolId: string;
  }>) {
    const results = [];
    for (const teacher of teachers) {
      const result = await this.upsert(teacher);
      results.push(result);
    }
    return results;
  }
}

export const teacherRepository = new TeacherRepository();

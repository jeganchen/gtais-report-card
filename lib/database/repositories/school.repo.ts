/**
 * 学校数据仓库
 */

import prisma from '../client';
import { Prisma } from '@prisma/client';

export class SchoolRepository {
  /**
   * 根据PowerSchool ID查找学校
   */
  async findByPsId(psId: number) {
    return prisma.school.findUnique({
      where: { psId },
    });
  }

  /**
   * 获取所有学校
   */
  async findAll() {
    return prisma.school.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 创建或更新学校
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    schoolNumber?: string;
    name: string;
    abbreviation?: string;
  }) {
    return prisma.school.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        schoolNumber: data.schoolNumber,
        name: data.name,
        abbreviation: data.abbreviation,
      },
    });
  }

  /**
   * 批量创建或更新学校
   */
  async upsertMany(schools: Array<{
    psId: number;
    psDcid?: number;
    schoolNumber?: string;
    name: string;
    abbreviation?: string;
  }>) {
    const results = [];
    for (const school of schools) {
      const result = await this.upsert(school);
      results.push(result);
    }
    return results;
  }
}

export const schoolRepository = new SchoolRepository();

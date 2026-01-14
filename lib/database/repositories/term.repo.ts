/**
 * 学期数据仓库
 */

import prisma from '../client';

export class TermRepository {
  /**
   * 根据PowerSchool ID查找学期
   */
  async findByPsId(psId: number) {
    return prisma.term.findUnique({
      where: { psId },
      include: { school: true },
    });
  }

  /**
   * 获取所有学期
   */
  async findAll(schoolId?: string) {
    return prisma.term.findMany({
      where: schoolId ? { schoolId } : undefined,
      include: { school: true },
      orderBy: { firstDay: 'desc' },
    });
  }

  /**
   * 获取所有学年（isYearRec = true）
   */
  async findAllYears(schoolId?: string) {
    return prisma.term.findMany({
      where: {
        isYearRec: true,
        ...(schoolId ? { schoolId } : {}),
      },
      include: { school: true },
      orderBy: { firstDay: 'desc' },
    });
  }

  /**
   * 获取当前学期
   */
  async findCurrent() {
    return prisma.term.findFirst({
      where: { isCurrent: true },
      include: { school: true },
    });
  }

  /**
   * 设置当前学期
   */
  async setCurrent(id: string) {
    // 先将所有学期设为非当前
    await prisma.term.updateMany({
      data: { isCurrent: false },
    });
    
    // 设置指定学期为当前
    return prisma.term.update({
      where: { id },
      data: { isCurrent: true },
    });
  }

  /**
   * 创建或更新学期
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    name: string;
    abbreviation?: string;
    firstDay: Date;
    lastDay: Date;
    yearId: number;
    isYearRec?: boolean;
    schoolId: string;
  }) {
    return prisma.term.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        name: data.name,
        abbreviation: data.abbreviation,
        firstDay: data.firstDay,
        lastDay: data.lastDay,
        yearId: data.yearId,
        isYearRec: data.isYearRec,
        schoolId: data.schoolId,
      },
    });
  }

  /**
   * 批量创建或更新学期
   */
  async upsertMany(terms: Array<{
    psId: number;
    psDcid?: number;
    name: string;
    abbreviation?: string;
    firstDay: Date;
    lastDay: Date;
    yearId: number;
    isYearRec?: boolean;
    schoolId: string;
  }>) {
    const results = [];
    for (const term of terms) {
      const result = await this.upsert(term);
      results.push(result);
    }
    return results;
  }
}

export const termRepository = new TermRepository();

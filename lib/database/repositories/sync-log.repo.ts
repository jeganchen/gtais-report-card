/**
 * 同步日志数据仓库
 */

import prisma from '../client';

export type SyncType = 'schools' | 'terms' | 'teachers' | 'courses' | 'standards' | 'students' | 'grades' | 'attendance' | 'contacts' | 'full';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed';

export class SyncLogRepository {
  /**
   * 创建同步日志
   */
  async create(type: SyncType) {
    return prisma.syncLog.create({
      data: {
        type,
        status: 'pending',
      },
    });
  }

  /**
   * 开始同步
   */
  async start(id: string) {
    return prisma.syncLog.update({
      where: { id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });
  }

  /**
   * 完成同步
   */
  async complete(id: string, recordCount: number, details?: object) {
    return prisma.syncLog.update({
      where: { id },
      data: {
        status: 'completed',
        recordCount,
        completedAt: new Date(),
        details: details ? JSON.stringify(details) : null,
      },
    });
  }

  /**
   * 同步失败
   */
  async fail(id: string, errorMsg: string) {
    return prisma.syncLog.update({
      where: { id },
      data: {
        status: 'failed',
        errorMsg,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 获取最新同步日志
   */
  async getLatest(type?: SyncType) {
    const where = type ? { type } : {};
    
    return prisma.syncLog.findFirst({
      where,
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * 获取同步日志列表
   */
  async findMany(options?: {
    type?: SyncType;
    status?: SyncStatus;
    limit?: number;
  }) {
    const where: Record<string, unknown> = {};
    
    if (options?.type) where.type = options.type;
    if (options?.status) where.status = options.status;
    
    return prisma.syncLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * 检查是否有正在运行的同步
   */
  async isRunning(type?: SyncType) {
    const where: Record<string, unknown> = { status: 'running' };
    if (type) where.type = type;
    
    const count = await prisma.syncLog.count({ where });
    return count > 0;
  }

  /**
   * 获取同步统计
   */
  async getStats() {
    const [total, completed, failed, running] = await Promise.all([
      prisma.syncLog.count(),
      prisma.syncLog.count({ where: { status: 'completed' } }),
      prisma.syncLog.count({ where: { status: 'failed' } }),
      prisma.syncLog.count({ where: { status: 'running' } }),
    ]);
    
    return { total, completed, failed, running };
  }

  /**
   * 清理旧日志
   */
  async cleanup(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    return prisma.syncLog.deleteMany({
      where: {
        startedAt: { lt: cutoffDate },
      },
    });
  }
}

// 导出单例
export const syncLogRepository = new SyncLogRepository();


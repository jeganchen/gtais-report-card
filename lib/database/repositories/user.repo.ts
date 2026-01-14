/**
 * 用户数据仓库
 */

import prisma from '../client';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'teacher';
export type AuthProvider = 'credentials' | 'azure-ad';

export interface CreateUserInput {
  email: string;
  name?: string;
  role?: UserRole;
  provider?: AuthProvider;
  password?: string;  // 明文密码，会被加密存储
  isActive?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  password?: string;  // 明文密码，会被加密存储
  isActive?: boolean;
}

export class UserRepository {
  /**
   * 创建用户
   */
  async create(data: CreateUserInput) {
    const hashedPassword = data.password 
      ? await bcrypt.hash(data.password, 10)
      : null;

    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role || 'teacher',
        provider: data.provider || 'credentials',
        password: hashedPassword,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * 获取所有用户
   */
  async findAll(options?: { isActive?: boolean; role?: UserRole }) {
    const where: Record<string, unknown> = {};
    
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    
    if (options?.role) {
      where.role = options.role;
    }

    return prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        email: true,
        name: true,
        role: true,
        provider: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // 不返回password
      },
    });
  }

  /**
   * 更新用户
   */
  async update(email: string, data: UpdateUserInput) {
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { email: email.toLowerCase() },
      data: updateData,
      select: {
        email: true,
        name: true,
        role: true,
        provider: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * 删除用户
   */
  async delete(email: string) {
    return prisma.user.delete({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * 验证密码
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { password: true, isActive: true },
    });

    if (!user || !user.password || !user.isActive) {
      return false;
    }

    return bcrypt.compare(password, user.password);
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(email: string) {
    return prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * 检查用户是否存在且活跃
   */
  async isActiveUser(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { isActive: true },
    });

    return user?.isActive ?? false;
  }

  /**
   * 统计用户数量
   */
  async count(options?: { isActive?: boolean; role?: UserRole }) {
    const where: Record<string, unknown> = {};
    
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    
    if (options?.role) {
      where.role = options.role;
    }

    return prisma.user.count({ where });
  }

  /**
   * 批量创建用户
   */
  async createMany(users: CreateUserInput[]) {
    const results = [];
    
    for (const user of users) {
      try {
        const created = await this.create(user);
        results.push({ success: true, email: created.email });
      } catch (error) {
        results.push({ 
          success: false, 
          email: user.email, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  }
}

// 导出单例
export const userRepository = new UserRepository();

/**
 * 用户管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/lib/database/repositories';
import { auth } from '@/lib/auth';

/**
 * GET /api/users - 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 只有admin可以查看用户列表
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const role = searchParams.get('role');

    const users = await userRepository.findAll({
      isActive: isActive === null ? undefined : isActive === 'true',
      role: role as 'admin' | 'teacher' | undefined,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to get users:', error);
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - 创建用户
 */
export async function POST(request: NextRequest) {
  try {
    // 验证登录状态
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 只有admin可以创建用户
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, role, provider, password, isActive } = body;

    // 验证必填字段
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // 检查用户是否已存在
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Credentials用户需要密码
    if (provider === 'credentials' && !password) {
      return NextResponse.json(
        { error: 'Password is required for credentials users' },
        { status: 400 }
      );
    }

    const user = await userRepository.create({
      email,
      name,
      role: role || 'teacher',
      provider: provider || 'credentials',
      password,
      isActive: isActive ?? true,
    });

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        isActive: user.isActive,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

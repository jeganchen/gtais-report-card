/**
 * 单个用户管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import { userRepository } from '@/lib/database/repositories';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    email: string;
  }>;
}

/**
 * GET /api/users/[email] - 获取用户详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    // 普通用户只能查看自己的信息，admin可以查看所有
    if (session.user.role !== 'admin' && session.user.email !== decodedEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await userRepository.findByEmail(decodedEmail);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to get user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[email] - 更新用户
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    // 只有admin可以更新其他用户，用户可以更新自己的部分信息
    const isAdmin = session.user.role === 'admin';
    const isSelf = session.user.email === decodedEmail;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, role, password, isActive } = body;

    // 检查用户是否存在
    const existingUser = await userRepository.findByEmail(decodedEmail);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 非admin不能修改角色和激活状态
    const updateData: { name?: string; role?: 'admin' | 'teacher'; password?: string; isActive?: boolean } = {};
    
    if (name !== undefined) updateData.name = name;
    if (password) updateData.password = password;
    
    if (isAdmin) {
      if (role !== undefined && (role === 'admin' || role === 'teacher')) {
        updateData.role = role;
      }
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const user = await userRepository.update(decodedEmail, updateData);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[email] - 删除用户
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 只有admin可以删除用户
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    // 不能删除自己
    if (session.user.email === decodedEmail) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await userRepository.findByEmail(decodedEmail);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await userRepository.delete(decodedEmail);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

/**
 * 重置所有学生的报告状态
 * POST /api/report/reset-all
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';

const USE_DATABASE = process.env.USE_DATABASE === 'true';

export async function POST() {
  if (!USE_DATABASE) {
    return NextResponse.json(
      { error: 'Database is not enabled' },
      { status: 400 }
    );
  }

  try {
    // 重置所有学生的报告状态
    const result = await prisma.student.updateMany({
      data: {
        pdfGenerated: false,
        pdfGeneratedAt: null,
        pdfUrl: null,
        emailSent: false,
        emailSentAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Reset ${result.count} student report statuses`,
      count: result.count,
    });
  } catch (error) {
    console.error('Failed to reset report statuses:', error);
    return NextResponse.json(
      { error: 'Failed to reset report statuses' },
      { status: 500 }
    );
  }
}

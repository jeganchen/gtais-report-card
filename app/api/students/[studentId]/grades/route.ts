/**
 * 学生成绩API
 */

import { NextRequest, NextResponse } from 'next/server';
import { studentService } from '@/lib/services';
import { getGradesByStudentId } from '@/mocks';

interface RouteParams {
  params: Promise<{
    studentId: string;
  }>;
}

const USE_DATABASE = process.env.USE_DATABASE === 'true';

/**
 * GET /api/students/[studentId]/grades - 获取学生成绩
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { studentId } = await params;
    
    if (USE_DATABASE) {
      const grades = await studentService.getStudentGrades(studentId);
      return NextResponse.json({ grades });
    }
    
    // Mock数据
    const grades = getGradesByStudentId(studentId);
    return NextResponse.json({ grades });
  } catch (error) {
    console.error('Failed to get student grades:', error);
    return NextResponse.json(
      { error: 'Failed to get student grades' },
      { status: 500 }
    );
  }
}


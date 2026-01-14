/**
 * 学生考勤API
 */

import { NextRequest, NextResponse } from 'next/server';
import { studentService } from '@/lib/services';
import { getAttendanceByStudentId } from '@/mocks';

interface RouteParams {
  params: Promise<{
    studentId: string;
  }>;
}

const USE_DATABASE = process.env.USE_DATABASE === 'true';

/**
 * GET /api/students/[studentId]/attendance - 获取学生考勤
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { studentId } = await params;
    
    if (USE_DATABASE) {
      const attendance = await studentService.getStudentAttendance(studentId);
      return NextResponse.json({ attendance });
    }
    
    // Mock数据
    const attendance = getAttendanceByStudentId(studentId);
    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Failed to get student attendance:', error);
    return NextResponse.json(
      { error: 'Failed to get student attendance' },
      { status: 500 }
    );
  }
}


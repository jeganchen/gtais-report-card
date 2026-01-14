/**
 * 单个学生详情API
 */

import { NextRequest, NextResponse } from 'next/server';
import { studentService } from '@/lib/services';
import { mockStudents } from '@/mocks';

interface RouteParams {
  params: Promise<{
    studentId: string;
  }>;
}

const USE_DATABASE = process.env.USE_DATABASE === 'true';

/**
 * GET /api/students/[studentId] - 获取学生详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { studentId } = await params;
    
    if (USE_DATABASE) {
      const student = await studentService.getStudent(studentId);
      
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ student });
    }
    
    // Mock数据
    const student = mockStudents.find(s => s.id === studentId);
    
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ student });
  } catch (error) {
    console.error('Failed to get student:', error);
    return NextResponse.json(
      { error: 'Failed to get student' },
      { status: 500 }
    );
  }
}


/**
 * 学生报告数据API
 */

import { NextRequest, NextResponse } from 'next/server';
import { studentService } from '@/lib/services';
import { 
  getStudentById, 
  getAttendanceByStudentId, 
  getGradesByStudentId, 
  mockSchoolInfo,
  mockSignatureSettings 
} from '@/mocks';

interface RouteParams {
  params: Promise<{
    studentId: string;
  }>;
}

const USE_DATABASE = process.env.USE_DATABASE === 'true';

/**
 * GET /api/students/[studentId]/report - 获取学生完整报告数据
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { studentId } = await params;
    
    if (USE_DATABASE) {
      const reportData = await studentService.getStudentReportData(studentId);
      
      if (!reportData) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ reportData });
    }
    
    // Mock数据
    const student = getStudentById(studentId);
    
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }
    
    const reportData = {
      student,
      schoolYear: '2025-2026',
      schoolInfo: mockSchoolInfo,
      attendance: getAttendanceByStudentId(studentId),
      grades: getGradesByStudentId(studentId),
      signature: mockSignatureSettings,
    };
    
    return NextResponse.json({ reportData });
  } catch (error) {
    console.error('Failed to get student report data:', error);
    return NextResponse.json(
      { error: 'Failed to get student report data' },
      { status: 500 }
    );
  }
}


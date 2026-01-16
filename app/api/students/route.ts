/**
 * 学生列表API
 * 支持从数据库和Mock数据源读取
 */

import { NextResponse } from 'next/server';
import { studentService } from '@/lib/services';
import { mockStudents } from '@/mocks';

// 是否使用数据库（可以通过环境变量控制）
const USE_DATABASE = process.env.USE_DATABASE === 'true';

// 有效的学校编号（当选择 All Schools 时，只显示这些学校的学生）
const VALID_SCHOOL_NUMBERS = [1, 2, 3, 4];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const search = searchParams.get('search') || '';
  const grade = searchParams.get('grade');
  const schoolId = searchParams.get('schoolId'); // 从查询参数获取 schoolId (ps_school_id)
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  // 如果启用数据库，从数据库读取
  if (USE_DATABASE) {
    try {
      const result = await studentService.getStudents(
        {
          search: search || undefined,
          gradeLevel: grade ? parseInt(grade) : undefined,
          // 如果指定了 schoolId，使用单个学校过滤；否则使用 VALID_SCHOOL_NUMBERS 过滤
          schoolId: schoolId ? parseInt(schoolId, 10) : undefined,
          schoolIds: schoolId ? undefined : VALID_SCHOOL_NUMBERS, // All Schools 时使用多个学校过滤
        },
        { page, pageSize }
      );
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Database error, falling back to mock data:', error);
      // 如果数据库错误，回退到mock数据
    }
  }

  // 使用Mock数据
  let filtered = [...mockStudents];

  // 搜索过滤
  if (search) {
    const query = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.studentNumber.includes(search) ||
        s.chineseName?.includes(search)
    );
  }

  // 年级过滤
  if (grade) {
    filtered = filtered.filter((s) => s.gradeLevel === parseInt(grade));
  }

  // 分页
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const students = filtered.slice(start, end);

  return NextResponse.json({
    students,
    total,
    page,
    pageSize,
  });
}

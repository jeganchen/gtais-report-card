/**
 * 课程同步API
 * 从PowerSchool获取课程数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, courseRepository, syncLogRepository } from '@/lib/database/repositories';

// PowerSchool返回的课程数据结构
interface PSCourseRecord {
  id: number;
  name: string;
  tables: {
    courses: {
      course_number: string;
      course_name: string;
      credit_hours: string;
      id: string;
      dcid: string;
    };
  };
}

interface PSCoursesResponse {
  name: string;
  record: PSCourseRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/courses - 同步课程数据
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 获取PowerSchool配置
    const config = await settingsRepository.getPowerSchoolConfig();
    
    if (!config.endpoint || !config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: 'PowerSchool configuration is incomplete' },
        { status: 400 }
      );
    }
    
    if (!config.accessToken) {
      return NextResponse.json(
        { error: 'PowerSchool access token not found. Please get a token first.' },
        { status: 401 }
      );
    }

    // 创建同步日志
    const log = await syncLogRepository.create('courses');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API - 无参数
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.courses`;
    console.log(`Calling PowerSchool API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PowerSchool API error:', errorText);
      await syncLogRepository.fail(log.id, `PowerSchool API error: ${response.status}`);
      throw new Error(`PowerSchool API error: ${response.status} ${response.statusText}`);
    }

    const data: PSCoursesResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} courses from PowerSchool`);

    // 解析并保存课程数据
    const coursesToSave = data.record.map((record) => {
      const course = record.tables.courses;
      return {
        psId: parseInt(course.id, 10),
        psDcid: parseInt(course.dcid, 10),
        courseNumber: course.course_number,
        courseName: course.course_name,
        creditHours: parseFloat(course.credit_hours) || 0,
        isActive: true,
      };
    });

    console.log(`Parsed ${coursesToSave.length} courses`);

    // 批量保存到数据库
    await courseRepository.upsertMany(coursesToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, coursesToSave.length, {
      courses: coursesToSave.map(c => ({ 
        id: c.psId, 
        courseNumber: c.courseNumber,
        courseName: c.courseName,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${coursesToSave.length} courses`,
      data: {
        count: coursesToSave.length,
        duration: `${duration}ms`,
        courses: coursesToSave.map(c => ({
          psId: c.psId,
          courseNumber: c.courseNumber,
          courseName: c.courseName,
          creditHours: c.creditHours,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync courses:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync courses',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/courses - 获取已同步的课程列表
 */
export async function GET() {
  try {
    const courses = await courseRepository.findAll();
    
    return NextResponse.json({
      courses: courses.map(c => ({
        id: c.id,
        psId: c.psId,
        psDcid: c.psDcid,
        courseNumber: c.courseNumber,
        courseName: c.courseName,
        creditHours: c.creditHours ? Number(c.creditHours) : 0,
        isActive: c.isActive,
      })),
      total: courses.length,
    });
  } catch (error) {
    console.error('Failed to get courses:', error);
    return NextResponse.json(
      { error: 'Failed to get courses', courses: [], total: 0 },
      { status: 500 }
    );
  }
}

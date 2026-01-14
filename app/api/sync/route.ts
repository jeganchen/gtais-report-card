/**
 * 数据同步API
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncService } from '@/lib/services';

/**
 * GET /api/sync - 获取同步状态
 */
export async function GET() {
  try {
    const status = await syncService.getSyncStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync - 触发数据同步
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type || 'full';
    
    let result;
    
    switch (type) {
      case 'schools':
        result = await syncService.syncSchools();
        break;
      case 'terms':
      case 'years':
        result = await syncService.syncTerms();
        break;
      case 'teachers':
        result = await syncService.syncTeachers();
        break;
      case 'students':
        result = await syncService.syncStudents();
        break;
      case 'courses':
        result = await syncService.syncCourses();
        break;
      case 'sections':
        result = await syncService.syncSections();
        break;
      case 'grades':
        result = await syncService.syncGrades();
        break;
      case 'attendance':
        result = await syncService.syncAttendance();
        break;
      case 'contacts':
        result = await syncService.syncContacts();
        break;
      case 'full':
      default:
        result = await syncService.syncAll();
    }
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Sync completed successfully`,
        data: result,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          data: result,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}


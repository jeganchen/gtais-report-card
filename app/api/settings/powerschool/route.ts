/**
 * PowerSchool设置API
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository } from '@/lib/database/repositories';

const USE_DATABASE = process.env.USE_DATABASE === 'true';

/**
 * GET /api/settings/powerschool - 获取PowerSchool配置
 */
export async function GET() {
  if (!USE_DATABASE) {
    return NextResponse.json({
      endpoint: '',
      clientId: '',
      configured: false,
    });
  }
  
  try {
    const config = await settingsRepository.getPowerSchoolConfig();
    
    return NextResponse.json({
      endpoint: config.endpoint || '',
      clientId: config.clientId || '',
      configured: !!config.endpoint && !!config.clientId && !!config.clientSecret,
      hasToken: !!config.accessToken,
      tokenExpiresAt: config.tokenExpiresAt?.toISOString(),
    });
  } catch (error) {
    console.error('Failed to get PowerSchool config:', error);
    return NextResponse.json(
      { error: 'Failed to get PowerSchool config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/powerschool - 更新PowerSchool配置
 */
export async function PUT(request: NextRequest) {
  if (!USE_DATABASE) {
    return NextResponse.json(
      { error: 'Database not enabled' },
      { status: 400 }
    );
  }
  
  try {
    const data = await request.json();
    
    await settingsRepository.updatePowerSchoolConfig({
      endpoint: data.endpoint,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update PowerSchool config:', error);
    return NextResponse.json(
      { error: 'Failed to update PowerSchool config' },
      { status: 500 }
    );
  }
}

/**
 * PowerSchool OAuth Token API
 * 用于获取PowerSchool访问令牌
 */

import { NextResponse } from 'next/server';
import { settingsRepository } from '@/lib/database/repositories';

const USE_DATABASE = process.env.USE_DATABASE === 'true';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { endpoint, clientId, clientSecret, saveToDb, refreshFromDb } = body;

    // 如果是刷新模式，从数据库获取凭据
    if (refreshFromDb && USE_DATABASE) {
      const config = await settingsRepository.getPowerSchoolConfig();
      if (!config.endpoint || !config.clientId || !config.clientSecret) {
        return NextResponse.json(
          { error: 'PowerSchool configuration not found in database. Please configure first.' },
          { status: 400 }
        );
      }
      endpoint = config.endpoint;
      clientId = config.clientId;
      clientSecret = config.clientSecret;
      saveToDb = true;
    }

    // 验证必填字段
    if (!endpoint || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, clientId, clientSecret' },
        { status: 400 }
      );
    }

    // 构建OAuth URL
    const tokenUrl = `${endpoint.replace(/\/$/, '')}/oauth/access_token`;

    // 创建Base64编码的credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // 调用PowerSchool OAuth API
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    // 解析响应
    const data = await response.json();

    if (!response.ok) {
      console.error('PowerSchool OAuth error:', data);
      return NextResponse.json(
        { 
          error: data.error_description || data.error || 'Failed to obtain access token',
          details: data
        },
        { status: response.status }
      );
    }

    // 计算过期时间
    const expiresIn = data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // 如果启用数据库并且请求保存，则保存到数据库
    if (USE_DATABASE && saveToDb) {
      try {
        await settingsRepository.updateToken(data.access_token, expiresAt);
      } catch (dbError) {
        console.error('Failed to save token to database:', dbError);
      }
    }

    // 返回token信息
    return NextResponse.json({
      access_token: data.access_token,
      token_type: data.token_type || 'Bearer',
      expires_in: expiresIn,
      expires_at: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('PowerSchool token fetch error:', error);
    
    // 处理网络错误等
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Unable to connect to PowerSchool server. Please check the endpoint URL.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/powerschool/token - 获取当前token状态
 */
export async function GET() {
  if (!USE_DATABASE) {
    return NextResponse.json({ configured: false });
  }
  
  try {
    const config = await settingsRepository.getPowerSchoolConfig();
    
    const hasToken = !!config.accessToken;
    const isExpired = config.tokenExpiresAt 
      ? new Date(config.tokenExpiresAt) < new Date() 
      : true;
    
    return NextResponse.json({
      configured: !!config.endpoint && !!config.clientId && !!config.clientSecret,
      hasToken,
      isExpired,
      expiresAt: config.tokenExpiresAt?.toISOString(),
    });
  } catch (error) {
    console.error('Failed to get token status:', error);
    return NextResponse.json(
      { error: 'Failed to get token status' },
      { status: 500 }
    );
  }
}

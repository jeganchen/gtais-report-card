/**
 * 系统设置API
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository } from '@/lib/database/repositories';
import { defaultSettings } from '@/types/settings';

const USE_DATABASE = process.env.USE_DATABASE === 'true';

/**
 * GET /api/settings - 获取所有设置
 */
export async function GET() {
  if (!USE_DATABASE) {
    return NextResponse.json({ settings: defaultSettings });
  }
  
  try {
    const [powerSchool, azureAD, smtp, signature] = await Promise.all([
      settingsRepository.getPowerSchoolConfig(),
      settingsRepository.getAzureADConfig(),
      settingsRepository.getSMTPConfig(),
      settingsRepository.getSignatureConfig(),
    ]);
    
    return NextResponse.json({
      settings: {
        powerSchool: {
          endpoint: powerSchool.endpoint || '',
          clientId: powerSchool.clientId || '',
          clientSecret: powerSchool.clientSecret ? '********' : '', // 不返回明文密钥
          accessToken: powerSchool.accessToken ? '********' : undefined,
          tokenExpiresAt: powerSchool.tokenExpiresAt?.toISOString(),
          enabled: !!powerSchool.endpoint,
        },
        azureAD: {
          clientId: azureAD.clientId || '',
          clientSecret: azureAD.clientSecret ? '********' : '',
          tenantId: azureAD.tenantId || '',
          enabled: azureAD.enabled,
        },
        smtp: {
          host: smtp.host || '',
          port: smtp.port || 587,
          secure: smtp.secure,
          username: smtp.username || '',
          password: smtp.password ? '********' : '',
          fromEmail: smtp.fromEmail || '',
          fromName: smtp.fromName || '',
          enabled: smtp.enabled,
        },
        signature: {
          principalName: signature.principalName || '',
          principalTitle: signature.principalTitle || 'Principal',
          signatureImageUrl: signature.signatureImage || undefined,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings - 更新设置
 */
export async function PUT(request: NextRequest) {
  if (!USE_DATABASE) {
    return NextResponse.json(
      { error: 'Database not enabled' },
      { status: 400 }
    );
  }
  
  try {
    const body = await request.json();
    const { section, data } = body;
    
    switch (section) {
      case 'powerSchool':
        await settingsRepository.updatePowerSchoolConfig({
          endpoint: data.endpoint,
          clientId: data.clientId,
          clientSecret: data.clientSecret !== '********' ? data.clientSecret : undefined,
        });
        break;
        
      case 'azureAD':
        await settingsRepository.updateAzureADConfig({
          clientId: data.clientId,
          clientSecret: data.clientSecret !== '********' ? data.clientSecret : undefined,
          tenantId: data.tenantId,
          enabled: data.enabled,
        });
        break;
        
      case 'smtp':
        await settingsRepository.updateSMTPConfig({
          host: data.host,
          port: data.port,
          secure: data.secure,
          username: data.username,
          password: data.password !== '********' ? data.password : undefined,
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          enabled: data.enabled,
        });
        break;
        
      case 'signature':
        await settingsRepository.updateSignatureConfig({
          principalName: data.principalName,
          principalTitle: data.principalTitle,
          signatureImage: data.signatureImageUrl,
        });
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid settings section' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}


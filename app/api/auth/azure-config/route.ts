/**
 * Azure AD 配置 API
 * 返回 Azure AD 是否启用及基本配置信息（不返回敏感信息）
 */

import { NextResponse } from 'next/server';
import { getAzureADConfig } from '@/lib/azure-config';

export async function GET() {
  try {
    const config = await getAzureADConfig();
    
    const configured = !!config.clientId && !!config.clientSecret && !!config.tenantId;
    
    // 只返回非敏感信息
    // enabled: 配置完整且未被禁用
    return NextResponse.json({
      enabled: config.enabled && configured,
      configured,
      // Debug info (remove in production)
      debug: {
        hasClientId: !!config.clientId,
        hasClientSecret: !!config.clientSecret,
        hasTenantId: !!config.tenantId,
        enabledFlag: config.enabled,
      },
    });
  } catch (error) {
    console.error('Failed to get Azure AD config:', error);
    return NextResponse.json({
      enabled: false,
      configured: false,
    });
  }
}

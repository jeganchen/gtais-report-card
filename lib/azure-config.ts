/**
 * Azure AD 配置管理
 * 从数据库读取配置，支持缓存
 */

import prisma from './database/client';

export interface AzureADConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  enabled: boolean;
}

// 配置缓存
let cachedConfig: AzureADConfig | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

/**
 * 从数据库获取 Azure AD 配置
 * 带缓存机制
 */
export async function getAzureADConfig(): Promise<AzureADConfig> {
  const now = Date.now();
  
  // 检查缓存是否有效
  if (cachedConfig && (now - cacheTime) < CACHE_DURATION) {
    return cachedConfig;
  }
  
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'main' },
      select: {
        azureClientId: true,
        azureClientSecret: true,
        azureTenantId: true,
        azureEnabled: true,
      },
    });
    
    // 优先使用数据库配置，其次使用环境变量
    const clientId = settings?.azureClientId || process.env.AZURE_AD_CLIENT_ID || '';
    const clientSecret = settings?.azureClientSecret || process.env.AZURE_AD_CLIENT_SECRET || '';
    const tenantId = settings?.azureTenantId || process.env.AZURE_AD_TENANT_ID || '';
    
    // 如果配置完整（有 clientId, clientSecret, tenantId），则视为启用
    // 除非数据库明确设置为禁用
    const hasValidConfig = !!clientId && !!clientSecret && !!tenantId;
    const isExplicitlyDisabled = settings?.azureEnabled === false && !!settings?.azureClientId;
    
    cachedConfig = {
      clientId,
      clientSecret,
      tenantId,
      enabled: hasValidConfig && !isExplicitlyDisabled,
    };
    cacheTime = now;
    
    return cachedConfig;
  } catch (error) {
    console.error('Failed to get Azure AD config from database:', error);
    
    // 回退到环境变量
    return {
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
      enabled: !!process.env.AZURE_AD_CLIENT_ID,
    };
  }
}

/**
 * 同步获取缓存的配置（用于 NextAuth 初始化）
 * 如果缓存为空，返回环境变量配置
 */
export function getAzureADConfigSync(): AzureADConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const clientId = process.env.AZURE_AD_CLIENT_ID || '';
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET || '';
  const tenantId = process.env.AZURE_AD_TENANT_ID || '';
  const hasValidConfig = !!clientId && !!clientSecret && !!tenantId;
  
  return {
    clientId,
    clientSecret,
    tenantId,
    enabled: hasValidConfig,
  };
}

/**
 * 清除配置缓存
 */
export function clearAzureADConfigCache(): void {
  cachedConfig = null;
  cacheTime = 0;
}

/**
 * 预加载配置到缓存
 */
export async function preloadAzureADConfig(): Promise<void> {
  await getAzureADConfig();
}

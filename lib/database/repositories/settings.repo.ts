/**
 * 系统设置数据仓库
 */

import prisma from '../client';
import { Prisma } from '@prisma/client';

const SETTINGS_ID = 'main';

export interface PowerSchoolConfig {
  endpoint: string | null;
  clientId: string | null;
  clientSecret: string | null;
  accessToken: string | null;
  tokenExpiresAt: Date | null;
}

export interface AzureADConfig {
  clientId: string | null;
  clientSecret: string | null;
  tenantId: string | null;
  enabled: boolean;
}

export interface SMTPConfig {
  host: string | null;
  port: number | null;
  secure: boolean;
  username: string | null;
  password: string | null;
  fromEmail: string | null;
  fromName: string | null;
  enabled: boolean;
}

export interface SignatureConfig {
  principalName: string | null;
  principalTitle: string | null;
  signatureImage: string | null;
}

export class SettingsRepository {
  /**
   * 获取所有设置
   */
  async getAll() {
    const settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });
    
    if (!settings) {
      // 创建默认设置
      return prisma.settings.create({
        data: { id: SETTINGS_ID },
      });
    }
    
    return settings;
  }

  /**
   * 获取PowerSchool配置
   */
  async getPowerSchoolConfig(): Promise<PowerSchoolConfig> {
    const settings = await this.getAll();
    
    return {
      endpoint: settings.psEndpoint,
      clientId: settings.psClientId,
      clientSecret: settings.psClientSecret,
      accessToken: settings.psAccessToken,
      tokenExpiresAt: settings.psTokenExpiresAt,
    };
  }

  /**
   * 更新PowerSchool配置
   * 只更新提供的字段，不覆盖未提供的字段
   */
  async updatePowerSchoolConfig(config: Partial<{
    endpoint: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
    tokenExpiresAt: Date;
  }>) {
    // 构建更新数据，只包含非undefined的字段
    const updateData: Prisma.SettingsUpdateInput = {};
    
    if (config.endpoint !== undefined) updateData.psEndpoint = config.endpoint;
    if (config.clientId !== undefined) updateData.psClientId = config.clientId;
    if (config.clientSecret !== undefined) updateData.psClientSecret = config.clientSecret;
    if (config.accessToken !== undefined) updateData.psAccessToken = config.accessToken;
    if (config.tokenExpiresAt !== undefined) updateData.psTokenExpiresAt = config.tokenExpiresAt;
    
    return prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        psEndpoint: config.endpoint,
        psClientId: config.clientId,
        psClientSecret: config.clientSecret,
        psAccessToken: config.accessToken,
        psTokenExpiresAt: config.tokenExpiresAt,
      },
      update: updateData,
    });
  }

  /**
   * 更新Token
   */
  async updateToken(accessToken: string | undefined | null, expiresAt: Date | undefined | null) {
    return prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        psAccessToken: accessToken ?? null,
        psTokenExpiresAt: expiresAt ?? null,
      },
      update: {
        psAccessToken: accessToken ?? null,
        psTokenExpiresAt: expiresAt ?? null,
      },
    });
  }

  /**
   * 清除Token
   */
  async clearToken() {
    return prisma.settings.update({
      where: { id: SETTINGS_ID },
      data: {
        psAccessToken: null,
        psTokenExpiresAt: null,
      },
    });
  }

  /**
   * 获取Azure AD配置
   */
  async getAzureADConfig(): Promise<AzureADConfig> {
    const settings = await this.getAll();
    
    return {
      clientId: settings.azureClientId,
      clientSecret: settings.azureClientSecret,
      tenantId: settings.azureTenantId,
      enabled: settings.azureEnabled,
    };
  }

  /**
   * 更新Azure AD配置
   * 只更新提供的字段，不覆盖未提供的字段
   */
  async updateAzureADConfig(config: Partial<AzureADConfig>) {
    const updateData: Prisma.SettingsUpdateInput = {};
    
    if (config.clientId !== undefined) updateData.azureClientId = config.clientId;
    if (config.clientSecret !== undefined) updateData.azureClientSecret = config.clientSecret;
    if (config.tenantId !== undefined) updateData.azureTenantId = config.tenantId;
    if (config.enabled !== undefined) updateData.azureEnabled = config.enabled;
    
    return prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        azureClientId: config.clientId,
        azureClientSecret: config.clientSecret,
        azureTenantId: config.tenantId,
        azureEnabled: config.enabled,
      },
      update: updateData,
    });
  }

  /**
   * 获取SMTP配置
   */
  async getSMTPConfig(): Promise<SMTPConfig> {
    const settings = await this.getAll();
    
    return {
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      username: settings.smtpUsername,
      password: settings.smtpPassword,
      fromEmail: settings.smtpFromEmail,
      fromName: settings.smtpFromName,
      enabled: settings.smtpEnabled,
    };
  }

  /**
   * 更新SMTP配置
   * 只更新提供的字段，不覆盖未提供的字段
   */
  async updateSMTPConfig(config: Partial<SMTPConfig>) {
    const updateData: Prisma.SettingsUpdateInput = {};
    
    if (config.host !== undefined) updateData.smtpHost = config.host;
    if (config.port !== undefined) updateData.smtpPort = config.port;
    if (config.secure !== undefined) updateData.smtpSecure = config.secure;
    if (config.username !== undefined) updateData.smtpUsername = config.username;
    if (config.password !== undefined) updateData.smtpPassword = config.password;
    if (config.fromEmail !== undefined) updateData.smtpFromEmail = config.fromEmail;
    if (config.fromName !== undefined) updateData.smtpFromName = config.fromName;
    if (config.enabled !== undefined) updateData.smtpEnabled = config.enabled;
    
    return prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        smtpHost: config.host,
        smtpPort: config.port,
        smtpSecure: config.secure,
        smtpUsername: config.username,
        smtpPassword: config.password,
        smtpFromEmail: config.fromEmail,
        smtpFromName: config.fromName,
        smtpEnabled: config.enabled,
      },
      update: updateData,
    });
  }

  /**
   * 获取签名配置
   */
  async getSignatureConfig(): Promise<SignatureConfig> {
    const settings = await this.getAll();
    
    return {
      principalName: settings.principalName,
      principalTitle: settings.principalTitle,
      signatureImage: settings.signatureImage,
    };
  }

  /**
   * 更新签名配置
   * 只更新提供的字段，不覆盖未提供的字段
   */
  async updateSignatureConfig(config: Partial<SignatureConfig>) {
    const updateData: Prisma.SettingsUpdateInput = {};
    
    if (config.principalName !== undefined) updateData.principalName = config.principalName;
    if (config.principalTitle !== undefined) updateData.principalTitle = config.principalTitle;
    if (config.signatureImage !== undefined) updateData.signatureImage = config.signatureImage;
    
    return prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        principalName: config.principalName,
        principalTitle: config.principalTitle,
        signatureImage: config.signatureImage,
      },
      update: updateData,
    });
  }
}

// 导出单例
export const settingsRepository = new SettingsRepository();


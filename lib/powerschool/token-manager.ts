/**
 * PowerSchool Token管理器
 * 负责Token的获取、存储、刷新和验证
 */

import prisma from '../database/client';
import { PSTokenResponse } from './types';

export interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
}

export class TokenManager {
  private static instance: TokenManager;
  private cachedToken: TokenInfo | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * 从数据库加载Token
   */
  async loadToken(): Promise<TokenInfo | null> {
    try {
      const settings = await prisma.settings.findUnique({
        where: { id: 'main' },
        select: {
          psAccessToken: true,
          psTokenExpiresAt: true,
        },
      });

      if (settings?.psAccessToken && settings?.psTokenExpiresAt) {
        this.cachedToken = {
          accessToken: settings.psAccessToken,
          expiresAt: settings.psTokenExpiresAt,
        };
        return this.cachedToken;
      }
      return null;
    } catch (error) {
      console.error('Failed to load token from database:', error);
      return null;
    }
  }

  /**
   * 保存Token到数据库
   */
  async saveToken(tokenResponse: PSTokenResponse): Promise<TokenInfo> {
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
    
    try {
      await prisma.settings.upsert({
        where: { id: 'main' },
        update: {
          psAccessToken: tokenResponse.access_token,
          psTokenExpiresAt: expiresAt,
        },
        create: {
          id: 'main',
          psAccessToken: tokenResponse.access_token,
          psTokenExpiresAt: expiresAt,
        },
      });

      this.cachedToken = {
        accessToken: tokenResponse.access_token,
        expiresAt,
      };

      return this.cachedToken;
    } catch (error) {
      console.error('Failed to save token to database:', error);
      throw error;
    }
  }

  /**
   * 获取有效Token
   */
  async getValidToken(): Promise<string | null> {
    // 检查缓存的token
    if (this.isTokenValid(this.cachedToken)) {
      return this.cachedToken!.accessToken;
    }

    // 从数据库加载
    const token = await this.loadToken();
    if (this.isTokenValid(token)) {
      return token!.accessToken;
    }

    return null;
  }

  /**
   * 检查Token是否有效
   */
  isTokenValid(token: TokenInfo | null): boolean {
    if (!token) return false;
    
    // 提前5分钟视为过期
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return token.expiresAt > now;
  }

  /**
   * 获取Token过期时间
   */
  getExpiresAt(): Date | null {
    return this.cachedToken?.expiresAt || null;
  }

  /**
   * 清除Token
   */
  async clearToken(): Promise<void> {
    this.cachedToken = null;
    try {
      await prisma.settings.update({
        where: { id: 'main' },
        data: {
          psAccessToken: null,
          psTokenExpiresAt: null,
        },
      });
    } catch (error) {
      console.error('Failed to clear token from database:', error);
    }
  }

  /**
   * 获取PowerSchool配置
   */
  async getConfig(): Promise<{
    endpoint: string;
    clientId: string;
    clientSecret: string;
    schoolId: number | null;
  } | null> {
    try {
      const settings = await prisma.settings.findUnique({
        where: { id: 'main' },
        select: {
          psEndpoint: true,
          psClientId: true,
          psClientSecret: true,
          psSchoolId: true,
        },
      });

      if (settings?.psEndpoint && settings?.psClientId && settings?.psClientSecret) {
        return {
          endpoint: settings.psEndpoint,
          clientId: settings.psClientId,
          clientSecret: settings.psClientSecret,
          schoolId: settings.psSchoolId,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to load PowerSchool config:', error);
      return null;
    }
  }

  /**
   * 使用Client Credentials获取新Token
   */
  async fetchNewToken(): Promise<TokenInfo> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('PowerSchool configuration not found');
    }

    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(`${config.endpoint}/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status} ${response.statusText}`);
    }

    const tokenResponse: PSTokenResponse = await response.json();
    return this.saveToken(tokenResponse);
  }

  /**
   * 确保有有效Token（如果没有则自动获取）
   */
  async ensureValidToken(): Promise<string> {
    const token = await this.getValidToken();
    if (token) {
      return token;
    }

    const newToken = await this.fetchNewToken();
    return newToken.accessToken;
  }
}

// 导出单例
export const tokenManager = TokenManager.getInstance();


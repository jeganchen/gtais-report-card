/**
 * PowerSchool HTTP客户端
 * 处理所有与PowerSchool API的HTTP通信
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { PSTokenResponse, PSApiResponse } from './types';

export interface PowerSchoolConfig {
  endpoint: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  tokenExpiresAt?: Date;
}

export class PowerSchoolClient {
  private axiosInstance: AxiosInstance;
  private config: PowerSchoolConfig;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(config: PowerSchoolConfig) {
    this.config = config;
    this.axiosInstance = this.createAxiosInstance();
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.endpoint,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加认证头
    instance.interceptors.request.use(
      async (config) => {
        const token = await this.getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器 - 处理错误
    instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // 401错误尝试刷新token后重试
        if (error.response?.status === 401 && error.config) {
          try {
            await this.refreshToken();
            const originalRequest = error.config;
            const token = await this.getValidToken();
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return this.axiosInstance.request(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * 获取有效的access token
   */
  private async getValidToken(): Promise<string | null> {
    if (this.isTokenValid()) {
      return this.config.accessToken || null;
    }
    return this.refreshToken();
  }

  /**
   * 检查token是否有效
   */
  private isTokenValid(): boolean {
    if (!this.config.accessToken || !this.config.tokenExpiresAt) {
      return false;
    }
    // 提前5分钟刷新
    const expiresAt = new Date(this.config.tokenExpiresAt);
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return expiresAt > now;
  }

  /**
   * 刷新access token
   */
  async refreshToken(): Promise<string> {
    // 防止并发刷新
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.doRefreshToken();
    
    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<string> {
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    try {
      const response = await axios.post<PSTokenResponse>(
        `${this.config.endpoint}/oauth/access_token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = response.data;
      
      // 更新config
      this.config.accessToken = access_token;
      this.config.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      return access_token;
    } catch (error) {
      console.error('Failed to refresh PowerSchool token:', error);
      throw new Error('Failed to authenticate with PowerSchool');
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PowerSchoolConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前token信息
   */
  getTokenInfo(): { token?: string; expiresAt?: Date } {
    return {
      token: this.config.accessToken,
      expiresAt: this.config.tokenExpiresAt,
    };
  }

  /**
   * GET请求
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<PSApiResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * POST请求
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<PSApiResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * PUT请求
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<PSApiResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * DELETE请求
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<PSApiResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * 调用PowerQuery Named Query (使用POST请求)
   */
  async executeNamedQuery<T>(
    queryName: string,
    params?: Record<string, string | number>
  ): Promise<T[]> {
    const url = `/ws/schema/query/${queryName}`;
    
    // 使用POST请求发送JSON body
    const response = await this.post<{ name: string; record: T[] }>(
      url, 
      params || {}
    );
    
    return response.data.record || [];
  }
}

// 单例实例
let clientInstance: PowerSchoolClient | null = null;

/**
 * 获取PowerSchool客户端实例
 */
export function getPowerSchoolClient(config?: PowerSchoolConfig): PowerSchoolClient {
  if (!clientInstance && config) {
    clientInstance = new PowerSchoolClient(config);
  }
  if (!clientInstance) {
    throw new Error('PowerSchool client not initialized');
  }
  return clientInstance;
}

/**
 * 初始化PowerSchool客户端
 */
export function initPowerSchoolClient(config: PowerSchoolConfig): PowerSchoolClient {
  clientInstance = new PowerSchoolClient(config);
  return clientInstance;
}

/**
 * 重置客户端实例（用于测试或重新配置）
 */
export function resetPowerSchoolClient(): void {
  clientInstance = null;
}


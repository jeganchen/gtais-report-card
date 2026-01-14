/**
 * 系统设置类型定义
 */

// PowerSchool 配置
export interface PowerSchoolSettings {
  endpoint: string;           // PowerSchool服务器URL
  clientId: string;
  clientSecret: string;
  accessToken?: string;       // OAuth access token
  tokenExpiresAt?: string;    // Token过期时间
  enabled: boolean;
}

// Office 365 / Azure AD 配置
export interface AzureADSettings {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  enabled: boolean;
}

// SMTP 邮件配置
export interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;           // true for 465, false for other ports
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

// 校长签名配置
export interface SignatureSettings {
  principalName: string;
  principalTitle: string;
  signatureImageUrl?: string;  // 签名图片URL
}

// 完整系统设置
export interface SystemSettings {
  powerSchool: PowerSchoolSettings;
  azureAD: AzureADSettings;
  smtp: SMTPSettings;
  signature: SignatureSettings;
  updatedAt?: string;
}

// 默认设置
export const defaultSettings: SystemSettings = {
  powerSchool: {
    endpoint: '',
    clientId: '',
    clientSecret: '',
    accessToken: undefined,
    tokenExpiresAt: undefined,
    enabled: false,
  },
  azureAD: {
    clientId: '',
    clientSecret: '',
    tenantId: '',
    enabled: false,
  },
  smtp: {
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'GTIIT School',
    enabled: false,
  },
  signature: {
    principalName: '',
    principalTitle: 'Principal',
    signatureImageUrl: undefined,
  },
};


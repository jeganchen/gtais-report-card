/**
 * 系统设置Mock数据
 */

import type { SignatureSettings } from '@/types';

// Mock签名设置 - 实际应用中从数据库或配置文件读取
export const mockSignatureSettings: SignatureSettings = {
  principalName: 'Dr. Sarah Johnson',
  principalTitle: 'School Director',
  signatureImageUrl: undefined,  // 暂无签名图片，使用签名线
};

// 获取签名设置
export function getSignatureSettings(): SignatureSettings {
  return mockSignatureSettings;
}


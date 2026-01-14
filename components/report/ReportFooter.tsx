'use client';

import Image from 'next/image';
import type { SchoolInfo, SignatureSettings } from '@/types';

interface ReportFooterProps {
  schoolInfo: SchoolInfo;
  signature?: SignatureSettings;
  generatedAt?: string;
}

export function ReportFooter({ schoolInfo, signature }: ReportFooterProps) {
  // 使用签名设置，如果没有则使用schoolInfo中的默认值
  const principalName = signature?.principalName || schoolInfo.principalName || '';
  const principalTitle = signature?.principalTitle || schoolInfo.principalTitle || 'Principal';
  const signatureImageUrl = signature?.signatureImageUrl;

  return (
    <div className="mt-6 pt-4 border-t-2 border-[#6b2d5b]">
      {/* 签名区域 */}
      <div className="flex justify-end mb-6">
        <div className="w-64 text-center">
          {/* 签名图片或签名线 */}
          {signatureImageUrl ? (
            <div className="h-16 mb-2 relative">
              <Image
                src={signatureImageUrl}
                alt="Principal Signature"
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="border-b border-[#8b3d75] h-16 mb-2"></div>
          )}
          
          {/* 校长姓名和职位 */}
          {principalName && (
            <p className="text-sm text-slate-900 font-medium">{principalName}</p>
          )}
          <p className="text-xs text-[#6b2d5b]">{principalTitle}</p>
        </div>
      </div>

      {/* 学校联系信息 */}
      <div className="text-center text-xs text-[#8b3d75] space-y-0.5">
        <p>{schoolInfo.address}</p>
        <p>
          Tel: {schoolInfo.phone} | Email: {schoolInfo.email}
        </p>
        {schoolInfo.website && <p>{schoolInfo.website}</p>}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import type { SignatureSettings } from '@/types';

interface ReportFooterProps {
  signature?: SignatureSettings;
  showSignature?: boolean;  // 是否显示签名区域
}

/**
 * Report Footer - 基于官方 AIS Letter Head 模板
 */
export function ReportFooter({ signature, showSignature = true }: ReportFooterProps) {
  const principalName = signature?.principalName || '';
  const principalTitle = signature?.principalTitle || 'Principal';
  const signatureImageUrl = signature?.signatureImageUrl;

  return (
    <div className="mt-6">
      {/* 签名区域 - 仅在最后一页显示 */}
      {showSignature && (
        <div className="flex justify-end mb-6">
          <div className="w-64 text-center">
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
              <div className="border-b border-[#545860] h-16 mb-2"></div>
            )}
            {principalName && (
              <p className="text-sm text-slate-900 font-medium">{principalName}</p>
            )}
            <p className="text-xs text-[#2E1A4A]">{principalTitle}</p>
          </div>
        </div>
      )}

      {/* 学校联系信息 - 基于 AIS Letter Head 模板 */}
      <div className="text-center border-t border-[#ED8C00] pt-3 space-y-1">
        <p className="text-sm text-[#2E1A4A]">
          www.gtais.org   |   [86] 754 - 8678 7111
        </p>
        <p className="text-sm text-[#2E1A4A]">
          No.66, Guangyi Road, Jinping District, Shantou, Guangdong
        </p>
        <p className="text-xs text-[#2E1A4A]">
          广东省汕头市金平区广以路66号
        </p>
      </div>
    </div>
  );
}

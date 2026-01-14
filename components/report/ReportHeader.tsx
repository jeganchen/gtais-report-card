'use client';

import Image from 'next/image';
import type { SchoolInfo } from '@/types';

interface ReportHeaderProps {
  schoolInfo: SchoolInfo;
}

export function ReportHeader({ schoolInfo }: ReportHeaderProps) {
  return (
    <div className="text-center pb-4 mb-4 border-b-2 border-[#6b2d5b]">
      {/* 学校Logo和名称 - 横向排列 */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {/* Logo */}
        <div className="w-16 h-16 flex-shrink-0">
          <Image
            src="/GTAIS.png"
            alt="GTIIT Logo"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </div>
        
        {/* 学校名称 */}
        <div className="text-left">
          <h1 className="text-lg font-bold text-[#6b2d5b] tracking-wide leading-tight">
            GTIIT AFFILIATED
          </h1>
          <h1 className="text-lg font-bold text-[#6b2d5b] tracking-wide leading-tight">
            INTERNATIONAL SCHOOL
          </h1>
          <p className="text-xs text-[#8b3d75] mt-0.5">
            {schoolInfo.nameChinese}
          </p>
        </div>
      </div>

      {/* 报告标题 */}
      <div className="mt-3">
        <h2 className="text-xl font-bold text-[#2d1226]">
          Student Progress Report
        </h2>
      </div>
    </div>
  );
}

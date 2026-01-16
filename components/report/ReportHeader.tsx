'use client';

import Image from 'next/image';

/**
 * Report Header - 使用官方 AIS Letter Head 信头图片
 */
export function ReportHeader() {
  return (
    <div className="mb-4">
      {/* 官方信头图片 */}
      <div className="relative w-full h-auto mb-3">
        <Image
          src="/letterhead-header.png"
          alt="GTAIS Letterhead"
          width={1200}
          height={153}
          className="w-full h-auto object-contain"
          priority
        />
      </div>

      {/* 报告标题 */}
      <div className="text-center border-b-2 border-[#ED8C00] pb-3">
        <h2 className="text-xl font-bold text-[#2E1A4A]">
          Student Progress Report
        </h2>
      </div>
    </div>
  );
}

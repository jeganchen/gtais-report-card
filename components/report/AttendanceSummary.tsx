'use client';

import type { AttendanceSummary as AttendanceSummaryType } from '@/types';

interface AttendanceSummaryProps {
  attendance: AttendanceSummaryType;
}

export function AttendanceSummary({ attendance }: AttendanceSummaryProps) {
  return (
    <div className="mb-4">
      <div className="overflow-hidden rounded border border-[#dbb3d3]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f5eaf3]">
              <th className="px-3 py-2 text-left font-semibold text-[#6b2d5b] border-r border-[#dbb3d3] w-24"></th>
              {attendance.quarters.map((q) => (
                <th
                  key={q.quarter}
                  className="px-3 py-2 text-center font-semibold text-[#6b2d5b] border-r border-[#dbb3d3] last:border-r-0 w-16"
                >
                  {q.quarter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#ebd5e7]">
              <td className="px-3 py-2 font-medium text-[#6b2d5b] border-r border-[#dbb3d3] bg-[#faf5f9]">
                Absent
              </td>
              {attendance.quarters.map((q) => (
                <td
                  key={`absent-${q.quarter}`}
                  className="px-3 py-2 text-center text-slate-900 border-r border-[#ebd5e7] last:border-r-0"
                >
                  {q.absent}
                </td>
              ))}
            </tr>
            <tr className="border-t border-[#ebd5e7]">
              <td className="px-3 py-2 font-medium text-[#6b2d5b] border-r border-[#dbb3d3] bg-[#faf5f9]">
                Tardy
              </td>
              {attendance.quarters.map((q) => (
                <td
                  key={`tardy-${q.quarter}`}
                  className="px-3 py-2 text-center text-slate-900 border-r border-[#ebd5e7] last:border-r-0"
                >
                  {q.tardy}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

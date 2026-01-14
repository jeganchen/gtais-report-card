'use client';

import type { StudentGrades, ScoreLevel } from '@/types';

interface SubjectGradesProps {
  grades: StudentGrades;
}

// 评分颜色映射 - 使用学校紫色主题
const scoreColors: Record<ScoreLevel, string> = {
  'E': 'bg-emerald-100 text-emerald-800 font-bold',
  'P': 'bg-[#f5eaf3] text-[#6b2d5b] font-bold',
  'A': 'bg-amber-100 text-amber-800 font-bold',
  'N': 'bg-red-100 text-red-800 font-bold',
  '-': 'bg-slate-100 text-slate-500',
};

export function SubjectGrades({ grades }: SubjectGradesProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-[#6b2d5b]">Student Progress Report</h3>

      {grades.subjects.map((subject) => (
        <div
          key={subject.id}
          className="overflow-hidden rounded border border-[#dbb3d3]"
        >
          {/* 学科表格 */}
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#f5eaf3]">
                <th className="px-3 py-2 text-left font-bold text-[#6b2d5b] border-r border-[#dbb3d3]">
                  {subject.name}
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#6b2d5b] border-r border-[#dbb3d3] w-12">
                  Q1
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#6b2d5b] border-r border-[#dbb3d3] w-12">
                  Q2
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#6b2d5b] border-r border-[#dbb3d3] w-12">
                  Q3
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#6b2d5b] w-12">
                  Q4
                </th>
              </tr>
            </thead>
            <tbody>
              {subject.standards.map((standard, idx) => (
                <tr
                  key={standard.id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-[#faf5f9]'}
                >
                  <td className="px-3 py-1.5 text-slate-700 border-r border-[#ebd5e7]">
                    {standard.name}
                  </td>
                  {standard.quarterScores.map((qs) => (
                    <td
                      key={qs.quarter}
                      className="px-2 py-1.5 text-center border-r border-[#ebd5e7] last:border-r-0"
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${scoreColors[qs.score]}`}
                      >
                        {qs.score}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

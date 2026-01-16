'use client';

import type { StudentGrades } from '@/types';

interface SubjectGradesProps {
  grades: StudentGrades;
}

export function SubjectGrades({ grades }: SubjectGradesProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-[#2E1A4A]">Student Progress Report</h3>

      {grades.subjects.map((subject) => (
        <div
          key={subject.id}
          className="overflow-hidden rounded border border-[#d7cfdf]"
        >
          {/* 学科表格 */}
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#f5f3f7]">
                <th className="px-3 py-2 text-left font-bold text-[#2E1A4A] border-r border-[#d7cfdf]">
                  {subject.name}
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#2E1A4A] border-r border-[#d7cfdf] w-12">
                  Q1
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#2E1A4A] border-r border-[#d7cfdf] w-12">
                  Q2
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#2E1A4A] border-r border-[#d7cfdf] w-12">
                  Q3
                </th>
                <th className="px-2 py-2 text-center font-semibold text-[#2E1A4A] w-12">
                  Q4
                </th>
              </tr>
            </thead>
            <tbody>
              {subject.standards.map((standard, idx) => (
                <tr
                  key={standard.id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f3f7]'}
                >
                  <td className="px-3 py-1.5 text-slate-700 border-r border-[#d7cfdf]">
                    {standard.name}
                  </td>
                  {standard.quarterScores.map((qs) => (
                    <td
                      key={qs.quarter}
                      className="px-2 py-1.5 text-center border-r border-[#d7cfdf] last:border-r-0"
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-[#2E1A4A]">
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

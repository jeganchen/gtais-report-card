'use client';

import { SCORE_DEFINITIONS, type ScoreLevel } from '@/types/grade';

export function AssessmentKey() {
  const scores: ScoreLevel[] = ['E', 'P', 'A', 'N', '-'];

  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-[#6b2d5b] mb-2">Assessment Key</h3>
      <div className="overflow-hidden rounded border border-[#dbb3d3]">
        <table className="w-full text-xs">
          <tbody>
            {scores.map((score) => (
              <tr key={score} className="border-t border-[#ebd5e7] first:border-t-0">
                <td className="px-3 py-1.5 font-bold text-[#6b2d5b] bg-[#f5eaf3] w-8 text-center border-r border-[#dbb3d3]">
                  {score}
                </td>
                <td className="px-3 py-1.5 text-slate-600">
                  <span className="font-semibold text-[#5a274c]">{SCORE_DEFINITIONS[score].label}:</span>{' '}
                  {SCORE_DEFINITIONS[score].description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

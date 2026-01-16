'use client';

import { SCORE_DEFINITIONS, type ScoreLevel } from '@/types/grade';

export function AssessmentKey() {
  const scores: ScoreLevel[] = ['E', 'P', 'A', 'N', '-'];

  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-[#2E1A4A] mb-2">Assessment Key</h3>
      <div className="overflow-hidden rounded border border-[#d7cfdf]">
        <table className="w-full text-xs">
          <tbody>
            {scores.map((score) => (
              <tr key={score} className="border-t border-[#d7cfdf] first:border-t-0">
                <td className="px-3 py-1.5 font-bold text-[#2E1A4A] bg-[#f5f3f7] w-8 text-center border-r border-[#d7cfdf]">
                  {score}
                </td>
                <td className="px-3 py-1.5 text-slate-600">
                  <span className="font-semibold text-[#545860]">{SCORE_DEFINITIONS[score].label}:</span>{' '}
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

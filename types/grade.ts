/**
 * 成绩/评价信息类型定义
 * 基于真实Report Card样本调整
 */

import type { Quarter } from './attendance';

// 评分等级 - 基于样本的Assessment Key
export type ScoreLevel = 'E' | 'P' | 'A' | 'N' | '-';

export const SCORE_DEFINITIONS = {
  'E': {
    label: 'Exemplary',
    description: 'The student has demonstrated understanding and/or performance that is consistently above the grade-level standard',
  },
  'P': {
    label: 'Proficient',
    description: 'The student has demonstrated understanding and/or performance that is consistently at the grade-level standard',
  },
  'A': {
    label: 'Approaching',
    description: 'The student has demonstrated partial understanding and/or performance and is approaching the grade-level standard',
  },
  'N': {
    label: 'Not Yet',
    description: 'The student has not yet demonstrated grade-level understanding and/or performance',
  },
  '-': {
    label: 'N/A',
    description: 'Has not been taught or assessed in a formal manner, or does not apply to student',
  },
} as const;

export interface QuarterScore {
  quarter: Quarter;
  score: ScoreLevel;
}

export interface Standard {
  id: string;
  name: string;               // Standard描述
  quarterScores: QuarterScore[];
}

export interface Subject {
  id: string;
  name: string;               // 学科名称
  standards: Standard[];
}

export interface StudentGrades {
  studentId: string;
  schoolYear: string;
  subjects: Subject[];
}

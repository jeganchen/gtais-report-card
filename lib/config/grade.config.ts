/**
 * 年级配置
 * 定义年级数字到显示名称的映射关系
 */

// 年级映射配置
export const GRADE_LEVEL_MAP: Record<number, string> = {
  [-2]: 'PK2',
  [-1]: 'PK1',
  [0]: 'K',
  [1]: '1',
  [2]: '2',
  [3]: '3',
  [4]: '4',
  [5]: '5',
  [6]: '6',
  [7]: '7',
  [8]: '8',
  [9]: '9',
  [10]: '10',
  [11]: '11',
  [12]: '12',
  [13]: '13',
};

// 年级简称映射（用于紧凑显示）
export const GRADE_LEVEL_SHORT_MAP: Record<number, string> = {
  [-2]: 'PK2',
  [-1]: 'PK1',
  [0]: 'K',
  [1]: 'G1',
  [2]: 'G2',
  [3]: 'G3',
  [4]: 'G4',
  [5]: 'G5',
  [6]: 'G6',
  [7]: 'G7',
  [8]: 'G8',
  [9]: 'G9',
  [10]: 'G10',
  [11]: 'G11',
  [12]: 'G12',
  [13]: 'G13',
};

/**
 * 获取年级显示名称
 * @param gradeLevel 年级数字
 * @param useShort 是否使用简称
 * @returns 年级显示名称
 */
export function getGradeLevelName(gradeLevel: number, useShort = false): string {
  if (useShort) {
    return GRADE_LEVEL_SHORT_MAP[gradeLevel] || `G${gradeLevel}`;
  }
  return GRADE_LEVEL_MAP[gradeLevel] || `Grade ${gradeLevel}`;
}

/**
 * 获取所有有效年级列表（用于下拉框）
 * @returns 年级选项数组
 */
export function getGradeLevelOptions(): Array<{ value: number; label: string }> {
  return Object.entries(GRADE_LEVEL_MAP)
    .map(([value, label]) => ({
      value: parseInt(value, 10),
      label,
    }))
    .sort((a, b) => a.value - b.value);
}

/**
 * 检查是否为有效年级
 * @param gradeLevel 年级数字
 * @returns 是否有效
 */
export function isValidGradeLevel(gradeLevel: number): boolean {
  return gradeLevel in GRADE_LEVEL_MAP;
}

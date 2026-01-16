/**
 * GTAIS 学校官方色卡配置
 * 基于学校提供的品牌色彩指南
 */

// Primary Colors - 主色
export const PRIMARY_COLORS = {
  primary: '#2E1A4A',        // 深紫色 - PANTONE 2695 C
  primaryLight: '#3d2563',
  primaryDark: '#1f1132',
  accent: '#ED8C00',         // 橙色 - PANTONE 144 C
  accentLight: '#f5a633',
  accentDark: '#c47400',
};

// Secondary Colors - 次色
export const SECONDARY_COLORS = {
  purple: '#260D66',         // 深紫罗兰 - PANTONE 269 C
  magenta: '#920783',        // 紫红色 - PANTONE 2355 C
  blue: '#1D418E',           // 深蓝色 - PANTONE 7687 C
  indigo: '#30299A',         // 靛蓝色 - PANTONE 2370 C
};

// Grayscale - 灰度色
export const GRAYSCALE = {
  black: '#2C2A29',          // 黑色 - PANTONE Process Black C
  grayDark: '#545860',       // 深灰 - PANTONE Cool Grey 11C
  gray: '#A7A9B4',           // 中灰 - PANTONE Cool Grey 6C
  grayLight: '#D9DAE4',      // 浅灰 - PANTONE Cool Grey 1C
  white: '#FFFFFF',
};

// UI Colors - 界面颜色（基于主色生成的色阶）
export const UI_COLORS = {
  primary50: '#f5f3f7',
  primary100: '#ebe7ef',
  primary200: '#d7cfdf',
  primary300: '#b9aac5',
  primary400: '#9580a6',
  primary500: '#7a5f8c',
  primary600: '#654a74',
  primary700: '#2E1A4A',     // 主色
  primary800: '#241539',
  primary900: '#1a0f2a',
  primary950: '#0f091a',
};

// 语义化颜色
export const SEMANTIC_COLORS = {
  success: '#059669',        // 成功 - 绿色
  successBg: '#d1fae5',
  warning: '#d97706',        // 警告 - 琥珀色
  warningBg: '#fef3c7',
  error: '#dc2626',          // 错误 - 红色
  errorBg: '#fee2e2',
  info: '#1D418E',           // 信息 - 使用次色蓝
  infoBg: '#dbeafe',
};

// PDF 报告专用颜色
export const PDF_COLORS = {
  primary: PRIMARY_COLORS.primary,
  primaryLight: '#3d2563',
  primaryBg: '#f5f3f7',
  primaryBorder: '#d7cfdf',
  accent: PRIMARY_COLORS.accent,
  white: GRAYSCALE.white,
  gray: GRAYSCALE.gray,
  grayDark: GRAYSCALE.grayDark,
  grayLight: GRAYSCALE.grayLight,
  black: GRAYSCALE.black,
  // 成绩颜色
  scoreE: { bg: '#d1fae5', text: '#059669' },  // Exceeding
  scoreP: { bg: '#f5f3f7', text: PRIMARY_COLORS.primary },  // Proficient
  scoreA: { bg: '#fef3c7', text: '#d97706' },  // Approaching
  scoreN: { bg: '#fee2e2', text: '#dc2626' },  // Needs Improvement
};

// 导出完整的颜色配置
export const COLORS = {
  primary: PRIMARY_COLORS,
  secondary: SECONDARY_COLORS,
  grayscale: GRAYSCALE,
  ui: UI_COLORS,
  semantic: SEMANTIC_COLORS,
  pdf: PDF_COLORS,
};

// Tailwind CSS 类名映射（用于组件）
export const COLOR_CLASSES = {
  // 背景色
  bgPrimary: 'bg-[#2E1A4A]',
  bgPrimaryLight: 'bg-[#f5f3f7]',
  bgAccent: 'bg-[#ED8C00]',
  bgGrayLight: 'bg-[#D9DAE4]',
  
  // 文本色
  textPrimary: 'text-[#2E1A4A]',
  textAccent: 'text-[#ED8C00]',
  textBlack: 'text-[#2C2A29]',
  textGray: 'text-[#545860]',
  textGrayLight: 'text-[#A7A9B4]',
  
  // 边框色
  borderPrimary: 'border-[#2E1A4A]',
  borderGray: 'border-[#D9DAE4]',
  
  // 悬停色
  hoverBgPrimary: 'hover:bg-[#3d2563]',
  hoverBgAccent: 'hover:bg-[#c47400]',
};

export default COLORS;

/**
 * 库模块统一导出
 */

// 数据库
export * from './database';

// PowerSchool（排除已在database中导出的PowerSchoolConfig）
export { 
  PowerSchoolClient, 
  getPowerSchoolClient, 
  initPowerSchoolClient, 
  resetPowerSchoolClient,
  TokenManager, 
  tokenManager,
  StudentsAPI, 
  GradesAPI, 
  AttendanceAPI, 
  SchoolsAPI,
  createPowerSchoolAPI,
  type TokenInfo,
  type AttendanceSummary,
  type PowerSchoolAPI,
} from './powerschool';

// PowerSchool类型（从types导出）
export type {
  PSStudent,
  PSAttendance,
  PSGrade,
  PSSchoolYear,
  PSContactInfo,
} from './powerschool/types';

// 服务
export * from './services';

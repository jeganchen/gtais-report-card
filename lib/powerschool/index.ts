/**
 * PowerSchool模块入口
 */

// 客户端
export { 
  PowerSchoolClient, 
  getPowerSchoolClient, 
  initPowerSchoolClient, 
  resetPowerSchoolClient,
  type PowerSchoolConfig 
} from './client';

// Token管理
export { TokenManager, tokenManager, type TokenInfo } from './token-manager';

// API
export { StudentsAPI, GradesAPI, AttendanceAPI, SchoolsAPI } from './api';
export type { AttendanceSummary } from './api';

// 类型
export * from './types';

// 转换器
export * from './transformer';

// 便捷方法 - 创建带所有API的客户端
import { PowerSchoolClient, type PowerSchoolConfig } from './client';
import { StudentsAPI, GradesAPI, AttendanceAPI, SchoolsAPI } from './api';

export interface PowerSchoolAPI {
  client: PowerSchoolClient;
  students: StudentsAPI;
  grades: GradesAPI;
  attendance: AttendanceAPI;
  schools: SchoolsAPI;
}

export function createPowerSchoolAPI(config: PowerSchoolConfig): PowerSchoolAPI {
  const client = new PowerSchoolClient(config);
  
  return {
    client,
    students: new StudentsAPI(client),
    grades: new GradesAPI(client),
    attendance: new AttendanceAPI(client),
    schools: new SchoolsAPI(client),
  };
}


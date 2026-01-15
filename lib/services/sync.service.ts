/**
 * 数据同步服务
 * 负责从PowerSchool同步数据到本地数据库
 * 同步接口后续会逐个提供
 */

import { settingsRepository, syncLogRepository, schoolRepository, termRepository, teacherRepository, studentRepository, type SyncType } from '../database/repositories';
import { tokenManager } from '../powerschool/token-manager';
import type { SyncDataType, SyncResult } from '@/types/powerschool';

export class SyncService {
  private endpoint: string | null = null;
  private accessToken: string | null = null;
  private schoolId: number | null = null;

  /**
   * 初始化配置
   * 如果 token 过期，自动刷新并保存到数据库
   */
  private async initConfig(): Promise<void> {
    const config = await settingsRepository.getPowerSchoolConfig();
    
    if (!config.endpoint || !config.clientId || !config.clientSecret) {
      throw new Error('PowerSchool configuration is incomplete');
    }
    
    // 使用 tokenManager 确保有有效 token（过期会自动刷新并保存到数据库）
    try {
      this.accessToken = await tokenManager.ensureValidToken();
    } catch (error) {
      console.error('Failed to get valid token:', error);
      throw new Error('Failed to obtain valid PowerSchool access token. Please check your configuration.');
    }
    
    this.endpoint = config.endpoint.replace(/\/+$/, '');
    this.schoolId = config.schoolId;
  }

  /**
   * 执行PowerSchool Named Query
   * 如果返回 401，自动刷新 token 并重试一次
   */
  private async executeQuery<T>(queryName: string, params: Record<string, unknown> = {}, isRetry = false): Promise<T> {
    await this.initConfig();
    
    const url = `${this.endpoint}/ws/schema/query/${queryName}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(params),
    });
    
    // 如果返回 401 且不是重试，则刷新 token 并重试
    if (response.status === 401 && !isRetry) {
      console.log('[SyncService] Token expired, refreshing...');
      try {
        const newToken = await tokenManager.fetchNewToken();
        this.accessToken = newToken.accessToken;
        console.log('[SyncService] Token refreshed successfully, retrying request...');
        return this.executeQuery<T>(queryName, params, true);
      } catch (refreshError) {
        console.error('[SyncService] Failed to refresh token:', refreshError);
        throw new Error('PowerSchool access token expired and refresh failed.');
      }
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PowerSchool API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  }

  /**
   * 同步学校数据
   */
  async syncSchools(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'schools';
    const log = await syncLogRepository.create('schools');
    
    try {
      await syncLogRepository.start(log.id);
      await this.initConfig();
      
      // 调用 PowerSchool API 获取学校数据
      const data = await this.executeQuery<{
        name: string;
        record: Array<{
          id: number;
          tables: {
            schools: {
              id: string;
              dcid: string;
              name: string;
              abbreviation: string;
              school_number: string;
            };
          };
        }>;
      }>('org.infocare.sync.schools');
      
      // 解析并保存学校数据
      const schoolsToSave = data.record.map((record) => {
        const school = record.tables.schools;
        return {
          psId: parseInt(school.id, 10),
          psDcid: parseInt(school.dcid, 10),
          name: school.name,
          abbreviation: school.abbreviation || undefined,
          schoolNumber: school.school_number || undefined,
        };
      });
      
      // 批量保存到数据库
      await schoolRepository.upsertMany(schoolsToSave);
      
      const duration = Date.now() - startTime;
      await syncLogRepository.complete(log.id, schoolsToSave.length);
      
      return {
        success: true,
        type,
        recordCount: schoolsToSave.length,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await syncLogRepository.fail(log.id, errorMsg);
      
      return {
        success: false,
        type,
        recordCount: 0,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步学期数据
   */
  async syncTerms(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'terms';
    const log = await syncLogRepository.create('terms');
    
    try {
      await syncLogRepository.start(log.id);
      await this.initConfig();
      
      if (!this.schoolId) {
        throw new Error('School ID not configured');
      }
      
      // 确保学校存在
      let school = await schoolRepository.findByPsId(this.schoolId);
      if (!school) {
        school = await schoolRepository.upsert({
          psId: this.schoolId,
          name: `School ${this.schoolId}`,
        });
      }
      
      // 调用 PowerSchool API 获取学期数据
      const data = await this.executeQuery<{
        name: string;
        record: Array<{
          id: number;
          tables: {
            terms: {
              id: string;
              dcid: string;
              name: string;
              abbreviation: string;
              firstday: string;
              lastday: string;
              yearid: string;
              schoolid: string;
              isyearrec: string;
            };
          };
        }>;
      }>('org.infocare.sync.terms', { schoolid: this.schoolId });
      
      // 解析并保存学期数据
      const termsToSave = data.record.map((record) => {
        const term = record.tables.terms;
        return {
          psId: parseInt(term.id, 10),
          psDcid: parseInt(term.dcid, 10),
          name: term.name,
          abbreviation: term.abbreviation || undefined,
          firstDay: new Date(term.firstday),
          lastDay: new Date(term.lastday),
          yearId: parseInt(term.yearid, 10),
          isYearRec: term.isyearrec === '1',
          schoolId: school!.id,
        };
      });
      
      // 批量保存到数据库
      await termRepository.upsertMany(termsToSave);
      
      // 设置当前学期
      const now = new Date();
      let currentTermSet = false;
      
      // 优先设置学年记录为当前
      const yearRecords = termsToSave.filter(t => t.isYearRec);
      for (const term of yearRecords) {
        if (now >= term.firstDay && now <= term.lastDay) {
          const dbTerm = await termRepository.findByPsId(term.psId);
          if (dbTerm) {
            await termRepository.setCurrent(dbTerm.id);
            currentTermSet = true;
            break;
          }
        }
      }
      
      // 如果没设置，尝试任何包含当前日期的学期
      if (!currentTermSet) {
        for (const term of termsToSave) {
          if (now >= term.firstDay && now <= term.lastDay) {
            const dbTerm = await termRepository.findByPsId(term.psId);
            if (dbTerm) {
              await termRepository.setCurrent(dbTerm.id);
              currentTermSet = true;
              break;
            }
          }
        }
      }
      
      const duration = Date.now() - startTime;
      await syncLogRepository.complete(log.id, termsToSave.length);
      
      return {
        success: true,
        type,
        recordCount: termsToSave.length,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await syncLogRepository.fail(log.id, errorMsg);
      
      return {
        success: false,
        type,
        recordCount: 0,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步教师数据
   */
  async syncTeachers(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'teachers';
    const log = await syncLogRepository.create('teachers');
    
    try {
      await syncLogRepository.start(log.id);
      await this.initConfig();
      
      // 调用 PowerSchool API 获取教师数据
      const data = await this.executeQuery<{
        name: string;
        record: Array<{
          id: number;
          tables: {
            teachers: {
              id: string;
              dcid: string;
              first_name: string;
              last_name: string;
              lastfirst: string;
              email_addr: string;
              schoolid: string;
              staffstatus: string;
            };
          };
        }>;
      }>('org.infocare.sync.teachers');
      
      // 按schoolId分组教师，并确保每个学校存在
      const teachersBySchool = new Map<number, typeof data.record>();
      for (const record of data.record) {
        const schoolId = parseInt(record.tables.teachers.schoolid, 10);
        if (!teachersBySchool.has(schoolId)) {
          teachersBySchool.set(schoolId, []);
        }
        teachersBySchool.get(schoolId)!.push(record);
      }

      // 确保所有涉及的学校存在
      const schoolMap = new Map<number, string>();
      for (const psSchoolId of teachersBySchool.keys()) {
        let school = await schoolRepository.findByPsId(psSchoolId);
        if (!school) {
          school = await schoolRepository.upsert({
            psId: psSchoolId,
            name: psSchoolId === 0 ? 'District Office' : `School ${psSchoolId}`,
          });
        }
        schoolMap.set(psSchoolId, school.id);
      }

      // 解析并保存教师数据
      const teachersToSave = data.record.map((record) => {
        const teacher = record.tables.teachers;
        const psSchoolId = parseInt(teacher.schoolid, 10);
        return {
          psId: parseInt(teacher.id, 10),
          psDcid: parseInt(teacher.dcid, 10),
          firstName: teacher.first_name,
          lastName: teacher.last_name,
          lastFirst: teacher.lastfirst || undefined,
          email: teacher.email_addr || undefined,
          staffStatus: teacher.staffstatus ? parseInt(teacher.staffstatus, 10) : undefined,
          isActive: teacher.staffstatus === '1',
          schoolId: schoolMap.get(psSchoolId)!,
        };
      });
      
      // 批量保存到数据库
      await teacherRepository.upsertMany(teachersToSave);
      
      const duration = Date.now() - startTime;
      await syncLogRepository.complete(log.id, teachersToSave.length);
      
      return {
        success: true,
        type,
        recordCount: teachersToSave.length,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await syncLogRepository.fail(log.id, errorMsg);
      
      return {
        success: false,
        type,
        recordCount: 0,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步学生数据
   */
  async syncStudents(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'students';
    const log = await syncLogRepository.create('students');
    
    try {
      await syncLogRepository.start(log.id);
      await this.initConfig();
      
      if (!this.schoolId) {
        throw new Error('School ID not configured');
      }
      
      // 确保学校存在
      let school = await schoolRepository.findByPsId(this.schoolId);
      if (!school) {
        school = await schoolRepository.upsert({
          psId: this.schoolId,
          name: `School ${this.schoolId}`,
        });
      }
      
      // 调用 PowerSchool API 获取学生数据
      const data = await this.executeQuery<{
        name: string;
        record: Array<{
          id: number;
          tables: {
            students: {
              id: string;
              dcid: string;
              student_number: string;
              first_name: string;
              last_name: string;
              middle_name: string | null;
              gender: string | null;
              grade_level: string;
              schoolid: string;
              home_room: string | null;
              enroll_status: string;
              entrydate: string | null;
              exitdate: string | null;
              dob: string | null;
              family_ident: string | null;
              street: string | null;
              city: string | null;
              home_phone: string | null;
              guardianemail: string | null;
            };
          };
        }>;
      }>('org.infocare.sync.students', { schoolid: this.schoolId });
      
      // 解析并保存学生数据
      const studentsToSave = data.record.map((record) => {
        const student = record.tables.students;
        return {
          psId: parseInt(student.id, 10),
          psDcid: parseInt(student.dcid, 10),
          studentNumber: student.student_number,
          firstName: student.first_name,
          lastName: student.last_name,
          middleName: student.middle_name || undefined,
          gender: student.gender || undefined,
          gradeLevel: parseInt(student.grade_level, 10),
          homeRoom: student.home_room || undefined,
          enrollStatus: student.enroll_status ? parseInt(student.enroll_status, 10) : undefined,
          entryDate: student.entrydate ? new Date(student.entrydate) : undefined,
          exitDate: student.exitdate ? new Date(student.exitdate) : undefined,
          dob: student.dob && student.dob !== '' ? new Date(student.dob) : undefined,
          familyIdent: student.family_ident ? parseInt(student.family_ident, 10) : undefined,
          street: student.street || undefined,
          city: student.city || undefined,
          homePhone: student.home_phone || undefined,
          guardianEmail: student.guardianemail || undefined,
          schoolId: school!.id,
        };
      });
      
      // 批量保存到数据库
      await studentRepository.upsertMany(studentsToSave);
      
      const duration = Date.now() - startTime;
      await syncLogRepository.complete(log.id, studentsToSave.length);
      
      return {
        success: true,
        type,
        recordCount: studentsToSave.length,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await syncLogRepository.fail(log.id, errorMsg);
      
      return {
        success: false,
        type,
        recordCount: 0,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步课程数据
   * TODO: 实现具体的同步逻辑
   */
  async syncCourses(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'courses';
    
    try {
      await this.initConfig();
      
      // TODO: 调用 PowerSchool API 获取课程数据并保存
      
      return {
        success: true,
        type,
        recordCount: 0,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        type,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步课节数据
   * TODO: 实现具体的同步逻辑
   */
  async syncSections(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'sections';
    
    try {
      await this.initConfig();
      
      // TODO: 调用 PowerSchool API 获取课节数据并保存
      
      return {
        success: true,
        type,
        recordCount: 0,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        type,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步成绩数据
   * TODO: 实现具体的同步逻辑
   */
  async syncGrades(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'grades';
    const log = await syncLogRepository.create('grades');
    
    try {
      await syncLogRepository.start(log.id);
      await this.initConfig();
      
      // TODO: 调用 PowerSchool API 获取成绩数据并保存
      
      const duration = Date.now() - startTime;
      await syncLogRepository.complete(log.id, 0);
      
      return {
        success: true,
        type,
        recordCount: 0,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await syncLogRepository.fail(log.id, errorMsg);
      
      return {
        success: false,
        type,
        recordCount: 0,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步考勤数据
   * TODO: 实现具体的同步逻辑
   */
  async syncAttendance(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'attendance';
    const log = await syncLogRepository.create('attendance');
    
    try {
      await syncLogRepository.start(log.id);
      await this.initConfig();
      
      // TODO: 调用 PowerSchool API 获取考勤数据并保存
      
      const duration = Date.now() - startTime;
      await syncLogRepository.complete(log.id, 0);
      
      return {
        success: true,
        type,
        recordCount: 0,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await syncLogRepository.fail(log.id, errorMsg);
      
      return {
        success: false,
        type,
        recordCount: 0,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步所有考勤数据（保持向后兼容）
   */
  async syncAllAttendance(): Promise<SyncResult> {
    return this.syncAttendance();
  }

  /**
   * 同步联系人数据
   * TODO: 实现具体的同步逻辑
   */
  async syncContacts(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'contacts';
    
    try {
      await this.initConfig();
      
      // TODO: 调用 PowerSchool API 获取联系人数据并保存
      
      return {
        success: true,
        type,
        recordCount: 0,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        type,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 同步学年数据（保持向后兼容的别名）
   */
  async syncSchoolYears(): Promise<SyncResult> {
    return this.syncTerms();
  }

  /**
   * 完整同步
   */
  async syncAll(): Promise<SyncResult> {
    const startTime = Date.now();
    const type: SyncDataType = 'full';
    const log = await syncLogRepository.create('full');
    
    try {
      await syncLogRepository.start(log.id);
      
      // 检查是否有正在运行的同步
      const isRunning = await syncLogRepository.isRunning();
      if (isRunning) {
        throw new Error('A sync is already in progress');
      }
      
      const results: SyncResult[] = [];
      
      // 按顺序同步各类数据
      // 1. 基础数据
      results.push(await this.syncSchools());
      results.push(await this.syncTerms());
      results.push(await this.syncTeachers());
      
      // 2. 学生数据
      results.push(await this.syncStudents());
      
      // 3. 课程数据
      results.push(await this.syncCourses());
      results.push(await this.syncSections());
      
      // 4. 成绩和考勤
      results.push(await this.syncGrades());
      results.push(await this.syncAttendance());
      
      // 5. 联系人
      results.push(await this.syncContacts());
      
      const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);
      const duration = Date.now() - startTime;
      
      const hasErrors = results.some(r => !r.success);
      
      if (hasErrors) {
        const errors = results
          .filter(r => !r.success)
          .map(r => `${r.type}: ${r.error}`)
          .join('; ');
        
        await syncLogRepository.fail(log.id, errors);
        
        return {
          success: false,
          type,
          recordCount: totalRecords,
          duration,
          error: errors,
        };
      }
      
      await syncLogRepository.complete(log.id, totalRecords);
      
      return {
        success: true,
        type,
        recordCount: totalRecords,
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await syncLogRepository.fail(log.id, errorMsg);
      
      return {
        success: false,
        type,
        recordCount: 0,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus() {
    const [latest, isRunning, stats] = await Promise.all([
      syncLogRepository.getLatest(),
      syncLogRepository.isRunning(),
      syncLogRepository.getStats(),
    ]);
    
    return {
      isRunning,
      lastSync: latest,
      stats,
    };
  }

  /**
   * 获取PowerSchool配置状态
   */
  async getConfigStatus() {
    const config = await settingsRepository.getPowerSchoolConfig();
    
    return {
      isConfigured: !!(config.endpoint && config.clientId && config.clientSecret),
      hasToken: !!config.accessToken,
      tokenExpired: config.tokenExpiresAt ? new Date(config.tokenExpiresAt) < new Date() : true,
      schoolId: config.schoolId,
    };
  }
}

// 导出单例
export const syncService = new SyncService();

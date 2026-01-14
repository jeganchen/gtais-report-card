/**
 * PowerSchool 考勤API
 */

import { PowerSchoolClient } from '../client';
import { PSAttendance, PSAttendanceCode, PSTerm } from '../types';

export interface AttendanceSummary {
  quarter: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  tardyCount: number;
}

export class AttendanceAPI {
  constructor(private client: PowerSchoolClient) {}

  /**
   * 获取考勤代码
   */
  async getAttendanceCodes(schoolId: number): Promise<PSAttendanceCode[]> {
    try {
      const records = await this.client.executeNamedQuery<PSAttendanceCode>(
        'org.infocare.attendance.codes',
        { schoolid: schoolId }
      );
      return records;
    } catch (error) {
      console.error('Failed to fetch attendance codes:', error);
      return [];
    }
  }

  /**
   * 获取学生考勤记录
   */
  async getStudentAttendance(
    studentId: number, 
    startDate?: string, 
    endDate?: string
  ): Promise<PSAttendance[]> {
    try {
      const params: Record<string, string | number> = { studentid: studentId };
      if (startDate) params.startdate = startDate;
      if (endDate) params.enddate = endDate;
      
      const records = await this.client.executeNamedQuery<PSAttendance>(
        'org.infocare.student.attendance',
        params
      );
      return records;
    } catch (error) {
      console.error(`Failed to fetch attendance for student ${studentId}:`, error);
      return [];
    }
  }

  /**
   * 获取学期列表
   */
  async getTerms(schoolId: number): Promise<PSTerm[]> {
    try {
      const records = await this.client.executeNamedQuery<PSTerm>(
        'org.infocare.school.years',
        { schoolid: schoolId }
      );
      return records;
    } catch (error) {
      console.error('Failed to fetch terms:', error);
      return [];
    }
  }

  /**
   * 计算考勤统计
   */
  async getStudentAttendanceSummary(
    studentId: number,
    schoolId: number,
    yearId: number
  ): Promise<AttendanceSummary[]> {
    // 获取学期信息
    const terms = await this.getTerms(schoolId);
    const yearTerms = terms.filter(t => t.yearid === yearId && !t.name.includes('Year'));
    
    // 获取考勤代码
    const codes = await this.getAttendanceCodes(schoolId);
    const absentCodes = codes
      .filter(c => c.presence_status_cd === 'Absent')
      .map(c => c.code);
    const tardyCodes = codes
      .filter(c => c.presence_status_cd === 'Tardy')
      .map(c => c.code);
    
    const summaries: AttendanceSummary[] = [];
    
    for (const term of yearTerms) {
      // 获取该学期的考勤记录
      const attendance = await this.getStudentAttendance(
        studentId,
        term.firstday,
        term.lastday
      );
      
      // 统计
      let absentDays = 0;
      let tardyCount = 0;
      
      for (const record of attendance) {
        if (absentCodes.includes(record.att_code)) {
          absentDays++;
        }
        if (tardyCodes.includes(record.att_code)) {
          tardyCount++;
        }
      }
      
      // 计算学期天数
      const firstDay = new Date(term.firstday);
      const lastDay = new Date(term.lastday);
      const totalDays = Math.ceil((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24));
      
      summaries.push({
        quarter: term.abbreviation || term.name,
        totalDays,
        presentDays: totalDays - absentDays,
        absentDays,
        tardyCount,
      });
    }
    
    return summaries;
  }

  /**
   * 获取按日期范围的考勤统计
   */
  async getAttendanceByDateRange(
    studentId: number,
    schoolId: number,
    startDate: string,
    endDate: string
  ): Promise<{ absent: number; tardy: number }> {
    const attendance = await this.getStudentAttendance(studentId, startDate, endDate);
    const codes = await this.getAttendanceCodes(schoolId);
    
    const absentCodes = codes
      .filter(c => c.presence_status_cd === 'Absent')
      .map(c => c.code);
    const tardyCodes = codes
      .filter(c => c.presence_status_cd === 'Tardy')
      .map(c => c.code);
    
    let absent = 0;
    let tardy = 0;
    
    for (const record of attendance) {
      if (absentCodes.includes(record.att_code)) absent++;
      if (tardyCodes.includes(record.att_code)) tardy++;
    }
    
    return { absent, tardy };
  }
}


/**
 * PowerSchool 学校和学年API
 */

import { PowerSchoolClient } from '../client';
import { PSSchool, PSTerm } from '../types';

export class SchoolsAPI {
  constructor(private client: PowerSchoolClient) {}

  /**
   * 获取学校信息
   */
  async getSchool(schoolId: number): Promise<PSSchool | null> {
    try {
      const response = await this.client.get<{ school: PSSchool }>(
        `/ws/v1/school/${schoolId}`
      );
      return response.data.school;
    } catch (error) {
      console.error(`Failed to fetch school ${schoolId}:`, error);
      return null;
    }
  }

  /**
   * 获取所有学校
   */
  async getAllSchools(): Promise<PSSchool[]> {
    try {
      const response = await this.client.get<{ schools: { school: PSSchool[] } }>(
        '/ws/v1/district/school'
      );
      return response.data.schools?.school || [];
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      return [];
    }
  }

  /**
   * 获取学年列表
   */
  async getSchoolYears(schoolId: number): Promise<PSTerm[]> {
    try {
      const records = await this.client.executeNamedQuery<PSTerm>(
        'org.infocare.school.years',
        { schoolid: schoolId }
      );
      return records;
    } catch (error) {
      console.error('Failed to fetch school years:', error);
      return [];
    }
  }

  /**
   * 获取当前学年
   */
  async getCurrentSchoolYear(schoolId: number): Promise<PSTerm | null> {
    const years = await this.getSchoolYears(schoolId);
    const now = new Date();
    
    for (const year of years) {
      const firstDay = new Date(year.firstday);
      const lastDay = new Date(year.lastday);
      
      if (now >= firstDay && now <= lastDay) {
        return year;
      }
    }
    
    // 如果没有找到，返回最新的学年
    return years[0] || null;
  }

  /**
   * 获取学期（Quarters）
   */
  async getQuarters(schoolId: number, yearId: number): Promise<PSTerm[]> {
    try {
      const response = await this.client.get<{ terms: { term: PSTerm[] } }>(
        `/ws/v1/school/${schoolId}/term`,
        {
          params: {
            q: `yearid==${yearId}`,
          },
        }
      );
      
      const terms = response.data.terms?.term || [];
      
      // 过滤出quarters (Q1, Q2, Q3, Q4)
      return terms.filter(t => 
        t.abbreviation?.startsWith('Q') || 
        t.name.includes('Quarter')
      );
    } catch (error) {
      console.error('Failed to fetch quarters:', error);
      return [];
    }
  }

  /**
   * 获取学年的日期范围
   */
  async getYearDateRange(schoolId: number, yearId: number): Promise<{
    startDate: string;
    endDate: string;
  } | null> {
    const years = await this.getSchoolYears(schoolId);
    const year = years.find(y => y.yearid === yearId);
    
    if (year) {
      return {
        startDate: year.firstday,
        endDate: year.lastday,
      };
    }
    
    return null;
  }
}


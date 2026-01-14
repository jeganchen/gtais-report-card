/**
 * 考勤数据仓库
 */

import prisma from '../client';

export class AttendanceCodeRepository {
  /**
   * 根据PowerSchool ID查找考勤代码
   */
  async findByPsId(psId: number) {
    return prisma.attendanceCode.findUnique({
      where: { psId },
    });
  }

  /**
   * 获取所有考勤代码
   */
  async findAll(schoolId?: number, yearId?: number) {
    return prisma.attendanceCode.findMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        ...(yearId ? { yearId } : {}),
      },
      orderBy: { attCode: 'asc' },
    });
  }

  /**
   * 创建或更新考勤代码
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    schoolId: number;
    yearId: number;
    attCode: string;
    description?: string;
    presenceStatus?: string;
  }) {
    return prisma.attendanceCode.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        schoolId: data.schoolId,
        yearId: data.yearId,
        attCode: data.attCode,
        description: data.description,
        presenceStatus: data.presenceStatus,
      },
    });
  }

  /**
   * 批量创建或更新考勤代码
   */
  async upsertMany(codes: Array<{
    psId: number;
    psDcid?: number;
    schoolId: number;
    yearId: number;
    attCode: string;
    description?: string;
    presenceStatus?: string;
  }>) {
    const results = [];
    for (const code of codes) {
      const result = await this.upsert(code);
      results.push(result);
    }
    return results;
  }
}

export class AttendanceRepository {
  /**
   * 根据PowerSchool ID查找考勤记录
   */
  async findByPsId(psId: number) {
    return prisma.attendance.findUnique({
      where: { psId },
      include: { student: true, attendanceCode: true },
    });
  }

  /**
   * 获取学生考勤记录
   */
  async findByStudent(studentId: string, termId?: string) {
    return prisma.attendance.findMany({
      where: {
        studentId,
        ...(termId ? { termId } : {}),
      },
      include: { attendanceCode: true, term: true },
      orderBy: { attDate: 'desc' },
    });
  }

  /**
   * 获取学生考勤统计
   */
  async getStudentAttendanceSummary(studentId: string, termId?: string) {
    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        ...(termId ? { termId } : {}),
      },
      include: { attendanceCode: true },
    });

    // 统计缺勤和迟到
    let absent = 0;
    let tardy = 0;

    for (const record of records) {
      const status = record.attendanceCode?.presenceStatus?.toLowerCase();
      if (status === 'absent') {
        absent++;
      } else if (status === 'tardy') {
        tardy++;
      }
    }

    return { absent, tardy, total: records.length };
  }

  /**
   * 创建或更新考勤记录
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    attDate: Date;
    periodId?: number;
    yearId: number;
    attModeCode?: string;
    studentId: string;
    schoolId: number;
    termId?: string;
    sectionId?: string;
    attendanceCodeId?: string;
  }) {
    return prisma.attendance.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        attDate: data.attDate,
        periodId: data.periodId,
        yearId: data.yearId,
        attModeCode: data.attModeCode,
        studentId: data.studentId,
        schoolId: data.schoolId,
        termId: data.termId,
        sectionId: data.sectionId,
        attendanceCodeId: data.attendanceCodeId,
      },
    });
  }

  /**
   * 批量创建或更新考勤记录
   */
  async upsertMany(records: Array<{
    psId: number;
    psDcid?: number;
    attDate: Date;
    periodId?: number;
    yearId: number;
    attModeCode?: string;
    studentId: string;
    schoolId: number;
    termId?: string;
    sectionId?: string;
    attendanceCodeId?: string;
  }>) {
    const results = [];
    for (const record of records) {
      const result = await this.upsert(record);
      results.push(result);
    }
    return results;
  }
}

export const attendanceCodeRepository = new AttendanceCodeRepository();
export const attendanceRepository = new AttendanceRepository();

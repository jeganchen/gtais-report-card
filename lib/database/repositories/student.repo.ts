/**
 * 学生数据仓库
 */

import prisma from '../client';
import { Prisma } from '@prisma/client';

export interface StudentFilter {
  search?: string;
  gradeLevel?: number;
  homeRoom?: string;
  enrollStatus?: number;
  schoolId?: number;  // 单个学校过滤，存储 PowerSchool school ID (ps_school_id)
  schoolIds?: number[];  // 多个学校过滤（用于 All Schools 时限制可见学校）
  pdfGenerated?: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export class StudentRepository {
  /**
   * 创建学生
   */
  async create(data: Prisma.StudentCreateInput) {
    return prisma.student.create({ data });
  }

  /**
   * 批量创建或更新学生
   */
  async upsertMany(students: Array<{
    psId: number;
    psDcid?: number;
    studentNumber: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    chineseName?: string | null;
    gender?: string | null;
    gradeLevel: number;
    homeRoom?: string | null;
    enrollStatus?: number | null;
    entryDate?: Date | null;
    exitDate?: Date | null;
    dob?: Date | null;
    familyIdent?: number | null;
    street?: string | null;
    city?: string | null;
    homePhone?: string | null;
    guardianEmail?: string | null;
    schoolId: number;  // 改为 number 类型，存储 PowerSchool school ID (ps_id)
  }>) {
    const results = await Promise.all(
      students.map(student =>
        prisma.student.upsert({
          where: { psId: student.psId },
          create: {
            psId: student.psId,
            psDcid: student.psDcid,
            studentNumber: student.studentNumber,
            firstName: student.firstName,
            lastName: student.lastName,
            middleName: student.middleName,
            chineseName: student.chineseName,
            gender: student.gender,
            gradeLevel: student.gradeLevel,
            homeRoom: student.homeRoom,
            enrollStatus: student.enrollStatus,
            entryDate: student.entryDate,
            exitDate: student.exitDate,
            dob: student.dob,
            familyIdent: student.familyIdent,
            street: student.street,
            city: student.city,
            homePhone: student.homePhone,
            guardianEmail: student.guardianEmail,
            schoolId: student.schoolId,
          },
          update: {
            psDcid: student.psDcid,
            studentNumber: student.studentNumber,
            firstName: student.firstName,
            lastName: student.lastName,
            middleName: student.middleName,
            chineseName: student.chineseName,
            gender: student.gender,
            gradeLevel: student.gradeLevel,
            homeRoom: student.homeRoom,
            enrollStatus: student.enrollStatus,
            entryDate: student.entryDate,
            exitDate: student.exitDate,
            dob: student.dob,
            familyIdent: student.familyIdent,
            street: student.street,
            city: student.city,
            homePhone: student.homePhone,
            guardianEmail: student.guardianEmail,
            schoolId: student.schoolId,
          },
        })
      )
    );
    return results;
  }

  /**
   * 通过ID查找学生
   */
  async findById(id: string) {
    return prisma.student.findUnique({
      where: { id },
      include: {
        storedGrades: {
          include: { term: true, section: true },
        },
        attendances: {
          include: { attendanceCode: true },
        },
        contacts: {
          include: {
            person: {
              include: {
                emails: { include: { email: true } },
                phones: { include: { phone: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 通过PowerSchool ID查找学生
   */
  async findByPsId(psId: number) {
    return prisma.student.findUnique({
      where: { psId },
    });
  }

  /**
   * 通过PowerSchool DCID查找学生
   */
  async findByPsDcid(psDcid: number) {
    return prisma.student.findFirst({
      where: { psDcid },
    });
  }

  /**
   * 通过学号查找学生
   */
  async findByStudentNumber(studentNumber: string) {
    return prisma.student.findUnique({
      where: { studentNumber },
    });
  }

  /**
   * 获取学生列表
   */
  async findMany(filter?: StudentFilter, pagination?: PaginationOptions) {
    const where: Prisma.StudentWhereInput = {};

    if (filter?.search) {
      where.OR = [
        { firstName: { contains: filter.search } },
        { lastName: { contains: filter.search } },
        { studentNumber: { contains: filter.search } },
        { chineseName: { contains: filter.search } },
      ];
    }

    if (filter?.gradeLevel !== undefined) {
      where.gradeLevel = filter.gradeLevel;
    }

    if (filter?.homeRoom) {
      where.homeRoom = filter.homeRoom;
    }

    if (filter?.enrollStatus !== undefined) {
      where.enrollStatus = filter.enrollStatus;
    }

    if (filter?.schoolId !== undefined) {
      where.schoolId = filter.schoolId;  // schoolId 现在是 Int 类型 (ps_school_id)
    } else if (filter?.schoolIds && filter.schoolIds.length > 0) {
      // 多个学校过滤（用于 All Schools 时限制可见学校）
      where.schoolId = { in: filter.schoolIds };
    }

    if (filter?.pdfGenerated !== undefined) {
      where.pdfGenerated = filter.pdfGenerated;
    }

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [students, total, pdfGeneratedCount] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { gradeLevel: 'asc' },
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
        include: { 
          contacts: {
            include: {
              person: {
                include: {
                  emails: { 
                    include: { email: true },
                    orderBy: { isPrimary: 'desc' },
                  },
                  // 电话不需要，不查询
                },
              },
            },
            orderBy: { contactPriorityOrder: 'asc' },
            // 获取所有联系人，不限制数量
          },
        },
      }),
      prisma.student.count({ where }),
      // 统计符合当前过滤条件的所有学生中已生成 PDF 的数量
      prisma.student.count({ where: { ...where, pdfGenerated: true } }),
    ]);

    return {
      students,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      pdfGeneratedCount,
    };
  }

  /**
   * 获取所有学生（不分页）
   */
  async findAll(filter?: StudentFilter) {
    const where: Prisma.StudentWhereInput = {};

    if (filter?.gradeLevel !== undefined) {
      where.gradeLevel = filter.gradeLevel;
    }

    if (filter?.enrollStatus !== undefined) {
      where.enrollStatus = filter.enrollStatus;
    }

    if (filter?.schoolId !== undefined) {
      where.schoolId = filter.schoolId;  // schoolId 现在是 Int 类型 (ps_school_id)
    }

    return prisma.student.findMany({
      where,
      orderBy: [
        { gradeLevel: 'asc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });
  }

  /**
   * 更新学生
   */
  async update(id: string, data: Prisma.StudentUpdateInput) {
    return prisma.student.update({
      where: { id },
      data,
    });
  }

  /**
   * 更新PDF生成状态
   */
  async updatePdfStatus(id: string, pdfUrl: string) {
    return prisma.student.update({
      where: { id },
      data: {
        pdfGenerated: true,
        pdfGeneratedAt: new Date(),
        pdfUrl,
      },
    });
  }

  /**
   * 更新邮件发送状态
   */
  async updateEmailStatus(id: string) {
    return prisma.student.update({
      where: { id },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });
  }

  /**
   * 删除学生
   */
  async delete(id: string) {
    return prisma.student.delete({
      where: { id },
    });
  }

  /**
   * 获取年级列表
   */
  async getGradeLevels(schoolId?: number) {
    const where: Prisma.StudentWhereInput = {};
    if (schoolId !== undefined) {
      where.schoolId = schoolId;  // schoolId 现在是 Int 类型 (ps_school_id)
    }

    const result = await prisma.student.groupBy({
      by: ['gradeLevel'],
      where,
      orderBy: { gradeLevel: 'asc' },
    });
    return result.map(r => r.gradeLevel);
  }

  /**
   * 获取班级列表
   */
  async getHomerooms(schoolId?: number, gradeLevel?: number) {
    const where: Prisma.StudentWhereInput = {};
    if (schoolId !== undefined) {
      where.schoolId = schoolId;  // schoolId 现在是 Int 类型 (ps_school_id)
    }
    if (gradeLevel !== undefined) {
      where.gradeLevel = gradeLevel;
    }

    const result = await prisma.student.findMany({
      where,
      select: { homeRoom: true },
      distinct: ['homeRoom'],
      orderBy: { homeRoom: 'asc' },
    });

    return result
      .map(r => r.homeRoom)
      .filter((h): h is string => h !== null);
  }

  /**
   * 统计学生数量
   */
  async count(filter?: StudentFilter) {
    const where: Prisma.StudentWhereInput = {};

    if (filter?.gradeLevel !== undefined) {
      where.gradeLevel = filter.gradeLevel;
    }

    if (filter?.enrollStatus !== undefined) {
      where.enrollStatus = filter.enrollStatus;
    }

    if (filter?.schoolId !== undefined) {
      where.schoolId = filter.schoolId;  // schoolId 现在是 Int 类型 (ps_school_id)
    }

    return prisma.student.count({ where });
  }
}

// 导出单例
export const studentRepository = new StudentRepository();

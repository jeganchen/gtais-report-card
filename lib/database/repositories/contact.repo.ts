/**
 * 联系人数据仓库
 */

import prisma from '../client';

export class PersonRepository {
  /**
   * 根据PowerSchool ID查找个人
   */
  async findByPsId(psId: number) {
    return prisma.person.findUnique({
      where: { psId },
      include: {
        emails: { include: { email: true } },
        phones: { include: { phone: true } },
      },
    });
  }

  /**
   * 创建或更新个人
   */
  async upsert(data: {
    psId: number;
    psDcid?: number;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    isActive?: boolean;
  }) {
    return prisma.person.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        psDcid: data.psDcid,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        isActive: data.isActive,
      },
    });
  }

  /**
   * 批量创建或更新个人
   */
  async upsertMany(persons: Array<{
    psId: number;
    psDcid?: number;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    isActive?: boolean;
  }>) {
    const results = [];
    for (const person of persons) {
      const result = await this.upsert(person);
      results.push(result);
    }
    return results;
  }
}

export class StudentContactRepository {
  /**
   * 获取学生的所有联系人
   */
  async findByStudent(studentId: string) {
    return prisma.studentContactAssoc.findMany({
      where: { studentId },
      include: {
        person: {
          include: {
            emails: { include: { email: true } },
            phones: { include: { phone: true } },
          },
        },
      },
      orderBy: { contactPriorityOrder: 'asc' },
    });
  }

  /**
   * 获取学生的主要联系人（优先级最高）
   */
  async getPrimaryContact(studentId: string) {
    return prisma.studentContactAssoc.findFirst({
      where: { studentId },
      include: {
        person: {
          include: {
            emails: { include: { email: true } },
            phones: { include: { phone: true } },
          },
        },
      },
      orderBy: { contactPriorityOrder: 'asc' },
    });
  }

  /**
   * 获取学生联系人的主要邮箱
   */
  async getPrimaryEmail(studentId: string): Promise<string | null> {
    const contact = await this.getPrimaryContact(studentId);
    if (!contact) return null;

    // 查找主要邮箱
    const primaryEmailAssoc = contact.person.emails.find(e => e.isPrimary);
    if (primaryEmailAssoc) {
      return primaryEmailAssoc.email.emailAddress;
    }

    // 如果没有主要邮箱，返回第一个邮箱
    if (contact.person.emails.length > 0) {
      return contact.person.emails[0].email.emailAddress;
    }

    return null;
  }

  /**
   * 获取学生所有联系人的姓名和邮箱（格式化）
   * 返回格式: [{ name: "姓名", email: "邮箱", priority: 1 }, ...]
   */
  async getContactsWithEmail(studentId: string): Promise<Array<{
    name: string;
    email: string | null;
    priority: number | null;
  }>> {
    const contacts = await this.findByStudent(studentId);
    
    return contacts.map(contact => {
      const person = contact.person;
      const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || 'Unknown';
      
      // 优先取主要邮箱，否则取第一个
      const primaryEmailAssoc = person.emails.find(e => e.isPrimary);
      const email = primaryEmailAssoc?.email.emailAddress 
        || person.emails[0]?.email.emailAddress 
        || null;
      
      return {
        name,
        email,
        priority: contact.contactPriorityOrder,
      };
    });
  }

  /**
   * 获取学生所有联系人的格式化字符串
   * 返回格式: "姓名1 (邮箱1), 姓名2 (邮箱2)"
   */
  async getFormattedGuardians(studentId: string): Promise<{
    guardianName: string;
    guardianEmail: string;
  }> {
    const contacts = await this.getContactsWithEmail(studentId);
    
    if (contacts.length === 0) {
      return { guardianName: '', guardianEmail: '' };
    }
    
    // 合并所有联系人姓名
    const names = contacts.map(c => c.name).filter(Boolean);
    const emails = contacts.map(c => c.email).filter(Boolean) as string[];
    
    return {
      guardianName: names.join(', '),
      guardianEmail: emails.join(', '),
    };
  }

  /**
   * 创建或更新学生联系人关联
   */
  async upsert(data: {
    psId: number;
    contactPriorityOrder?: number;
    relationshipType?: string;
    studentId: string;
    personId: string;
  }) {
    return prisma.studentContactAssoc.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        contactPriorityOrder: data.contactPriorityOrder,
        relationshipType: data.relationshipType,
        studentId: data.studentId,
        personId: data.personId,
      },
    });
  }

  /**
   * 批量创建或更新学生联系人关联
   */
  async upsertMany(assocs: Array<{
    psId: number;
    contactPriorityOrder?: number;
    relationshipType?: string;
    studentId: string;
    personId: string;
  }>) {
    const results = [];
    for (const assoc of assocs) {
      const result = await this.upsert(assoc);
      results.push(result);
    }
    return results;
  }
}

export class EmailAddressRepository {
  /**
   * 根据PowerSchool ID查找邮箱
   */
  async findByPsId(psId: number) {
    return prisma.emailAddress.findUnique({
      where: { psId },
    });
  }

  /**
   * 创建或更新邮箱
   */
  async upsert(data: {
    psId: number;
    emailAddress: string;
  }) {
    return prisma.emailAddress.upsert({
      where: { psId: data.psId },
      create: data,
      update: { emailAddress: data.emailAddress },
    });
  }

  /**
   * 批量创建或更新邮箱
   */
  async upsertMany(emails: Array<{
    psId: number;
    emailAddress: string;
  }>) {
    const results = [];
    for (const email of emails) {
      const result = await this.upsert(email);
      results.push(result);
    }
    return results;
  }
}

export class PersonEmailAssocRepository {
  /**
   * 创建或更新个人邮箱关联
   */
  async upsert(data: {
    psId: number;
    isPrimary?: boolean;
    personId: string;
    emailId: string;
  }) {
    return prisma.personEmailAssoc.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        isPrimary: data.isPrimary,
        personId: data.personId,
        emailId: data.emailId,
      },
    });
  }

  /**
   * 批量创建或更新
   */
  async upsertMany(assocs: Array<{
    psId: number;
    isPrimary?: boolean;
    personId: string;
    emailId: string;
  }>) {
    const results = [];
    for (const assoc of assocs) {
      const result = await this.upsert(assoc);
      results.push(result);
    }
    return results;
  }
}

export class PhoneNumberRepository {
  /**
   * 根据PowerSchool ID查找电话
   */
  async findByPsId(psId: number) {
    return prisma.phoneNumber.findUnique({
      where: { psId },
    });
  }

  /**
   * 创建或更新电话
   */
  async upsert(data: {
    psId: number;
    phoneNumber: string;
  }) {
    return prisma.phoneNumber.upsert({
      where: { psId: data.psId },
      create: data,
      update: { phoneNumber: data.phoneNumber },
    });
  }

  /**
   * 批量创建或更新电话
   */
  async upsertMany(phones: Array<{
    psId: number;
    phoneNumber: string;
  }>) {
    const results = [];
    for (const phone of phones) {
      const result = await this.upsert(phone);
      results.push(result);
    }
    return results;
  }
}

export class PersonPhoneAssocRepository {
  /**
   * 创建或更新个人电话关联
   */
  async upsert(data: {
    psId: number;
    isPreferred?: boolean;
    personId: string;
    phoneId: string;
  }) {
    return prisma.personPhoneAssoc.upsert({
      where: { psId: data.psId },
      create: data,
      update: {
        isPreferred: data.isPreferred,
        personId: data.personId,
        phoneId: data.phoneId,
      },
    });
  }

  /**
   * 批量创建或更新
   */
  async upsertMany(assocs: Array<{
    psId: number;
    isPreferred?: boolean;
    personId: string;
    phoneId: string;
  }>) {
    const results = [];
    for (const assoc of assocs) {
      const result = await this.upsert(assoc);
      results.push(result);
    }
    return results;
  }
}

export const personRepository = new PersonRepository();
export const studentContactRepository = new StudentContactRepository();
export const emailAddressRepository = new EmailAddressRepository();
export const personEmailAssocRepository = new PersonEmailAssocRepository();
export const phoneNumberRepository = new PhoneNumberRepository();
export const personPhoneAssocRepository = new PersonPhoneAssocRepository();

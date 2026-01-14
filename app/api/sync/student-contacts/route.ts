/**
 * 学生联系人关联同步API
 * 从PowerSchool获取学生与联系人的关联数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, studentContactRepository, syncLogRepository } from '@/lib/database/repositories';
import prisma from '@/lib/database/client';

// PowerSchool返回的学生联系人关联数据结构
interface PSStudentContactAssocRecord {
  id: number;
  name: string;
  tables: {
    studentcontactassoc: {
      studentcontactassocid: string;
      personid: string;
      contactpriorityorder: string;
      studentdcid: string;
      currreltypecodesetid: string;
    };
  };
}

interface PSStudentContactAssocsResponse {
  name: string;
  record: PSStudentContactAssocRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/student-contacts - 同步学生联系人关联数据
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 获取PowerSchool配置
    const config = await settingsRepository.getPowerSchoolConfig();
    
    if (!config.endpoint || !config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: 'PowerSchool configuration is incomplete' },
        { status: 400 }
      );
    }
    
    if (!config.accessToken) {
      return NextResponse.json(
        { error: 'PowerSchool access token not found. Please get a token first.' },
        { status: 401 }
      );
    }

    // 创建同步日志
    const log = await syncLogRepository.create('contacts');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API - 无参数
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.student_contact_assoc`;
    console.log(`Calling PowerSchool API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PowerSchool API error:', errorText);
      await syncLogRepository.fail(log.id, `PowerSchool API error: ${response.status}`);
      throw new Error(`PowerSchool API error: ${response.status} ${response.statusText}`);
    }

    const data: PSStudentContactAssocsResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} student contact associations from PowerSchool`);

    // 获取所有学生和个人的映射
    const students = await prisma.student.findMany({
      select: { id: true, psDcid: true },
    });
    const studentDcidMap = new Map(students.map(s => [s.psDcid, s.id]));

    const persons = await prisma.person.findMany({
      select: { id: true, psId: true },
    });
    const personPsIdMap = new Map(persons.map(p => [p.psId, p.id]));

    // 解析并保存关联数据
    const assocsToSave: Array<{
      psId: number;
      contactPriorityOrder?: number;
      relationshipType?: string;
      studentId: string;
      personId: string;
    }> = [];
    
    const skipped: Array<{ psId: number; reason: string }> = [];

    for (const record of data.record) {
      const assoc = record.tables.studentcontactassoc;
      const psId = parseInt(assoc.studentcontactassocid, 10);
      const studentDcid = parseInt(assoc.studentdcid, 10);
      const personPsId = parseInt(assoc.personid, 10);

      const studentId = studentDcidMap.get(studentDcid);
      const personId = personPsIdMap.get(personPsId);

      if (!studentId) {
        skipped.push({ psId, reason: `Student with dcid ${studentDcid} not found` });
        continue;
      }

      if (!personId) {
        skipped.push({ psId, reason: `Person with psId ${personPsId} not found` });
        continue;
      }

      assocsToSave.push({
        psId,
        contactPriorityOrder: assoc.contactpriorityorder ? parseInt(assoc.contactpriorityorder, 10) : undefined,
        relationshipType: assoc.currreltypecodesetid || undefined,
        studentId,
        personId,
      });
    }

    console.log(`Parsed ${assocsToSave.length} student contact associations, skipped ${skipped.length}`);

    // 批量保存到数据库
    if (assocsToSave.length > 0) {
      await studentContactRepository.upsertMany(assocsToSave);
    }

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, assocsToSave.length, {
      associations: assocsToSave.map(a => ({ 
        id: a.psId, 
        studentId: a.studentId,
        personId: a.personId,
        priority: a.contactPriorityOrder,
      })),
      skipped,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${assocsToSave.length} student contact associations`,
      data: {
        count: assocsToSave.length,
        skipped: skipped.length,
        duration: `${duration}ms`,
        associations: assocsToSave.slice(0, 20).map(a => ({
          psId: a.psId,
          studentId: a.studentId,
          personId: a.personId,
          priority: a.contactPriorityOrder,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync student contact associations:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync student contact associations',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/student-contacts - 获取已同步的学生联系人关联列表
 */
export async function GET() {
  try {
    const assocs = await prisma.studentContactAssoc.findMany({
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentNumber: true } },
        person: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ studentId: 'asc' }, { contactPriorityOrder: 'asc' }],
    });
    
    return NextResponse.json({
      associations: assocs.map(a => ({
        id: a.id,
        psId: a.psId,
        contactPriorityOrder: a.contactPriorityOrder,
        relationshipType: a.relationshipType,
        student: {
          id: a.student.id,
          name: `${a.student.firstName} ${a.student.lastName}`,
          studentNumber: a.student.studentNumber,
        },
        person: {
          id: a.person.id,
          name: `${a.person.firstName} ${a.person.lastName}`,
        },
      })),
      total: assocs.length,
    });
  } catch (error) {
    console.error('Failed to get student contact associations:', error);
    return NextResponse.json(
      { error: 'Failed to get student contact associations', associations: [], total: 0 },
      { status: 500 }
    );
  }
}

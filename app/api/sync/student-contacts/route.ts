/**
 * 学生联系人关联同步API
 * 从PowerSchool获取学生与联系人的关联数据并保存到数据库
 * 支持分页查询，自动获取所有关联
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, studentContactRepository, syncLogRepository } from '@/lib/database/repositories';
import prisma from '@/lib/database/client';
import { tokenManager } from '@/lib/powerschool/token-manager';

// 分页配置
const PAGE_SIZE = 50;

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
 * 调用 PowerSchool API 获取一页学生联系人关联数据
 * 如果返回 401，自动刷新 token 并重试
 */
async function fetchStudentContactsPage(
  apiUrl: string,
  accessToken: string,
  startrow: number,
  endrow: number,
  isRetry = false
): Promise<{ records: PSStudentContactAssocRecord[]; newToken?: string }> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ startrow, endrow }),
  });

  // 如果返回 401 且不是重试，则刷新 token 并重试
  if (response.status === 401 && !isRetry) {
    console.log('[SyncStudentContacts] Token expired, refreshing...');
    try {
      const newTokenInfo = await tokenManager.fetchNewToken();
      console.log('[SyncStudentContacts] Token refreshed successfully, retrying request...');
      return fetchStudentContactsPage(apiUrl, newTokenInfo.accessToken, startrow, endrow, true);
    } catch (refreshError) {
      console.error('[SyncStudentContacts] Failed to refresh token:', refreshError);
      throw new Error('PowerSchool access token expired and refresh failed.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PowerSchool API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: PSStudentContactAssocsResponse = await response.json();
  return { records: data.record || [] };
}

/**
 * POST /api/sync/student-contacts - 同步学生联系人关联数据（分页获取所有关联）
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
    
    // 使用 tokenManager 确保有有效 token（过期会自动刷新）
    let accessToken: string;
    try {
      accessToken = await tokenManager.ensureValidToken();
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to obtain valid PowerSchool access token. Please check your configuration.' },
        { status: 401 }
      );
    }

    // 创建同步日志
    const log = await syncLogRepository.create('contacts');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API - 分页获取
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.student_contact_assoc`;

    const allRecords: PSStudentContactAssocRecord[] = [];
    let startrow = 1;
    let endrow = PAGE_SIZE;
    let pageCount = 0;

    console.log(`[SyncStudentContacts] Starting paginated sync from ${apiUrl}`);

    // 分页循环获取所有数据
    while (true) {
      pageCount++;
      console.log(`[SyncStudentContacts] Fetching page ${pageCount}: rows ${startrow}-${endrow}`);

      const { records, newToken } = await fetchStudentContactsPage(apiUrl, accessToken, startrow, endrow);

      if (newToken) {
        accessToken = newToken;
      }

      console.log(`[SyncStudentContacts] Page ${pageCount} returned ${records.length} records`);

      if (records.length === 0) {
        break;
      }

      allRecords.push(...records);

      // 如果返回的记录数小于 PAGE_SIZE，说明已经是最后一页
      if (records.length < PAGE_SIZE) {
        break;
      }

      startrow += PAGE_SIZE;
      endrow += PAGE_SIZE;
    }

    console.log(`[SyncStudentContacts] Total fetched: ${allRecords.length} associations in ${pageCount} pages`);

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

    for (const record of allRecords) {
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
      associations: assocsToSave.slice(0, 20).map(a => ({ 
        id: a.psId, 
        studentId: a.studentId,
        personId: a.personId,
        priority: a.contactPriorityOrder,
      })),
      skipped: skipped.slice(0, 20),
      pageCount,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${assocsToSave.length} student contact associations in ${pageCount} pages`,
      data: {
        count: assocsToSave.length,
        skipped: skipped.length,
        pageCount,
        duration: `${duration}ms`,
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

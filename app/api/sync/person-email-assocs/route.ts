/**
 * 个人邮箱关联同步API
 * 从PowerSchool获取Person与Email的关联数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, personEmailAssocRepository, syncLogRepository } from '@/lib/database/repositories';
import prisma from '@/lib/database/client';

// PowerSchool返回的个人邮箱关联数据结构
interface PSPersonEmailAssocRecord {
  id: number;
  name: string;
  tables: {
    personemailaddressassoc: {
      personemailaddressassocid: string;
      personid: string;
      emailaddressid: string;
      isprimaryemailaddress: string;
    };
  };
}

interface PSPersonEmailAssocsResponse {
  name: string;
  record: PSPersonEmailAssocRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/person-email-assocs - 同步个人邮箱关联数据
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
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.person_email_assoc`;
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

    const data: PSPersonEmailAssocsResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} person-email associations from PowerSchool`);

    // 获取所有 Person 和 EmailAddress 的映射
    const persons = await prisma.person.findMany({
      select: { id: true, psId: true },
    });
    const personPsIdMap = new Map(persons.map(p => [p.psId, p.id]));

    const emails = await prisma.emailAddress.findMany({
      select: { id: true, psId: true },
    });
    const emailPsIdMap = new Map(emails.map(e => [e.psId, e.id]));

    // 解析并保存关联数据
    const assocsToSave: Array<{
      psId: number;
      isPrimary: boolean;
      personId: string;
      emailId: string;
    }> = [];
    
    const skipped: Array<{ psId: number; reason: string }> = [];

    for (const record of data.record) {
      const assoc = record.tables.personemailaddressassoc;
      const psId = parseInt(assoc.personemailaddressassocid, 10);
      const personPsId = parseInt(assoc.personid, 10);
      const emailPsId = parseInt(assoc.emailaddressid, 10);

      const personId = personPsIdMap.get(personPsId);
      const emailId = emailPsIdMap.get(emailPsId);

      if (!personId) {
        skipped.push({ psId, reason: `Person with psId ${personPsId} not found` });
        continue;
      }

      if (!emailId) {
        skipped.push({ psId, reason: `Email with psId ${emailPsId} not found` });
        continue;
      }

      assocsToSave.push({
        psId,
        isPrimary: assoc.isprimaryemailaddress === '1',
        personId,
        emailId,
      });
    }

    console.log(`Parsed ${assocsToSave.length} person-email associations, skipped ${skipped.length}`);

    // 批量保存到数据库
    if (assocsToSave.length > 0) {
      await personEmailAssocRepository.upsertMany(assocsToSave);
    }

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, assocsToSave.length, {
      associations: assocsToSave.slice(0, 20).map(a => ({ 
        id: a.psId, 
        personId: a.personId,
        emailId: a.emailId,
        isPrimary: a.isPrimary,
      })),
      skipped: skipped.slice(0, 10),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${assocsToSave.length} person-email associations`,
      data: {
        count: assocsToSave.length,
        skipped: skipped.length,
        duration: `${duration}ms`,
      },
    });

  } catch (error) {
    console.error('Failed to sync person-email associations:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync person-email associations',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/person-email-assocs - 获取已同步的个人邮箱关联列表
 */
export async function GET() {
  try {
    const assocs = await prisma.personEmailAssoc.findMany({
      include: {
        person: { select: { id: true, firstName: true, lastName: true } },
        email: { select: { id: true, emailAddress: true } },
      },
      orderBy: { personId: 'asc' },
    });
    
    return NextResponse.json({
      associations: assocs.map(a => ({
        id: a.id,
        psId: a.psId,
        isPrimary: a.isPrimary,
        person: {
          id: a.person.id,
          name: `${a.person.firstName || ''} ${a.person.lastName || ''}`.trim(),
        },
        email: {
          id: a.email.id,
          emailAddress: a.email.emailAddress,
        },
      })),
      total: assocs.length,
    });
  } catch (error) {
    console.error('Failed to get person-email associations:', error);
    return NextResponse.json(
      { error: 'Failed to get person-email associations', associations: [], total: 0 },
      { status: 500 }
    );
  }
}

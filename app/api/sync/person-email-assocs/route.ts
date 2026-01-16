/**
 * 个人邮箱关联同步API
 * 从PowerSchool获取Person与Email的关联数据并保存到数据库
 * 支持分页查询，自动获取所有关联
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, personEmailAssocRepository, syncLogRepository } from '@/lib/database/repositories';
import prisma from '@/lib/database/client';
import { tokenManager } from '@/lib/powerschool/token-manager';

// 分页配置
const PAGE_SIZE = 50;

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
 * 调用 PowerSchool API 获取一页个人邮箱关联数据
 * 如果返回 401，自动刷新 token 并重试
 */
async function fetchPersonEmailAssocsPage(
  apiUrl: string,
  accessToken: string,
  startrow: number,
  endrow: number,
  isRetry = false
): Promise<{ records: PSPersonEmailAssocRecord[]; newToken?: string }> {
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
    console.log('[SyncPersonEmailAssocs] Token expired, refreshing...');
    try {
      const newTokenInfo = await tokenManager.fetchNewToken();
      console.log('[SyncPersonEmailAssocs] Token refreshed successfully, retrying request...');
      return fetchPersonEmailAssocsPage(apiUrl, newTokenInfo.accessToken, startrow, endrow, true);
    } catch (refreshError) {
      console.error('[SyncPersonEmailAssocs] Failed to refresh token:', refreshError);
      throw new Error('PowerSchool access token expired and refresh failed.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PowerSchool API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: PSPersonEmailAssocsResponse = await response.json();
  return { records: data.record || [] };
}

/**
 * POST /api/sync/person-email-assocs - 同步个人邮箱关联数据（分页获取所有关联）
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
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.person_email_assoc`;

    const allRecords: PSPersonEmailAssocRecord[] = [];
    let startrow = 1;
    let endrow = PAGE_SIZE;
    let pageCount = 0;

    console.log(`[SyncPersonEmailAssocs] Starting paginated sync from ${apiUrl}`);

    // 分页循环获取所有数据
    while (true) {
      pageCount++;
      console.log(`[SyncPersonEmailAssocs] Fetching page ${pageCount}: rows ${startrow}-${endrow}`);

      const { records, newToken } = await fetchPersonEmailAssocsPage(apiUrl, accessToken, startrow, endrow);

      if (newToken) {
        accessToken = newToken;
      }

      console.log(`[SyncPersonEmailAssocs] Page ${pageCount} returned ${records.length} records`);

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

    console.log(`[SyncPersonEmailAssocs] Total fetched: ${allRecords.length} associations in ${pageCount} pages`);

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

    for (const record of allRecords) {
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
      pageCount,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${assocsToSave.length} person-email associations in ${pageCount} pages`,
      data: {
        count: assocsToSave.length,
        skipped: skipped.length,
        pageCount,
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

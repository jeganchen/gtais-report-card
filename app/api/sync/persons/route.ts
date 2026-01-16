/**
 * 个人信息同步API
 * 从PowerSchool获取个人数据并保存到数据库
 * 支持分页查询，自动获取所有个人
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, personRepository, syncLogRepository } from '@/lib/database/repositories';
import { tokenManager } from '@/lib/powerschool/token-manager';

// 分页配置
const PAGE_SIZE = 50;

// PowerSchool返回的个人数据结构
interface PSPersonRecord {
  id: number;
  name: string;
  tables: {
    person: {
      lastname: string;
      middlename: string | null;
      id: string;
      dcid: string;
      isactive: string;
      firstname: string;
    };
  };
}

interface PSPersonsResponse {
  name: string;
  record: PSPersonRecord[];
  '@extensions'?: string;
}

/**
 * 调用 PowerSchool API 获取一页个人数据
 * 如果返回 401，自动刷新 token 并重试
 */
async function fetchPersonsPage(
  apiUrl: string,
  accessToken: string,
  startrow: number,
  endrow: number,
  isRetry = false
): Promise<{ records: PSPersonRecord[]; newToken?: string }> {
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
    console.log('[SyncPersons] Token expired, refreshing...');
    try {
      const newTokenInfo = await tokenManager.fetchNewToken();
      console.log('[SyncPersons] Token refreshed successfully, retrying request...');
      return fetchPersonsPage(apiUrl, newTokenInfo.accessToken, startrow, endrow, true);
    } catch (refreshError) {
      console.error('[SyncPersons] Failed to refresh token:', refreshError);
      throw new Error('PowerSchool access token expired and refresh failed.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PowerSchool API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: PSPersonsResponse = await response.json();
  return { records: data.record || [] };
}

/**
 * POST /api/sync/persons - 同步个人数据（分页获取所有个人）
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
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.person`;

    const allRecords: PSPersonRecord[] = [];
    let startrow = 1;
    let endrow = PAGE_SIZE;
    let pageCount = 0;

    console.log(`[SyncPersons] Starting paginated sync from ${apiUrl}`);

    // 分页循环获取所有数据
    while (true) {
      pageCount++;
      console.log(`[SyncPersons] Fetching page ${pageCount}: rows ${startrow}-${endrow}`);

      const { records, newToken } = await fetchPersonsPage(apiUrl, accessToken, startrow, endrow);

      if (newToken) {
        accessToken = newToken;
      }

      console.log(`[SyncPersons] Page ${pageCount} returned ${records.length} records`);

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

    console.log(`[SyncPersons] Total fetched: ${allRecords.length} persons in ${pageCount} pages`);

    // 解析并保存个人数据
    const personsToSave = allRecords.map((record) => {
      const person = record.tables.person;
      return {
        psId: parseInt(person.id, 10),
        psDcid: parseInt(person.dcid, 10),
        firstName: person.firstname || undefined,
        lastName: person.lastname || undefined,
        middleName: person.middlename || undefined,
        isActive: person.isactive === '1',
      };
    });

    console.log(`Parsed ${personsToSave.length} persons`);

    // 批量保存到数据库
    await personRepository.upsertMany(personsToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, personsToSave.length, {
      persons: personsToSave.slice(0, 20).map(p => ({ 
        id: p.psId, 
        firstName: p.firstName,
        lastName: p.lastName,
        isActive: p.isActive,
      })),
      pageCount,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${personsToSave.length} persons in ${pageCount} pages`,
      data: {
        count: personsToSave.length,
        pageCount,
        duration: `${duration}ms`,
      },
    });

  } catch (error) {
    console.error('Failed to sync persons:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync persons',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/persons - 获取已同步的个人列表
 */
export async function GET() {
  try {
    const persons = await import('@/lib/database/client').then(m => m.default.person.findMany({
      where: { isActive: true },
      orderBy: { lastName: 'asc' },
    }));
    
    return NextResponse.json({
      persons: persons.map(p => ({
        id: p.id,
        psId: p.psId,
        psDcid: p.psDcid,
        firstName: p.firstName,
        lastName: p.lastName,
        middleName: p.middleName,
        isActive: p.isActive,
      })),
      total: persons.length,
    });
  } catch (error) {
    console.error('Failed to get persons:', error);
    return NextResponse.json(
      { error: 'Failed to get persons', persons: [], total: 0 },
      { status: 500 }
    );
  }
}

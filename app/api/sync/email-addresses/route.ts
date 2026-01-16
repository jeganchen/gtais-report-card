/**
 * 邮箱地址同步API
 * 从PowerSchool获取邮箱地址数据并保存到数据库
 * 支持分页查询，自动获取所有邮箱
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, emailAddressRepository, syncLogRepository } from '@/lib/database/repositories';
import prisma from '@/lib/database/client';
import { tokenManager } from '@/lib/powerschool/token-manager';

// 分页配置
const PAGE_SIZE = 50;

// PowerSchool返回的邮箱地址数据结构
interface PSEmailAddressRecord {
  id: number;
  name: string;
  tables: {
    emailaddress: {
      emailaddressid: string;
      emailaddress: string;
    };
  };
}

interface PSEmailAddressesResponse {
  name: string;
  record: PSEmailAddressRecord[];
  '@extensions'?: string;
}

/**
 * 调用 PowerSchool API 获取一页邮箱地址数据
 * 如果返回 401，自动刷新 token 并重试
 */
async function fetchEmailAddressesPage(
  apiUrl: string,
  accessToken: string,
  startrow: number,
  endrow: number,
  isRetry = false
): Promise<{ records: PSEmailAddressRecord[]; newToken?: string }> {
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
    console.log('[SyncEmailAddresses] Token expired, refreshing...');
    try {
      const newTokenInfo = await tokenManager.fetchNewToken();
      console.log('[SyncEmailAddresses] Token refreshed successfully, retrying request...');
      return fetchEmailAddressesPage(apiUrl, newTokenInfo.accessToken, startrow, endrow, true);
    } catch (refreshError) {
      console.error('[SyncEmailAddresses] Failed to refresh token:', refreshError);
      throw new Error('PowerSchool access token expired and refresh failed.');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PowerSchool API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: PSEmailAddressesResponse = await response.json();
  return { records: data.record || [] };
}

/**
 * POST /api/sync/email-addresses - 同步邮箱地址数据（分页获取所有邮箱）
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
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.emailaddress`;

    const allRecords: PSEmailAddressRecord[] = [];
    let startrow = 1;
    let endrow = PAGE_SIZE;
    let pageCount = 0;

    console.log(`[SyncEmailAddresses] Starting paginated sync from ${apiUrl}`);

    // 分页循环获取所有数据
    while (true) {
      pageCount++;
      console.log(`[SyncEmailAddresses] Fetching page ${pageCount}: rows ${startrow}-${endrow}`);

      const { records, newToken } = await fetchEmailAddressesPage(apiUrl, accessToken, startrow, endrow);

      if (newToken) {
        accessToken = newToken;
      }

      console.log(`[SyncEmailAddresses] Page ${pageCount} returned ${records.length} records`);

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

    console.log(`[SyncEmailAddresses] Total fetched: ${allRecords.length} email addresses in ${pageCount} pages`);

    // 解析并保存邮箱地址数据
    const emailsToSave = allRecords.map((record) => {
      const email = record.tables.emailaddress;
      return {
        psId: parseInt(email.emailaddressid, 10),
        emailAddress: email.emailaddress,
      };
    });

    console.log(`Parsed ${emailsToSave.length} email addresses`);

    // 批量保存到数据库
    await emailAddressRepository.upsertMany(emailsToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, emailsToSave.length, {
      emails: emailsToSave.slice(0, 20).map(e => ({ 
        id: e.psId, 
        emailAddress: e.emailAddress,
      })),
      pageCount,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${emailsToSave.length} email addresses in ${pageCount} pages`,
      data: {
        count: emailsToSave.length,
        pageCount,
        duration: `${duration}ms`,
      },
    });

  } catch (error) {
    console.error('Failed to sync email addresses:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync email addresses',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/email-addresses - 获取已同步的邮箱地址列表
 */
export async function GET() {
  try {
    const emails = await prisma.emailAddress.findMany({
      orderBy: { emailAddress: 'asc' },
    });
    
    return NextResponse.json({
      emails: emails.map(e => ({
        id: e.id,
        psId: e.psId,
        emailAddress: e.emailAddress,
      })),
      total: emails.length,
    });
  } catch (error) {
    console.error('Failed to get email addresses:', error);
    return NextResponse.json(
      { error: 'Failed to get email addresses', emails: [], total: 0 },
      { status: 500 }
    );
  }
}

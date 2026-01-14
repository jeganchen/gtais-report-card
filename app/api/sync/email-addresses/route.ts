/**
 * 邮箱地址同步API
 * 从PowerSchool获取邮箱地址数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, emailAddressRepository, syncLogRepository } from '@/lib/database/repositories';
import prisma from '@/lib/database/client';

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
 * POST /api/sync/email-addresses - 同步邮箱地址数据
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
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.emailaddress`;
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

    const data: PSEmailAddressesResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} email addresses from PowerSchool`);

    // 解析并保存邮箱地址数据
    const emailsToSave = data.record.map((record) => {
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
      emails: emailsToSave.map(e => ({ 
        id: e.psId, 
        emailAddress: e.emailAddress,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${emailsToSave.length} email addresses`,
      data: {
        count: emailsToSave.length,
        duration: `${duration}ms`,
        emails: emailsToSave.slice(0, 20).map(e => ({
          psId: e.psId,
          emailAddress: e.emailAddress,
        })),
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

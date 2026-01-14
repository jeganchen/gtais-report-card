/**
 * 个人信息同步API
 * 从PowerSchool获取个人数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, personRepository, syncLogRepository } from '@/lib/database/repositories';

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
 * POST /api/sync/persons - 同步个人数据
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
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.person`;
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

    const data: PSPersonsResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} persons from PowerSchool`);

    // 解析并保存个人数据
    const personsToSave = data.record.map((record) => {
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
      persons: personsToSave.map(p => ({ 
        id: p.psId, 
        firstName: p.firstName,
        lastName: p.lastName,
        isActive: p.isActive,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${personsToSave.length} persons`,
      data: {
        count: personsToSave.length,
        duration: `${duration}ms`,
        persons: personsToSave.map(p => ({
          psId: p.psId,
          firstName: p.firstName,
          lastName: p.lastName,
          middleName: p.middleName,
          isActive: p.isActive,
        })),
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

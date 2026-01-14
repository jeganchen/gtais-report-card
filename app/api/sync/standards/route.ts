/**
 * 学科标准同步API
 * 从PowerSchool获取学科标准数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, standardRepository, syncLogRepository } from '@/lib/database/repositories';

// PowerSchool返回的标准数据结构
interface PSStandardRecord {
  id: number;
  name: string;
  tables: {
    standards: {
      subjectarea: string;
      description: string;
      id: string;
      name: string;
      identifier: string;
      dcid: string;
    };
  };
}

interface PSStandardsResponse {
  name: string;
  record: PSStandardRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/standards - 同步学科标准数据
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
    const log = await syncLogRepository.create('standards');
    await syncLogRepository.start(log.id);

    // 调用PowerSchool API - 无参数
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.standards`;
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

    const data: PSStandardsResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} standards from PowerSchool`);

    // 解析并保存标准数据
    const standardsToSave = data.record.map((record) => {
      const standard = record.tables.standards;
      return {
        psId: parseInt(standard.id, 10),
        psDcid: parseInt(standard.dcid, 10),
        identifier: standard.identifier,
        name: standard.name,
        description: standard.description || undefined,
        subjectArea: standard.subjectarea || undefined,
        isActive: true,
      };
    });

    console.log(`Parsed ${standardsToSave.length} standards`);

    // 批量保存到数据库
    await standardRepository.upsertMany(standardsToSave);

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, standardsToSave.length, {
      standards: standardsToSave.map(s => ({ 
        id: s.psId, 
        identifier: s.identifier,
        name: s.name,
        subjectArea: s.subjectArea,
      })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${standardsToSave.length} standards`,
      data: {
        count: standardsToSave.length,
        duration: `${duration}ms`,
        standards: standardsToSave.map(s => ({
          psId: s.psId,
          identifier: s.identifier,
          name: s.name,
          subjectArea: s.subjectArea,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync standards:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync standards',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/standards - 获取已同步的标准列表
 */
export async function GET() {
  try {
    const standards = await standardRepository.findAll();
    
    return NextResponse.json({
      standards: standards.map(s => ({
        id: s.id,
        psId: s.psId,
        psDcid: s.psDcid,
        identifier: s.identifier,
        name: s.name,
        description: s.description,
        subjectArea: s.subjectArea,
        listOrder: s.listOrder,
        isActive: s.isActive,
        courseId: s.courseId,
      })),
      total: standards.length,
    });
  } catch (error) {
    console.error('Failed to get standards:', error);
    return NextResponse.json(
      { error: 'Failed to get standards', standards: [], total: 0 },
      { status: 500 }
    );
  }
}

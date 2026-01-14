/**
 * 学期同步API
 * 从PowerSchool获取学期数据并保存到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsRepository, schoolRepository, termRepository, syncLogRepository } from '@/lib/database/repositories';

// PowerSchool返回的学期数据结构
interface PSTermRecord {
  id: number;
  name: string;
  tables: {
    terms: {
      id: string;
      dcid: string;
      name: string;
      abbreviation: string;
      firstday: string;
      lastday: string;
      yearid: string;
      schoolid: string;
      isyearrec: string; // "0" 或 "1"
    };
  };
}

interface PSTermsResponse {
  name: string;
  record: PSTermRecord[];
  '@extensions'?: string;
}

/**
 * POST /api/sync/terms - 同步学期数据
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

    // 从请求body获取schoolId
    const body = await request.json().catch(() => ({}));
    const psSchoolId = body.schoolId;
    
    if (!psSchoolId) {
      return NextResponse.json(
        { error: 'School ID is required. Please select a school before syncing.' },
        { status: 400 }
      );
    }

    // 创建同步日志
    const log = await syncLogRepository.create('terms');
    await syncLogRepository.start(log.id);

    // 确保学校存在
    let school = await schoolRepository.findByPsId(psSchoolId);
    if (!school) {
      // 创建学校记录
      school = await schoolRepository.upsert({
        psId: psSchoolId,
        name: `School ${psSchoolId}`,
      });
    }

    // 调用PowerSchool API
    const baseUrl = config.endpoint.replace(/\/+$/, '');
    const apiUrl = `${baseUrl}/ws/schema/query/org.infocare.sync.terms`;
    console.log(`Calling PowerSchool API: ${apiUrl} with schoolid: ${psSchoolId}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        schoolid: psSchoolId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PowerSchool API error:', errorText);
      await syncLogRepository.fail(log.id, `PowerSchool API error: ${response.status}`);
      throw new Error(`PowerSchool API error: ${response.status} ${response.statusText}`);
    }

    const data: PSTermsResponse = await response.json();
    console.log(`Received ${data.record?.length || 0} terms from PowerSchool`);

    // 解析并保存学期数据
    const termsToSave = data.record.map((record) => {
      const term = record.tables.terms;
      return {
        psId: parseInt(term.id, 10),
        psDcid: parseInt(term.dcid, 10),
        name: term.name,
        abbreviation: term.abbreviation || undefined,
        firstDay: new Date(term.firstday),
        lastDay: new Date(term.lastday),
        yearId: parseInt(term.yearid, 10),
        isYearRec: term.isyearrec === '1',
        schoolId: school!.id,
      };
    });

    console.log(`Parsed ${termsToSave.length} terms`);

    // 批量保存到数据库
    await termRepository.upsertMany(termsToSave);

    // 设置当前学期（基于当前日期，优先选择isYearRec=true的记录）
    const now = new Date();
    let currentTermSet = false;
    
    // 首先尝试找到包含当前日期的学年记录
    const yearRecords = termsToSave.filter(t => t.isYearRec);
    for (const term of yearRecords) {
      if (now >= term.firstDay && now <= term.lastDay) {
        const dbTerm = await termRepository.findByPsId(term.psId);
        if (dbTerm) {
          await termRepository.setCurrent(dbTerm.id);
          currentTermSet = true;
          console.log(`Set current term (year): ${term.name}`);
          break;
        }
      }
    }

    // 如果没找到学年，尝试任何包含当前日期的学期
    if (!currentTermSet) {
      for (const term of termsToSave) {
        if (now >= term.firstDay && now <= term.lastDay) {
          const dbTerm = await termRepository.findByPsId(term.psId);
          if (dbTerm) {
            await termRepository.setCurrent(dbTerm.id);
            currentTermSet = true;
            console.log(`Set current term: ${term.name}`);
            break;
          }
        }
      }
    }

    // 如果没有找到当前学期，设置最新的学期为当前
    if (!currentTermSet && termsToSave.length > 0) {
      const latestTerm = [...termsToSave].sort((a, b) => 
        b.firstDay.getTime() - a.firstDay.getTime()
      )[0];
      const dbTerm = await termRepository.findByPsId(latestTerm.psId);
      if (dbTerm) {
        await termRepository.setCurrent(dbTerm.id);
        console.log(`Set latest term as current: ${latestTerm.name}`);
      }
    }

    const duration = Date.now() - startTime;
    await syncLogRepository.complete(log.id, termsToSave.length, {
      schoolId: psSchoolId,
      terms: termsToSave.map(t => ({ name: t.name, isYearRec: t.isYearRec })),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${termsToSave.length} terms`,
      data: {
        count: termsToSave.length,
        duration: `${duration}ms`,
        terms: termsToSave.map(t => ({
          psId: t.psId,
          name: t.name,
          abbreviation: t.abbreviation,
          firstDay: t.firstDay.toISOString().split('T')[0],
          lastDay: t.lastDay.toISOString().split('T')[0],
          yearId: t.yearId,
          isYearRec: t.isYearRec,
        })),
      },
    });

  } catch (error) {
    console.error('Failed to sync terms:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync terms',
        duration: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/terms - 获取已同步的学期列表
 */
export async function GET() {
  try {
    const terms = await termRepository.findAll();
    const currentTerm = await termRepository.findCurrent();
    
    return NextResponse.json({
      terms: terms.map(t => ({
        id: t.id,
        psId: t.psId,
        psDcid: t.psDcid,
        name: t.name,
        abbreviation: t.abbreviation,
        firstDay: t.firstDay.toISOString().split('T')[0],
        lastDay: t.lastDay.toISOString().split('T')[0],
        yearId: t.yearId,
        isYearRec: t.isYearRec,
        isCurrent: t.isCurrent,
        schoolId: t.schoolId,
      })),
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
      } : null,
      total: terms.length,
    });
  } catch (error) {
    console.error('Failed to get terms:', error);
    return NextResponse.json(
      { error: 'Failed to get terms', terms: [] },
      { status: 500 }
    );
  }
}

'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User, Menu, RefreshCw, Building2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui';

interface School {
  id: string;
  psId: number;
  name: string;
  abbreviation: string | null;
  schoolNumber: string | null;
}

interface Term {
  id: string;
  psId: number;
  name: string;
  abbreviation: string | null;
  firstDay: string;
  lastDay: string;
  yearId: number;
  isYearRec: boolean;
  isCurrent: boolean;
}

export function Header() {
  const { data: session } = useSession();
  const [schools, setSchools] = useState<School[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [currentSchoolId, setCurrentSchoolId] = useState<string>('');
  const [currentTermId, setCurrentTermId] = useState<string>('');
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);

  // 获取学校数据
  useEffect(() => {
    async function fetchSchools() {
      try {
        const response = await fetch('/api/sync/schools');
        if (response.ok) {
          const data = await response.json();
          // 只显示 school_number 为 1,2,3,4,5 的学校
          const validSchoolNumbers = ['1', '2', '3', '4'];
          const filteredSchools = (data.schools || []).filter((s: School) => 
            s.schoolNumber && validSchoolNumbers.includes(s.schoolNumber)
          );
          setSchools(filteredSchools);
          
          // 默认选择 "All"（空字符串表示全部）
          // 使用 schoolNumber 作为标识（与 students.ps_school_id 关联）
          const savedSchoolId = localStorage.getItem('selectedSchoolId');
          if (savedSchoolId && savedSchoolId !== 'all') {
            const savedSchool = filteredSchools.find((s: School) => s.schoolNumber === savedSchoolId);
            setCurrentSchoolId(savedSchool ? savedSchool.schoolNumber! : 'all');
          } else {
            setCurrentSchoolId('all');
          }
        }
      } catch (error) {
        console.error('Failed to fetch schools:', error);
      } finally {
        setIsLoadingSchools(false);
      }
    }

    fetchSchools();
  }, []);

  // 获取学期数据
  useEffect(() => {
    async function fetchTerms() {
      try {
        const response = await fetch('/api/sync/terms');
        if (response.ok) {
          const data = await response.json();
          // 优先显示学年记录
          const allTerms = data.terms || [];
          const yearRecords = allTerms.filter((t: Term) => t.isYearRec);
          setTerms(yearRecords.length > 0 ? yearRecords : allTerms);
          
          // 设置当前选中的学期
          if (data.currentTerm) {
            setCurrentTermId(data.currentTerm.id);
          } else if (allTerms.length > 0) {
            setCurrentTermId(allTerms[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch terms:', error);
      } finally {
        setIsLoadingTerms(false);
      }
    }

    fetchTerms();
  }, []);

  // 处理学校切换
  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCurrentSchoolId(value);
    // 保存到localStorage（保存 schoolNumber 作为标识，与 students.ps_school_id 关联）
    localStorage.setItem('selectedSchoolId', value);
    // 触发页面刷新或全局状态更新，传递 schoolNumber
    window.dispatchEvent(new CustomEvent('schoolChanged', { detail: { schoolId: value } }));
  };

  // 处理学期切换
  const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const termId = e.target.value;
    setCurrentTermId(termId);
    // 触发页面刷新或全局状态更新
    window.dispatchEvent(new CustomEvent('termChanged', { detail: { termId } }));
  };

  // 格式化学期显示名称
  const formatTermName = (term: Term) => {
    if (term.abbreviation) {
      return term.abbreviation;
    }
    // 从name中提取简短名称
    const match = term.name.match(/(\d{4}-\d{4})/);
    return match ? match[1] : term.name;
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-6">
        {/* 左侧 - 移动端菜单按钮 */}
        <button className="lg:hidden p-2 text-slate-600 hover:bg-[#f5f3f7] rounded-lg">
          <Menu className="w-5 h-5" />
        </button>

        {/* 左侧占位 - 保持右侧内容靠右 */}
        <div className="flex-1" />

        {/* 右侧 - 学校、学年选择和用户信息 */}
        <div className="flex items-center gap-3">
          {/* 学校选择 */}
          {isLoadingSchools ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 rounded-lg text-slate-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
            </div>
          ) : schools.length > 0 ? (
            <div className="hidden md:flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select 
                className="px-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-[#3d2563] focus:border-transparent cursor-pointer min-w-[140px]"
                value={currentSchoolId}
                onChange={handleSchoolChange}
              >
                <option value="all">All Schools</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.schoolNumber || ''}>
                    {school.abbreviation}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* 学期选择 */}
          {isLoadingTerms ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm bg-[#f5f3f7] rounded-lg text-[#2E1A4A]">
              <RefreshCw className="w-3 h-3 animate-spin" />
            </div>
          ) : terms.length > 0 ? (
            <div className="hidden sm:flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3d2563]" />
              <select 
                className="px-2 py-1.5 text-sm bg-[#f5f3f7] border-0 rounded-lg text-[#2E1A4A] focus:ring-2 focus:ring-[#3d2563] cursor-pointer min-w-[100px]"
                value={currentTermId}
                onChange={handleTermChange}
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {formatTermName(term)}
                    {term.isCurrent ? ' ●' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="hidden sm:block px-3 py-1.5 text-sm bg-slate-100 rounded-lg text-slate-500">
              No terms
            </span>
          )}

          {/* 分隔线 */}
          <div className="hidden sm:block h-8 w-px bg-slate-200" />

          {/* 用户下拉菜单 */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-slate-500">
                {session?.user?.email}
              </p>
            </div>
            <div className="flex items-center justify-center w-9 h-9 bg-[#f5f3f7] rounded-full">
              <User className="w-4 h-4 text-[#2E1A4A]" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-slate-500 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

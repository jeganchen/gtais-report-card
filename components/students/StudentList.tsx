'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, FileText, Mail, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button, Badge, Loading } from '@/components/ui';
import { StudentTable } from './StudentTable';
import { BatchActions } from './BatchActions';
import { useSelectionStore } from '@/stores/useSelectionStore';
import type { Student } from '@/types';

export function StudentList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const { selectedIds } = useSelectionStore();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 防抖处理搜索查询
  useEffect(() => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的定时器，500ms 后更新 debouncedSearchQuery
    debounceTimerRef.current = setTimeout(() => {
      // 在更新前检查并保存焦点状态
      const hadFocus = searchInputRef.current && document.activeElement === searchInputRef.current;
      const cursorPosition = hadFocus && searchInputRef.current ? searchInputRef.current.selectionStart : null;
      
      setDebouncedSearchQuery(searchQuery);
      
      // 如果之前有焦点，在下一个事件循环中恢复
      if (hadFocus && searchInputRef.current) {
        requestAnimationFrame(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            // 恢复光标位置
            if (cursorPosition !== null) {
              searchInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
            }
          }
        });
      }
    }, 500);

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // 获取当前选择的学校 ID (psId)
  useEffect(() => {
    // 从 localStorage 获取上次选择的学校，默认为 'all'
    // 现在存储的是 psId（PowerSchool school ID）
    const savedSchoolId = localStorage.getItem('selectedSchoolId') || 'all';
    setCurrentSchoolId(savedSchoolId);

    // 监听学校变化事件
    const handleSchoolChanged = (e: CustomEvent<{ schoolId: string }>) => {
      setCurrentSchoolId(e.detail.schoolId);
      localStorage.setItem('selectedSchoolId', e.detail.schoolId);
    };

    window.addEventListener('schoolChanged', handleSchoolChanged as EventListener);
    
    return () => {
      window.removeEventListener('schoolChanged', handleSchoolChanged as EventListener);
    };
  }, []);

  // 从 API 获取学生数据（使用防抖后的搜索查询）
  useEffect(() => {
    async function fetchStudents() {
      if (!currentSchoolId) {
        setIsLoading(false);
        setStudents([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: '1',
          pageSize: '1000', // 获取所有学生
        });

        if (debouncedSearchQuery) {
          params.append('search', debouncedSearchQuery);
        }

        if (gradeFilter !== null) {
          params.append('grade', gradeFilter.toString());
        }

        // 如果不是 "all"，才添加 schoolId 过滤
        if (currentSchoolId !== 'all') {
          params.append('schoolId', currentSchoolId);
        }

        const response = await fetch(`/api/students?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }

        const data = await response.json();
        setStudents(data.students || []);
      } catch (err) {
        console.error('Failed to fetch students:', err);
        setError(err instanceof Error ? err.message : 'Failed to load students');
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStudents();
  }, [currentSchoolId, debouncedSearchQuery, gradeFilter]);

  // 使用 API 返回的学生数据（已经过服务器端过滤）
  const filteredStudents = students;

  // 获取所有年级
  const grades = useMemo(() => {
    const gradeSet = new Set(students.map((s) => s.gradeLevel));
    return Array.from(gradeSet).sort((a, b) => a - b);
  }, [students]);

  // 统计信息
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const pdfGenerated = filteredStudents.filter((s) => s.pdfGenerated).length;
    return { total, pdfGenerated, pending: total - pdfGenerated };
  }, [filteredStudents]);

  const handleViewReport = (student: Student) => {
    router.push(`/report/${student.id}`);
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12">
        <Loading text="Loading students..." />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              // 重新触发 useEffect
              setCurrentSchoolId(currentSchoolId);
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f5eaf3] rounded-lg">
              <FileText className="w-5 h-5 text-[#6b2d5b]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Total Students</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pdfGenerated}</p>
              <p className="text-sm text-slate-500">PDF Generated</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
              <p className="text-sm text-slate-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和过滤栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name or student number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b3d75] focus:border-transparent"
          />
        </div>

        {/* 年级过滤 */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={gradeFilter ?? ''}
            onChange={(e) => setGradeFilter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b3d75]"
          >
            <option value="">All Grades</option>
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <BatchActions
          selectedCount={selectedIds.size}
          students={filteredStudents}
        />
      )}

      {/* 学生表格 */}
      <StudentTable
        students={filteredStudents}
        onViewReport={handleViewReport}
      />
    </div>
  );
}

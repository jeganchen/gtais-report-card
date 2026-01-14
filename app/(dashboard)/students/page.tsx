/**
 * 学生列表页
 */

import { Suspense } from 'react';
import { StudentList } from '@/components/students/StudentList';
import { Loading } from '@/components/ui';

export const metadata = {
  title: 'Students - PS Report Card',
  description: 'View and manage student report cards',
};

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="text-slate-500 mt-1">
          Manage student report cards for the current school year
        </p>
      </div>

      {/* 学生列表 */}
      <Suspense fallback={<Loading text="Loading students..." />}>
        <StudentList />
      </Suspense>
    </div>
  );
}


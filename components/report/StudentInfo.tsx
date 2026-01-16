'use client';

import type { Student } from '@/types';
import { getGradeLevelName } from '@/lib/config/grade.config';

interface StudentInfoProps {
  student: Student;
  schoolYear: string;
  generatedDate?: string;
}

export function StudentInfo({ student, schoolYear, generatedDate }: StudentInfoProps) {
  const currentDate = generatedDate || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
      <div className="flex">
        <span className="font-semibold text-slate-700 w-28">Name:</span>
        <span className="text-slate-900">
          {student.firstName} {student.lastName}
          {student.chineseName && ` (${student.chineseName})`}
        </span>
      </div>

      <div className="flex">
        <span className="font-semibold text-slate-700 w-28">Date:</span>
        <span className="text-slate-900">{currentDate}</span>
      </div>

      <div className="flex">
        <span className="font-semibold text-slate-700 w-28">Grade Level:</span>
        <span className="text-slate-900">{getGradeLevelName(student.gradeLevel)}</span>
      </div>

      <div className="flex">
        <span className="font-semibold text-slate-700 w-28">Year:</span>
        <span className="text-slate-900">{schoolYear}</span>
      </div>
    </div>
  );
}

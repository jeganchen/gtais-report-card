'use client';

import { Eye, Check, Minus } from 'lucide-react';
import { Button, Badge, Checkbox } from '@/components/ui';
import { useSelectionStore } from '@/stores/useSelectionStore';
import type { Student } from '@/types';

interface StudentTableProps {
  students: Student[];
  onViewReport: (student: Student) => void;
}

export function StudentTable({ students, onViewReport }: StudentTableProps) {
  const {
    selectedIds,
    toggleOne,
    toggleAll,
    isSelected,
    isAllSelected,
    isSomeSelected,
  } = useSelectionStore();

  const studentIds = students.map((s) => s.id);
  const allSelected = isAllSelected(studentIds);
  const someSelected = isSomeSelected(studentIds);

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500">No students found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-12 px-4 py-3">
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => toggleAll(studentIds)}
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${
                        allSelected || someSelected
                          ? 'bg-[#6b2d5b] border-[#6b2d5b]'
                          : 'bg-white border-slate-300 hover:border-[#8b3d75]'
                      }
                    `}
                  >
                    {someSelected ? (
                      <Minus className="w-3 h-3 text-white" strokeWidth={3} />
                    ) : allSelected ? (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    ) : null}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                School
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Grade/Class
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Guardian
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                PDF Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => {
              const selected = isSelected(student.id);
              return (
                <tr
                  key={student.id}
                  className={`
                    transition-colors duration-150 hover:bg-slate-50
                    ${selected ? 'bg-[#faf5f9]' : ''}
                  `}
                >
                  {/* 复选框 */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selected}
                        onChange={() => toggleOne(student.id)}
                      />
                    </div>
                  </td>

                  {/* 学生信息 */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#6b2d5b] to-[#8b3d75] rounded-full text-white font-semibold text-sm">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {student.chineseName && `${student.chineseName} · `}
                          #{student.studentNumber}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* 学校 */}
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-700">
                      {student.schoolName || '-'}
                    </span>
                  </td>

                  {/* 年级/班级 */}
                  <td className="px-4 py-4">
                    <Badge variant="primary">
                      Grade {student.gradeLevel}{student.homeRoom ? ` · ${student.homeRoom}` : ''}
                    </Badge>
                  </td>

                  {/* 家长信息 */}
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm text-slate-900">{student.guardianName || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{student.guardianEmail || 'N/A'}</p>
                    </div>
                  </td>

                  {/* PDF状态 */}
                  <td className="px-4 py-4 text-center">
                    {student.pdfGenerated ? (
                      <Badge variant="success">Generated</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </td>

                  {/* 操作按钮 */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onViewReport(student)}
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        View Report
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

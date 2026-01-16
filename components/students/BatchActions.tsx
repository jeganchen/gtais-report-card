'use client';

import { useState } from 'react';
import { Send, X, FileDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { useSelectionStore } from '@/stores/useSelectionStore';
import type { Student } from '@/types';

interface BatchActionsProps {
  selectedCount: number;
  students: Student[];
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: Array<{ studentId: string; studentName: string; error: string }>;
}

export function BatchActions({ selectedCount, students }: BatchActionsProps) {
  const { selectedIds, unselectAll } = useSelectionStore();
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  // 获取选中的学生
  const selectedStudents = students.filter((s) => selectedIds.has(s.id));
  
  // 已生成 PDF 的学生数量
  const pdfReadyCount = selectedStudents.filter((s) => s.pdfGenerated).length;
  
  // 有家长邮箱的学生（用于发送邮件）
  const emailReadyCount = selectedStudents.filter((s) => s.guardianEmail).length;

  const handleSendEmails = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    // 检查是否有学生有家长邮箱
    const studentsWithEmail = selectedStudents.filter((s) => s.guardianEmail);
    if (studentsWithEmail.length === 0) {
      alert('None of the selected students have guardian email addresses.');
      return;
    }

    const confirmMessage = `This will send report card emails to ${studentsWithEmail.length} parent(s).\n\nStudents without guardian email will be skipped.\n\nContinue?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          yearId: 35, // TODO: 从页面状态获取当前学年
        }),
      });

      const result: SendResult = await response.json();

      if (!response.ok) {
        throw new Error(result.failed?.[0]?.error || 'Failed to send emails');
      }

      setSendResult(result);
      setShowResultModal(true);

      if (result.success && result.sent > 0) {
        // 清空选择
        unselectAll();
      }

    } catch (error) {
      console.error('Failed to send emails:', error);
      setSendResult({
        success: false,
        sent: 0,
        failed: [{
          studentId: '',
          studentName: '',
          error: error instanceof Error ? error.message : 'Failed to send emails',
        }],
      });
      setShowResultModal(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleGeneratePDFs = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    setIsGenerating(true);

    try {
      // 批量生成 PDF（下载）
      for (const student of selectedStudents) {
        const response = await fetch(`/api/report/${student.id}/pdf`);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Report_${student.firstName}_${student.lastName}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }

      alert(`Generated ${selectedStudents.length} PDF(s)`);
    } catch (error) {
      console.error('Failed to generate PDFs:', error);
      alert('Failed to generate some PDFs');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-[#f5f3f7] border border-[#d7cfdf] rounded-xl">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[#545860]">
            {selectedCount} student{selectedCount > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 text-xs text-[#3d2563]">
            {pdfReadyCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                {pdfReadyCount} PDF ready
              </span>
            )}
            {emailReadyCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {emailReadyCount} with email
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={unselectAll}
            leftIcon={<X className="w-4 h-4" />}
          >
            Clear
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleGeneratePDFs}
            disabled={isGenerating || selectedCount === 0}
            leftIcon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          >
            {isGenerating ? 'Generating...' : `Generate PDFs (${selectedCount})`}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSendEmails}
            disabled={emailReadyCount === 0 || isSending}
            leftIcon={isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          >
            {isSending ? 'Sending...' : `Send to Parents (${emailReadyCount})`}
          </Button>
        </div>
      </div>

      {/* 发送结果弹窗 */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Email Send Result"
      >
        <div className="space-y-4">
          {sendResult && (
            <>
              {/* 成功信息 */}
              {sendResult.sent > 0 && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-emerald-800">
                      Successfully sent {sendResult.sent} email{sendResult.sent > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-emerald-600 mt-1">
                      Report cards have been sent to parents.
                    </p>
                  </div>
                </div>
              )}

              {/* 失败信息 */}
              {sendResult.failed.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-800">
                        {sendResult.failed.length} email{sendResult.failed.length > 1 ? 's' : ''} failed
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 max-h-40 overflow-y-auto">
                    {sendResult.failed.map((fail, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-700 py-1 border-t border-red-200 first:border-t-0"
                      >
                        <span className="font-medium">{fail.studentName || 'Unknown'}: </span>
                        <span>{fail.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 无操作 */}
              {sendResult.sent === 0 && sendResult.failed.length === 0 && (
                <div className="text-center py-4 text-slate-500">
                  No emails were sent.
                </div>
              )}
            </>
          )}

          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setShowResultModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

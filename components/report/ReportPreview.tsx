'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer, Check, Loader2, AlertCircle, Send, CheckCircle } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { ReportHeader } from './ReportHeader';
import { StudentInfo } from './StudentInfo';
import { AttendanceSummary } from './AttendanceSummary';
import { AssessmentKey } from './AssessmentKey';
import { SubjectGrades } from './SubjectGrades';
import { ReportFooter } from './ReportFooter';
import type { ReportData } from '@/types';

interface ReportPreviewProps {
  reportData: ReportData;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: Array<{ studentId: string; studentName: string; error: string }>;
}

export function ReportPreview({ reportData }: ReportPreviewProps) {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGenerated, setIsGenerated] = useState(reportData.student.pdfGenerated);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 调用API生成PDF
      const response = await fetch(`/api/report/${reportData.student.id}/pdf`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // 获取PDF blob
      const blob = await response.blob();
      
      // 创建下载URL
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsGenerated(true);

      // 自动触发下载
      const fileName = `Report_${reportData.student.firstName}_${reportData.student.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (pdfUrl) {
      // 如果已有PDF URL，直接下载
      const fileName = `Report_${reportData.student.firstName}_${reportData.student.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // 否则重新生成并下载
    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/report/${reportData.student.id}/pdf`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      const fileName = `Report_${reportData.student.firstName}_${reportData.student.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('PDF download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!reportData.student.guardianEmail) {
      setError('No guardian email address available for this student.');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);
    setSendResult(null);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: [reportData.student.id],
          yearId: 35, // TODO: 从页面获取当前学年
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // API 返回 400/500 时，error 字段包含错误信息
        throw new Error(result.error || 'Failed to send email');
      }

      const sendResult = result as SendResult;

      setSendResult(sendResult);

      if (sendResult.success && sendResult.sent > 0) {
        const emailCount = reportData.student.guardianEmail?.split(',').length || 1;
        setSuccessMessage(`Email sent successfully to ${emailCount} recipient${emailCount > 1 ? 's' : ''}`);
        setIsGenerated(true);
      } else if (sendResult.failed.length > 0) {
        setShowSendModal(true);
      }

    } catch (err) {
      console.error('Email send error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const guardianEmail = reportData.student.guardianEmail;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 顶部工具栏 - 不打印 */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 no-print">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* 错误提示 */}
          {error && (
            <div className="mb-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          )}

          {/* 成功提示 */}
          {successMessage && (
            <div className="mb-3 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-emerald-500 hover:text-emerald-700"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/students')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Students
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-lg font-semibold text-slate-900">
                Report Preview - {reportData.student.firstName} {reportData.student.lastName}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print
              </Button>

              {isGenerated && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  leftIcon={isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                >
                  {isDownloading ? 'Downloading...' : 'Download PDF'}
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                leftIcon={
                  isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isGenerated ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )
                }
              >
                {isGenerating
                  ? 'Generating...'
                  : isGenerated
                  ? 'Regenerate PDF'
                  : 'Generate & Download PDF'}
              </Button>

              {/* 发送邮件按钮 */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendEmail}
                disabled={isSending || !guardianEmail}
                leftIcon={isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                title={guardianEmail ? `Send to ${guardianEmail}` : 'No guardian email available'}
              >
                {isSending ? 'Sending...' : 'Send to Parent'}
              </Button>
            </div>
          </div>

          {/* 家长邮箱信息 */}
          {guardianEmail && (
            <div className="mt-2 text-xs text-slate-500">
              Guardian Email{guardianEmail.includes(',') ? 's' : ''}: <span className="font-medium text-slate-700">{guardianEmail}</span>
            </div>
          )}
          {!guardianEmail && (
            <div className="mt-2 text-xs text-amber-600">
              ⚠️ No guardian email available for this student
            </div>
          )}
        </div>
      </div>

      {/* 报告内容 */}
      <div className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          {/* A4 比例的报告卡片 */}
          <div
            ref={reportRef}
            className="bg-white shadow-xl rounded-lg overflow-hidden print:shadow-none print:rounded-none"
          >
            <div className="p-8 print:p-6">
              {/* 页眉 - 使用官方信头 */}
              <ReportHeader />

              {/* 学生基本信息 */}
              <StudentInfo
                student={reportData.student}
                schoolYear={reportData.schoolYear}
                generatedDate={reportData.generatedDate}
              />

              {/* 考勤汇总 */}
              <AttendanceSummary attendance={reportData.attendance} />

              {/* 评分说明 */}
              <AssessmentKey />

              {/* 学科评价 */}
              <SubjectGrades grades={reportData.grades} />

              {/* 页脚 - 签名和联系信息 */}
              <ReportFooter
                signature={reportData.signature}
                showSignature={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 发送结果弹窗 */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="Email Send Result"
      >
        <div className="space-y-4">
          {sendResult && sendResult.failed.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">Failed to send email</p>
                  <p className="text-sm text-red-700 mt-1">
                    {sendResult.failed[0]?.error || 'Unknown error'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setShowSendModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

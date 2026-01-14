'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Trash2, Save, Loader2, ImageIcon } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { SignatureSettings as SignatureSettingsType } from '@/types';

interface SignatureSettingsProps {
  settings: SignatureSettingsType;
  onChange: (settings: SignatureSettingsType) => void;
}

export function SignatureSettings({ settings, onChange }: SignatureSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(settings.signatureImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当settings从数据库加载后更新previewUrl
  useEffect(() => {
    if (settings.signatureImageUrl !== previewUrl) {
      setPreviewUrl(settings.signatureImageUrl || null);
    }
  }, [settings.signatureImageUrl]);

  const handleChange = (field: keyof SignatureSettingsType, value: string | undefined) => {
    onChange({ ...settings, [field]: value });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // 验证文件大小 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    setIsUploading(true);

    // 创建预览URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);
      handleChange('signatureImageUrl', dataUrl);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    handleChange('signatureImageUrl', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'signature',
          data: {
            principalName: settings.principalName,
            principalTitle: settings.principalTitle,
            signatureImageUrl: settings.signatureImageUrl,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      alert('Signature settings saved successfully!');
    } catch (error) {
      alert(`Error saving settings: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 校长信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Principal Name"
          placeholder="Enter principal's name"
          value={settings.principalName}
          onChange={(e) => handleChange('principalName', e.target.value)}
        />
        <Input
          label="Title"
          placeholder="Principal"
          value={settings.principalTitle}
          onChange={(e) => handleChange('principalTitle', e.target.value)}
        />
      </div>

      {/* 签名图片上传 */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="font-medium text-slate-900 mb-2">Signature Image</h4>
        <p className="text-sm text-slate-500 mb-4">
          Upload a signature image to be displayed on report cards. Recommended: PNG with transparent background.
        </p>

        <div className="flex items-start gap-6">
          {/* 预览区域 */}
          <div className="w-64 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            ) : previewUrl ? (
              <div className="relative w-full h-full p-2">
                <Image
                  src={previewUrl}
                  alt="Signature preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm">No signature uploaded</span>
              </div>
            )}
          </div>

          {/* 上传按钮 */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload Image
            </Button>
            {previewUrl && (
              <Button
                variant="ghost"
                onClick={handleRemoveImage}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Remove
              </Button>
            )}
          </div>
        </div>

        {/* 上传要求 */}
        <div className="mt-4 text-sm text-slate-500">
          <p>Requirements:</p>
          <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
            <li>Image format: PNG, JPG, or GIF</li>
            <li>Maximum file size: 2MB</li>
            <li>Recommended size: 400×200 pixels</li>
            <li>PNG with transparent background is recommended</li>
          </ul>
        </div>
      </div>

      {/* 预览效果 */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="font-medium text-slate-900 mb-4">Preview on Report</h4>
        <div className="p-6 bg-white border border-slate-200 rounded-lg">
          <div className="flex justify-end">
            <div className="w-64 text-center">
              {previewUrl ? (
                <div className="h-16 mb-2 relative">
                  <Image
                    src={previewUrl}
                    alt="Signature"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 border-b border-slate-300 mb-2"></div>
              )}
              <p className="text-sm text-slate-900 font-medium">
                {settings.principalName || '[Principal Name]'}
              </p>
              <p className="text-xs text-slate-500">
                {settings.principalTitle || 'Principal'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}


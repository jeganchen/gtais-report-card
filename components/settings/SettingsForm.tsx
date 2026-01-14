'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PowerSchoolSettings } from './PowerSchoolSettings';
import { AzureADSettings } from './AzureADSettings';
import { SMTPSettings } from './SMTPSettings';
import { SignatureSettings } from './SignatureSettings';
import { defaultSettings, type SystemSettings } from '@/types';

type SettingsTab = 'powerschool' | 'azure' | 'smtp' | 'signature';

const tabs: { id: SettingsTab; label: string; description: string }[] = [
  { id: 'powerschool', label: 'PowerSchool', description: 'PowerSchool SIS integration settings' },
  { id: 'azure', label: 'Office 365', description: 'Azure AD authentication settings' },
  { id: 'smtp', label: 'Email (SMTP)', description: 'Email server configuration' },
  { id: 'signature', label: 'Signature', description: 'Principal signature settings' },
];

export function SettingsForm() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('powerschool');
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 从API获取设置数据
  useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
          throw new Error('Failed to load settings');
        }
        
        const data = await response.json();
        
        if (data.settings) {
          // 合并API返回的数据与默认值，确保所有字段都有值
          setSettings({
            powerSchool: {
              ...defaultSettings.powerSchool,
              ...data.settings.powerSchool,
            },
            azureAD: {
              ...defaultSettings.azureAD,
              ...data.settings.azureAD,
            },
            smtp: {
              ...defaultSettings.smtp,
              ...data.settings.smtp,
            },
            signature: {
              ...defaultSettings.signature,
              ...data.settings.signature,
            },
            updatedAt: data.settings.updatedAt,
          });
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const updateSettings = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#6b2d5b]" />
          <p className="text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  // 加载错误状态
  if (loadError) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12">
        <div className="flex flex-col items-center justify-center gap-3">
          <p className="text-red-600">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-[#6b2d5b] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Tab 导航 */}
      <div className="border-b border-slate-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-4 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-[#6b2d5b] text-[#6b2d5b]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 内容 */}
      <div className="p-6">
        {/* Tab 描述 */}
        <p className="text-sm text-slate-500 mb-6">
          {tabs.find((t) => t.id === activeTab)?.description}
        </p>

        {/* PowerSchool 设置 */}
        {activeTab === 'powerschool' && (
          <PowerSchoolSettings
            settings={settings.powerSchool}
            onChange={(value) => updateSettings('powerSchool', value)}
          />
        )}

        {/* Azure AD 设置 */}
        {activeTab === 'azure' && (
          <AzureADSettings
            settings={settings.azureAD}
            onChange={(value) => updateSettings('azureAD', value)}
          />
        )}

        {/* SMTP 设置 */}
        {activeTab === 'smtp' && (
          <SMTPSettings
            settings={settings.smtp}
            onChange={(value) => updateSettings('smtp', value)}
          />
        )}

        {/* 签名设置 */}
        {activeTab === 'signature' && (
          <SignatureSettings
            settings={settings.signature}
            onChange={(value) => updateSettings('signature', value)}
          />
        )}
      </div>
    </div>
  );
}

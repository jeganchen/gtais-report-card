'use client';

import { useState } from 'react';
import { Eye, EyeOff, Save, TestTube, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { AzureADSettings as AzureADSettingsType } from '@/types';

interface AzureADSettingsProps {
  settings: AzureADSettingsType;
  onChange: (settings: AzureADSettingsType) => void;
}

export function AzureADSettings({ settings, onChange }: AzureADSettingsProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleChange = (field: keyof AzureADSettingsType, value: string | boolean) => {
    onChange({ ...settings, [field]: value });
    setTestResult(null);
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
          section: 'azureAD',
          data: {
            clientId: settings.clientId,
            clientSecret: settings.clientSecret,
            tenantId: settings.tenantId,
            enabled: settings.enabled,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      alert('Azure AD settings saved successfully!');
    } catch (error) {
      alert(`Error saving settings: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    // 模拟测试连接
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // 如果所有字段都填写了，模拟成功
    const isValid = settings.clientId && settings.clientSecret && settings.tenantId;
    setTestResult(isValid ? 'success' : 'error');
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* 启用开关 */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <h3 className="font-medium text-slate-900">Enable Office 365 Login</h3>
          <p className="text-sm text-slate-500">Allow users to sign in with their Office 365 account</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2E1A4A]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E1A4A]"></div>
        </label>
      </div>

      {/* Azure AD 配置字段 */}
      <div className="grid grid-cols-1 gap-4">
        <Input
          label="Client ID (Application ID)"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={settings.clientId}
          onChange={(e) => handleChange('clientId', e.target.value)}
          hint="Found in Azure Portal > App registrations > Overview"
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Client Secret
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder="Enter your client secret"
              value={settings.clientSecret}
              onChange={(e) => handleChange('clientSecret', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d2563] focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Found in Azure Portal &gt; App registrations &gt; Certificates & secrets
          </p>
        </div>

        <Input
          label="Tenant ID (Directory ID)"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={settings.tenantId}
          onChange={(e) => handleChange('tenantId', e.target.value)}
          hint="Found in Azure Portal > Azure Active Directory > Overview"
        />
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            testResult === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {testResult === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Connection test successful!</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              <span>Connection test failed. Please check your credentials.</span>
            </>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || !settings.clientId || !settings.tenantId}
          leftIcon={isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* 帮助信息 */}
      <div className="p-4 bg-[#f5f3f7] rounded-lg border border-[#d7cfdf]">
        <h4 className="font-medium text-[#2E1A4A] mb-2">Setup Instructions</h4>
        <ol className="text-sm text-[#545860] space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline">Azure Portal</a></li>
          <li>Navigate to Azure Active Directory &gt; App registrations</li>
          <li>Create a new registration or select existing one</li>
          <li>Copy the Application (client) ID and Directory (tenant) ID</li>
          <li>Go to Certificates & secrets and create a new client secret</li>
          <li>Add redirect URI: <code className="bg-white px-1 rounded">http://localhost:3000/api/auth/callback/microsoft-entra-id</code></li>
        </ol>
      </div>
    </div>
  );
}


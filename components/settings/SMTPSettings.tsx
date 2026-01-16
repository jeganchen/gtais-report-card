'use client';

import { useState } from 'react';
import { Eye, EyeOff, Save, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { SMTPSettings as SMTPSettingsType } from '@/types';

interface SMTPSettingsProps {
  settings: SMTPSettingsType;
  onChange: (settings: SMTPSettingsType) => void;
}

export function SMTPSettings({ settings, onChange }: SMTPSettingsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const handleChange = (field: keyof SMTPSettingsType, value: string | number | boolean) => {
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
          section: 'smtp',
          data: {
            host: settings.host,
            port: settings.port,
            secure: settings.secure,
            username: settings.username,
            password: settings.password,
            fromEmail: settings.fromEmail,
            fromName: settings.fromName,
            enabled: settings.enabled,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      alert('SMTP settings saved successfully!');
    } catch (error) {
      alert(`Error saving settings: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const [testError, setTestError] = useState<string | null>(null);

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }
    
    // 先保存设置，再发送测试邮件
    if (!settings.host || !settings.username || !settings.password) {
      alert('Please fill in SMTP host, username and password first');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);
    
    try {
      // 先保存SMTP配置
      const saveResponse = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'smtp',
          data: {
            host: settings.host,
            port: settings.port,
            secure: settings.secure,
            username: settings.username,
            password: settings.password,
            fromEmail: settings.fromEmail,
            fromName: settings.fromName,
            enabled: settings.enabled,
          },
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save SMTP settings before testing');
      }
      
      // 发送测试邮件
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestError(data.error || 'Unknown error');
      }
    } catch (error) {
      setTestResult('error');
      setTestError(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 启用开关 */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <h3 className="font-medium text-slate-900">Enable Email Sending</h3>
          <p className="text-sm text-slate-500">Send report cards to parents via email</p>
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

      {/* SMTP 服务器配置 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="SMTP Host"
          placeholder="smtp.example.com"
          value={settings.host}
          onChange={(e) => handleChange('host', e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Port"
            type="number"
            placeholder="587"
            value={settings.port.toString()}
            onChange={(e) => handleChange('port', parseInt(e.target.value) || 587)}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Security
            </label>
            <select
              value={settings.secure ? 'ssl' : 'tls'}
              onChange={(e) => handleChange('secure', e.target.value === 'ssl')}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d2563] focus:border-transparent"
            >
              <option value="tls">TLS (Port 587)</option>
              <option value="ssl">SSL (Port 465)</option>
            </select>
          </div>
        </div>

        <Input
          label="Username"
          placeholder="your-email@example.com"
          value={settings.username}
          onChange={(e) => handleChange('username', e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter SMTP password"
              value={settings.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d2563] focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* 发件人信息 */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="font-medium text-slate-900 mb-4">Sender Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="From Email"
            type="email"
            placeholder="noreply@school.edu"
            value={settings.fromEmail}
            onChange={(e) => handleChange('fromEmail', e.target.value)}
          />
          <Input
            label="From Name"
            placeholder="GTIIT School"
            value={settings.fromName}
            onChange={(e) => handleChange('fromName', e.target.value)}
          />
        </div>
      </div>

      {/* 测试邮件 */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="font-medium text-slate-900 mb-4">Test Email</h4>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              label="Test Email Address"
              type="email"
              placeholder="your-email@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleTestEmail}
            disabled={isTesting || !testEmail}
            leftIcon={isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          >
            {isTesting ? 'Sending...' : 'Send Test'}
          </Button>
        </div>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg ${
            testResult === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {testResult === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Test email sent successfully! Check your inbox.</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Failed to send test email</p>
                {testError && <p className="text-sm mt-1">{testError}</p>}
              </div>
            </>
          )}
        </div>
      )}

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

      {/* 常用SMTP配置 */}
      <div className="p-4 bg-[#f5f3f7] rounded-lg border border-[#d7cfdf]">
        <h4 className="font-medium text-[#2E1A4A] mb-2">Common SMTP Configurations</h4>
        <div className="text-sm text-[#545860] space-y-2">
          <div className="grid grid-cols-3 gap-2 font-medium border-b border-[#d7cfdf] pb-1">
            <span>Provider</span>
            <span>Host</span>
            <span>Port</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span>Gmail</span>
            <span>smtp.gmail.com</span>
            <span>587 (TLS)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span>Outlook/O365</span>
            <span>smtp.office365.com</span>
            <span>587 (TLS)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span>QQ Mail</span>
            <span>smtp.qq.com</span>
            <span>465 (SSL)</span>
          </div>
        </div>
      </div>
    </div>
  );
}


/**
 * 系统设置页面
 */

import { SettingsForm } from '@/components/settings/SettingsForm';

export const metadata = {
  title: 'Settings - GTIIT Report Card',
  description: 'System settings and configuration',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Configure system settings and integrations
        </p>
      </div>

      {/* 设置表单 */}
      <SettingsForm />
    </div>
  );
}


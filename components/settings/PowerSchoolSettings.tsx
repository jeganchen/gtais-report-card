'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, Key, Loader2, CheckCircle, XCircle, Clock, RefreshCw, Calendar, Users, Building2, GraduationCap, Database, BookOpen, ClipboardList, ClipboardCheck, UserCircle, Mail, Link2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { PowerSchoolSettings as PowerSchoolSettingsType } from '@/types';

interface SyncStatus {
  type: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message?: string;
  recordCount?: number;
}

interface SyncItem {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  requiresSchoolId: boolean;
  hidden?: boolean;  // 是否隐藏
}

interface School {
  id: string;
  psId: number;
  name: string;
  abbreviation: string | null;
}

interface PowerSchoolSettingsProps {
  settings: PowerSchoolSettingsType;
  onChange: (settings: PowerSchoolSettingsType) => void;
}

// 定义所有已实现的同步类型
const SYNC_ITEMS: SyncItem[] = [
  {
    key: 'schools',
    name: 'Schools',
    description: 'Sync school information',
    icon: <Building2 className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/schools',
    requiresSchoolId: false,
  },
  {
    key: 'terms',
    name: 'Terms',
    description: 'Sync terms and school years',
    icon: <Calendar className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/terms',
    requiresSchoolId: true,
  },
  {
    key: 'teachers',
    name: 'Teachers',
    description: 'Sync teacher information',
    icon: <GraduationCap className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/teachers',
    requiresSchoolId: false,
    hidden: true,  // 隐藏教师同步
  },
  {
    key: 'courses',
    name: 'Courses',
    description: 'Sync course definitions',
    icon: <BookOpen className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/courses',
    requiresSchoolId: false,
    hidden: true,  // 隐藏课程同步
  },
  {
    key: 'standards',
    name: 'Standards',
    description: 'Sync subject standards',
    icon: <ClipboardList className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/standards',
    requiresSchoolId: false,
    hidden: true,  // 隐藏标准同步
  },
  {
    key: 'attendance-codes',
    name: 'Attendance Codes',
    description: 'Sync attendance codes',
    icon: <ClipboardCheck className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/attendance-codes',
    requiresSchoolId: false,
    hidden: true,  // 隐藏考勤代码同步
  },
  {
    key: 'persons',
    name: 'Persons',
    description: 'Sync contact persons',
    icon: <UserCircle className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/persons',
    requiresSchoolId: false,
  },
  {
    key: 'email-addresses',
    name: 'Emails',
    description: 'Sync email addresses',
    icon: <Mail className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/email-addresses',
    requiresSchoolId: false,
  },
  {
    key: 'person-email-assocs',
    name: 'Person-Email',
    description: 'Link persons to emails',
    icon: <Link2 className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/person-email-assocs',
    requiresSchoolId: false,
  },
  {
    key: 'students',
    name: 'Students',
    description: 'Sync student data',
    icon: <Users className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/students',
    requiresSchoolId: false,  // 不再需要 schoolId，获取所有学生
  },
  {
    key: 'student-contacts',
    name: 'Student Contacts',
    description: 'Link students to contacts',
    icon: <Users className="w-5 h-5 text-[#6b2d5b]" />,
    endpoint: '/api/sync/student-contacts',
    requiresSchoolId: false,
  },
];

export function PowerSchoolSettings({ settings, onChange }: PowerSchoolSettingsProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [tokenResult, setTokenResult] = useState<'success' | 'error' | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // 学校列表和当前选择的学校
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  
  // 同步状态
  const initialSyncStatus: Record<string, SyncStatus> = {};
  SYNC_ITEMS.forEach(item => {
    initialSyncStatus[item.key] = { type: item.key, status: 'idle' };
  });
  initialSyncStatus['full'] = { type: 'full', status: 'idle' };
  
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>(initialSyncStatus);

  // 获取学校列表
  useEffect(() => {
    async function fetchSchools() {
      try {
        const response = await fetch('/api/sync/schools');
        if (response.ok) {
          const data = await response.json();
          setSchools(data.schools || []);
          
          // 从localStorage恢复选择或默认选择第一个
          if (data.schools?.length > 0) {
            const savedSchoolId = localStorage.getItem('selectedSchoolId');
            const savedSchool = data.schools.find((s: School) => s.id === savedSchoolId);
            setSelectedSchool(savedSchool || data.schools[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch schools:', error);
      } finally {
        setIsLoadingSchools(false);
      }
    }

    fetchSchools();
  }, []); // 只在组件挂载时执行一次
  
  // 监听学校变化事件（单独的useEffect）
  useEffect(() => {
    const handleSchoolChanged = (e: CustomEvent<{ schoolId: string }>) => {
      const school = schools.find(s => s.id === e.detail.schoolId);
      if (school) {
        setSelectedSchool(school);
      }
    };
    
    window.addEventListener('schoolChanged', handleSchoolChanged as EventListener);
    return () => {
      window.removeEventListener('schoolChanged', handleSchoolChanged as EventListener);
    };
  }, [schools]); // schools变化时更新事件处理器

  // 处理学校选择变化
  const handleSchoolSelect = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (school) {
      setSelectedSchool(school);
      localStorage.setItem('selectedSchoolId', schoolId);
    }
  };

  const handleChange = (field: keyof PowerSchoolSettingsType, value: string | boolean | number | undefined) => {
    onChange({ ...settings, [field]: value });
    setTokenResult(null);
    setTokenError(null);
    setSaveResult(null);
    setSaveError(null);
  };

  // 保存PowerSchool配置到数据库
  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);
    setSaveError(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: 'powerSchool',
          data: {
            endpoint: settings.endpoint,
            clientId: settings.clientId,
            clientSecret: settings.clientSecret,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaveResult('success');
      } else {
        setSaveResult('error');
        setSaveError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setSaveResult('error');
      setSaveError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsSaving(false);
    }
  };

  // 获取Token并保存到数据库
  const handleFetchToken = async () => {
    if (!settings.endpoint || !settings.clientId || !settings.clientSecret) {
      alert('Please fill in all required fields: Endpoint, Client ID, and Client Secret');
      return;
    }

    setIsFetchingToken(true);
    setTokenResult(null);
    setTokenError(null);

    try {
      const response = await fetch('/api/powerschool/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: settings.endpoint,
          clientId: settings.clientId,
          clientSecret: settings.clientSecret,
          saveToDb: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        onChange({
          ...settings,
          accessToken: data.access_token,
          tokenExpiresAt: data.expires_at,
        });
        setTokenResult('success');
      } else {
        setTokenResult('error');
        setTokenError(data.error || 'Failed to fetch token');
      }
    } catch (error) {
      setTokenResult('error');
      setTokenError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsFetchingToken(false);
    }
  };

  const handleClearToken = () => {
    onChange({
      ...settings,
      accessToken: undefined,
      tokenExpiresAt: undefined,
    });
    setTokenResult(null);
    setTokenError(null);
  };

  const formatExpiresAt = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    return date.toLocaleString();
  };

  const isTokenExpired = () => {
    if (!settings.tokenExpiresAt) return true;
    return new Date(settings.tokenExpiresAt) < new Date();
  };

  // 执行单个数据同步
  const handleSyncItem = async (item: SyncItem) => {
    setSyncStatus(prev => ({
      ...prev,
      [item.key]: { ...prev[item.key], status: 'syncing', message: undefined },
    }));

    try {
      const body: Record<string, unknown> = {};
      // 使用当前选择的学校的psId
      if (item.requiresSchoolId && selectedSchool) {
        body.schoolId = selectedSchool.psId;
      }

      const response = await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        setSyncStatus(prev => ({
          ...prev,
          [item.key]: {
            ...prev[item.key],
            status: 'success',
            message: data.message,
            recordCount: data.data?.count || data.data?.recordCount || 0,
          },
        }));
        
        // 如果同步了学校，刷新学校列表
        if (item.key === 'schools') {
          const schoolsResponse = await fetch('/api/sync/schools');
          if (schoolsResponse.ok) {
            const schoolsData = await schoolsResponse.json();
            setSchools(schoolsData.schools || []);
            if (!selectedSchool && schoolsData.schools?.length > 0) {
              setSelectedSchool(schoolsData.schools[0]);
            }
          }
        }
      } else {
        setSyncStatus(prev => ({
          ...prev,
          [item.key]: {
            ...prev[item.key],
            status: 'error',
            message: data.error || 'Sync failed',
          },
        }));
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        [item.key]: {
          ...prev[item.key],
          status: 'error',
          message: error instanceof Error ? error.message : 'Network error',
        },
      }));
    }
  };

  // 执行完整同步
  const handleFullSync = async () => {
    setSyncStatus(prev => ({
      ...prev,
      full: { ...prev.full, status: 'syncing', message: undefined },
    }));

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncStatus(prev => ({
          ...prev,
          full: {
            ...prev.full,
            status: 'success',
            message: data.message,
            recordCount: data.data?.recordCount || 0,
          },
        }));
      } else {
        setSyncStatus(prev => ({
          ...prev,
          full: {
            ...prev.full,
            status: 'error',
            message: data.error || 'Sync failed',
          },
        }));
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        full: {
          ...prev.full,
          status: 'error',
          message: error instanceof Error ? error.message : 'Network error',
        },
      }));
    }
  };

  // 检查是否可以同步
  const canSync = settings.accessToken && !isTokenExpired();
  const canSyncWithSchool = canSync && selectedSchool;

  return (
    <div className="space-y-6">
      {/* 启用开关 */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <h3 className="font-medium text-slate-900">Enable PowerSchool Integration</h3>
          <p className="text-sm text-slate-500">Connect to PowerSchool SIS for student data</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#6b2d5b]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6b2d5b]"></div>
        </label>
      </div>

      {/* PowerSchool 配置字段 */}
      <div className="grid grid-cols-1 gap-4">
        <Input
          label="PowerSchool Server URL"
          placeholder="https://your-school.powerschool.com"
          value={settings.endpoint}
          onChange={(e) => handleChange('endpoint', e.target.value)}
          hint="Enter your PowerSchool server URL without trailing slash"
        />

        <Input
          label="Client ID"
          placeholder="Enter your PowerSchool Plugin Client ID"
          value={settings.clientId}
          onChange={(e) => handleChange('clientId', e.target.value)}
          hint="Found in PowerSchool > System > Plugin Management Configuration"
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Client Secret
          </label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder="Enter your Client Secret"
              value={settings.clientSecret}
              onChange={(e) => handleChange('clientSecret', e.target.value)}
              className="block w-full rounded-lg border border-slate-300 pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8b3d75] focus:border-transparent"
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
            Found in PowerSchool &gt; System &gt; Plugin Management Configuration
          </p>
        </div>
      </div>

      {/* 保存配置按钮 */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* 保存结果提示 */}
      {saveResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          saveResult === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {saveResult === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Configuration saved successfully!</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              <span>Failed to save: {saveError}</span>
            </>
          )}
        </div>
      )}

      {/* Access Token 区域 */}
      <div className="pt-4 border-t border-slate-200">
        <h4 className="font-medium text-slate-900 mb-4">Access Token</h4>
        
        <div className={`p-4 rounded-lg mb-4 ${
          settings.accessToken
            ? isTokenExpired()
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-emerald-50 border border-emerald-200'
            : 'bg-slate-50 border border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.accessToken ? (
                isTokenExpired() ? (
                  <>
                    <Clock className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-amber-700">Token Expired</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium text-emerald-700">Token Active</span>
                  </>
                )
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-600">No Token</span>
                </>
              )}
            </div>
            {settings.accessToken && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearToken}
                className="text-red-600 hover:text-red-700"
              >
                Clear
              </Button>
            )}
          </div>

          {settings.accessToken && settings.tokenExpiresAt && (
            <p className="mt-2 text-xs text-slate-500">
              Expires: {formatExpiresAt(settings.tokenExpiresAt)}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleFetchToken}
          disabled={isFetchingToken || !settings.endpoint || !settings.clientId || !settings.clientSecret}
          leftIcon={isFetchingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
        >
          {isFetchingToken ? 'Fetching...' : settings.accessToken ? 'Refresh Token' : 'Get Access Token'}
        </Button>
      </div>

      {/* Token 获取结果 */}
      {tokenResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          tokenResult === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {tokenResult === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Access token obtained successfully!</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              <span>Failed: {tokenError}</span>
            </>
          )}
        </div>
      )}

      {/* 数据同步区域 */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-slate-900">Data Synchronization</h4>
            <p className="text-sm text-slate-500">Sync data from PowerSchool to local database</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleFullSync}
            disabled={!canSyncWithSchool || syncStatus.full.status === 'syncing'}
            leftIcon={syncStatus.full.status === 'syncing' 
              ? <Loader2 className="w-4 h-4 animate-spin" /> 
              : <Database className="w-4 h-4" />}
          >
            {syncStatus.full.status === 'syncing' ? 'Syncing All...' : 'Sync All'}
          </Button>
        </div>

        {!canSync && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <p className="text-sm text-amber-700">
              Please obtain a valid access token before syncing data.
            </p>
          </div>
        )}

        {/* 学校选择器 */}
        {canSync && (
          <div className="p-4 bg-slate-50 rounded-lg mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select School for Sync
            </label>
            {isLoadingSchools ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading schools...</span>
              </div>
            ) : schools.length > 0 ? (
              <div className="flex items-center gap-3">
                <select
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8b3d75] focus:border-transparent"
                  value={selectedSchool?.id || ''}
                  onChange={(e) => handleSchoolSelect(e.target.value)}
                >
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} {school.abbreviation ? `(${school.abbreviation})` : ''} - ID: {school.psId}
                    </option>
                  ))}
                </select>
                {selectedSchool && (
                  <span className="text-sm text-slate-500">
                    PowerSchool ID: <strong>{selectedSchool.psId}</strong>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600">
                No schools found. Please sync Schools first.
              </p>
            )}
          </div>
        )}

        {/* Full Sync 状态 */}
        {syncStatus.full.status !== 'idle' && syncStatus.full.status !== 'syncing' && (
          <div className={`p-3 rounded-lg mb-4 ${
            syncStatus.full.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus.full.status === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Full sync completed: {syncStatus.full.recordCount} total records</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>{syncStatus.full.message}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 单个同步项目（过滤掉隐藏的项目） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYNC_ITEMS.filter(item => !item.hidden).map((item) => {
            const status = syncStatus[item.key];
            const canSyncThis = item.requiresSchoolId ? canSyncWithSchool : canSync;
            
            return (
              <div key={item.key} className="p-4 border border-slate-200 rounded-lg hover:border-[#8b3d75] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  {item.icon}
                  <span className="font-medium text-slate-900">{item.name}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{item.description}</p>
                {item.requiresSchoolId && !selectedSchool && (
                  <p className="text-xs text-amber-600 mb-2">Select a school first</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncItem(item)}
                  disabled={!canSyncThis || status.status === 'syncing'}
                  leftIcon={status.status === 'syncing' 
                    ? <Loader2 className="w-4 h-4 animate-spin" /> 
                    : <RefreshCw className="w-4 h-4" />}
                  className="w-full"
                >
                  {status.status === 'syncing' ? 'Syncing...' : 'Sync'}
                </Button>
                {status.status !== 'idle' && status.status !== 'syncing' && (
                  <div className={`mt-2 text-xs ${
                    status.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {status.status === 'success' ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {status.recordCount} records
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {status.message?.substring(0, 30)}...
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 帮助信息 */}
      <div className="p-4 bg-[#faf5f9] rounded-lg border border-[#ebd5e7]">
        <h4 className="font-medium text-[#6b2d5b] mb-2">Setup Instructions</h4>
        <ol className="text-sm text-[#5a274c] space-y-1 list-decimal list-inside">
          <li>Login to PowerSchool as an administrator</li>
          <li>Go to System &gt; System Settings &gt; Plugin Management Configuration</li>
          <li>Install and enable the data access plugin</li>
          <li>Copy the Client ID and Client Secret</li>
          <li>Enter the credentials above and click &quot;Save Configuration&quot;</li>
          <li>Click &quot;Get Access Token&quot; to authenticate</li>
          <li>Sync Schools first to populate the school list</li>
          <li>Select a school and sync other data types</li>
        </ol>
      </div>
    </div>
  );
}

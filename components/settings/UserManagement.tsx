'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Loader2, CheckCircle, XCircle, Save, X, Users } from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';

interface User {
  email: string;
  name: string | null;
  role: 'admin' | 'teacher';
  provider: 'credentials' | 'azure-ad';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface CreateUserForm {
  email: string;
  name: string;
  role: 'admin' | 'teacher';
  provider: 'credentials' | 'azure-ad';
  password: string;
  confirmPassword: string;
}

const initialFormState: CreateUserForm = {
  email: '',
  name: '',
  role: 'teacher',
  provider: 'credentials',
  password: '',
  confirmPassword: '',
};

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // 添加用户表单状态
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CreateUserForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 编辑用户状态
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; role: 'admin' | 'teacher'; isActive: boolean; password?: string }>({
    name: '',
    role: 'teacher',
    isActive: true,
  });

  // 加载用户列表
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      const response = await fetch('/api/users');
      
      if (response.status === 401) {
        setLoadError('Please log in to access user management');
        return;
      }
      
      if (response.status === 403) {
        setLoadError('You do not have permission to manage users');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理表单输入
  const handleInputChange = (field: keyof CreateUserForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSubmitResult(null);
  };

  // 提交新用户
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!formData.email) {
      setSubmitResult({ type: 'error', message: 'Email is required' });
      return;
    }
    
    if (formData.provider === 'credentials') {
      if (!formData.password) {
        setSubmitResult({ type: 'error', message: 'Password is required for credentials users' });
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setSubmitResult({ type: 'error', message: 'Passwords do not match' });
        return;
      }
      
      if (formData.password.length < 6) {
        setSubmitResult({ type: 'error', message: 'Password must be at least 6 characters' });
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || undefined,
          role: formData.role,
          provider: formData.provider,
          password: formData.provider === 'credentials' ? formData.password : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitResult({ type: 'success', message: 'User created successfully' });
        setFormData(initialFormState);
        setShowAddForm(false);
        fetchUsers(); // 刷新列表
      } else {
        setSubmitResult({ type: 'error', message: data.error || 'Failed to create user' });
      }
    } catch (error) {
      setSubmitResult({ type: 'error', message: error instanceof Error ? error.message : 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 开始编辑用户
  const startEdit = (user: User) => {
    setEditingUser(user.email);
    setEditForm({
      name: user.name || '',
      role: user.role,
      isActive: user.isActive,
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', role: 'teacher', isActive: true });
  };

  // 保存编辑
  const saveEdit = async (email: string) => {
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        fetchUsers();
        cancelEdit();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    }
  };

  // 删除用户
  const handleDelete = async (email: string) => {
    if (!confirm(`Are you sure you want to delete user "${email}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Network error');
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E1A4A]" />
        <p className="text-slate-500">Loading users...</p>
      </div>
    );
  }

  // 错误状态
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <XCircle className="w-8 h-8 text-red-500" />
        <p className="text-red-600">{loadError}</p>
        <button
          onClick={fetchUsers}
          className="text-sm text-[#2E1A4A] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和添加按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-[#2E1A4A]" />
          <h3 className="font-medium text-slate-900">User Management</h3>
          <span className="text-sm text-slate-500">({users.length} users)</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          leftIcon={showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        >
          {showAddForm ? 'Cancel' : 'Add User'}
        </Button>
      </div>

      {/* 添加用户表单 */}
      {showAddForm && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-medium text-slate-900 mb-4">Add New User</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email *"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              <Input
                label="Name"
                placeholder="User Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d2563] focus:border-transparent"
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Authentication Provider
                </label>
                <select
                  value={formData.provider}
                  onChange={(e) => handleInputChange('provider', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3d2563] focus:border-transparent"
                >
                  <option value="credentials">Email & Password</option>
                  <option value="azure-ad">Office 365 (Azure AD)</option>
                </select>
              </div>
            </div>

            {formData.provider === 'credentials' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Password *"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
                <Input
                  label="Confirm Password *"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                />
              </div>
            )}

            {submitResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                submitResult.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {submitResult.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span>{submitResult.message}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData(initialFormState);
                  setSubmitResult(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              >
                {isSubmitting ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 用户列表 */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.email} className="hover:bg-slate-50 transition-colors">
                  {editingUser === user.email ? (
                    // 编辑模式
                    <>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">{user.email}</p>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Name"
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'teacher' }))}
                          className="px-2 py-1 text-sm border border-slate-300 rounded"
                        >
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {user.provider === 'azure-ad' ? 'Office 365' : 'Password'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="flex items-center justify-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="rounded border-slate-300 text-[#2E1A4A] focus:ring-[#2E1A4A]"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => saveEdit(user.email)}
                            leftIcon={<Save className="w-3 h-3" />}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // 查看模式
                    <>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{user.email}</p>
                          <p className="text-xs text-slate-500">{user.name || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'admin' ? 'primary' : 'default'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {user.provider === 'azure-ad' ? 'Office 365' : 'Password'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={user.isActive ? 'success' : 'warning'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-[#2E1A4A] hover:bg-slate-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.email)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 帮助信息 */}
      <div className="p-4 bg-[#f5f3f7] rounded-lg border border-[#d7cfdf]">
        <h4 className="font-medium text-[#2E1A4A] mb-2">User Roles</h4>
        <ul className="text-sm text-[#545860] space-y-1 list-disc list-inside">
          <li><strong>Admin</strong>: Full access to all features including user management and settings</li>
          <li><strong>Teacher</strong>: Can view and generate student reports</li>
        </ul>
      </div>
    </div>
  );
}

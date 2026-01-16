'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/students';
  const error = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [isO365Loading, setIsO365Loading] = useState(false);
  const [isO365Enabled, setIsO365Enabled] = useState(false);
  const [isCheckingO365, setIsCheckingO365] = useState(true);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  
  // 根据错误类型显示友好的错误信息
  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'CredentialsSignin':
        return 'Invalid email or password';
      case 'UserNotFound':
        return 'Your account is not registered in the system. Please contact administrator.';
      case 'UserInactive':
        return 'Your account has been disabled. Please contact administrator.';
      case 'O365Disabled':
        return 'Office 365 login is currently disabled.';
      case 'DatabaseError':
        return 'A database error occurred. Please try again later.';
      default:
        return errorCode ? 'An error occurred during login' : null;
    }
  };

  const [formError, setFormError] = useState<string | null>(getErrorMessage(error));

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // 检查 Office 365 是否启用
  useEffect(() => {
    const checkO365Config = async () => {
      try {
        const response = await fetch('/api/auth/azure-config');
        const data = await response.json();
        setIsO365Enabled(data.enabled && data.configured);
      } catch (err) {
        console.error('Failed to check O365 config:', err);
        setIsO365Enabled(false);
      } finally {
        setIsCheckingO365(false);
      }
    };

    checkO365Config();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFormError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleO365Login = async () => {
    setIsO365Loading(true);
    await signIn('microsoft-entra-id', { callbackUrl });
  };

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {formError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{formError}</p>
        </div>
      )}

      {/* 加载状态 */}
      {isCheckingO365 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#ED8C00]" />
        </div>
      )}

      {/* Office 365 登录 - 默认显示（如果已启用且未切换到密码登录） */}
      {!isCheckingO365 && isO365Enabled && !showCredentialsForm && (
        <div className="space-y-4">
          {/* Office 365 登录按钮 */}
          <button
            type="button"
            onClick={handleO365Login}
            disabled={isLoading || isO365Loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#2E1A4A] to-[#3d2563] hover:from-[#3d2563] hover:to-[#2E1A4A] text-white font-medium rounded-lg shadow-lg shadow-[#2E1A4A]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isO365Loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#00a4ef" />
                <rect x="1" y="11" width="9" height="9" fill="#7fba00" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
            )}
            Sign in with Office 365
          </button>

          {/* 切换到密码登录的链接 */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowCredentialsForm(true)}
              className="text-xs text-[#A7A9B4] hover:text-white transition-colors underline underline-offset-2"
            >
              Sign in with email and password
            </button>
          </div>
        </div>
      )}

      {/* 用户名密码表单 - 当 O365 未启用或用户选择密码登录时显示 */}
      {!isCheckingO365 && (!isO365Enabled || showCredentialsForm) && (
        <div className="space-y-4">
          {/* 返回 O365 登录的链接 */}
          {isO365Enabled && showCredentialsForm && (
            <button
              type="button"
              onClick={() => setShowCredentialsForm(false)}
              className="flex items-center gap-1 text-xs text-[#A7A9B4] hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Office 365 login
            </button>
          )}

          <form onSubmit={handleCredentialsLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A7A9B4] mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#3d2563]" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#3d2563] focus:outline-none focus:ring-2 focus:ring-[#ED8C00] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#A7A9B4] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#3d2563]" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#3d2563] focus:outline-none focus:ring-2 focus:ring-[#ED8C00] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isO365Loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#2E1A4A] to-[#3d2563] hover:from-[#3d2563] hover:to-[#2E1A4A] text-white font-medium rounded-lg shadow-lg shadow-[#2E1A4A]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

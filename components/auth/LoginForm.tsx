'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/students';
  const error = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [isO365Loading, setIsO365Loading] = useState(false);
  const [isO365Enabled, setIsO365Enabled] = useState(false);
  const [isCheckingO365, setIsCheckingO365] = useState(true);
  
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

      {/* 用户名密码表单 */}
      <form onSubmit={handleCredentialsLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#dbb3d3] mb-1.5">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-[#8b3d75]" />
            </div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#8b3d75] focus:outline-none focus:ring-2 focus:ring-[#a85d94] focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#dbb3d3] mb-1.5">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-[#8b3d75]" />
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-[#8b3d75] focus:outline-none focus:ring-2 focus:ring-[#a85d94] focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || isO365Loading}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-[#6b2d5b] to-[#8b3d75] hover:from-[#5a274c] hover:to-[#6b2d5b] text-white font-medium rounded-lg shadow-lg shadow-[#6b2d5b]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

      {/* Office 365 登录 - 仅在配置启用时显示 */}
      {!isCheckingO365 && isO365Enabled && (
        <>
          {/* 分隔线 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-[#8b3d75]">or continue with</span>
            </div>
          </div>

          {/* Office 365 登录按钮 */}
          <button
            type="button"
            onClick={handleO365Login}
            disabled={isLoading || isO365Loading}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isO365Loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
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
        </>
      )}

      {/* 加载状态 */}
      {isCheckingO365 && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#8b3d75]" />
        </div>
      )}
    </div>
  );
}

/**
 * 登录页面 - GTIIT主题
 */

import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - GTIIT Report Card',
  description: 'Sign in to access GTIIT Affiliated International School Report Card System',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#6b2d5b]/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#8b3d75]/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#a85d94]/20 rounded-full blur-3xl" />
      </div>

      {/* 登录卡片 */}
      <div className="relative w-full max-w-md">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg shadow-[#6b2d5b]/30 mb-4 overflow-hidden">
            <Image
              src="/GTAIS.png"
              alt="GTIIT Logo"
              width={72}
              height={72}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            GTIIT AFFILIATED
          </h1>
          <h2 className="text-lg font-bold text-white mb-2">
            INTERNATIONAL SCHOOL
          </h2>
          <p className="text-[#dbb3d3] text-sm">
            汕头市广东以色列理工学院附属外籍人员子女学校
          </p>
          <p className="text-[#c485b5] text-xs mt-2">
            Student Report Card System
          </p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
          <LoginForm />
        </div>

        {/* 底部信息 */}
        <p className="text-center text-[#8b3d75] text-xs mt-6">
          © 2025 GTIIT Affiliated International School. All rights reserved.
        </p>
      </div>
    </div>
  );
}

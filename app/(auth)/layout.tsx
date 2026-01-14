/**
 * 认证页面布局 - GTIIT紫色主题
 */

import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d1226] via-[#4c2341] to-[#2d1226]">
      {children}
    </div>
  );
}

/**
 * 认证页面布局 - GTIIT紫色主题
 */

import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0f2a] via-[#2E1A4A] to-[#1a0f2a]">
      {children}
    </div>
  );
}

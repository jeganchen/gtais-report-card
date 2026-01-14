'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Settings,
} from 'lucide-react';

const navigation = [
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-[#2d1226] hidden lg:block">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#4c2341]">
          <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg overflow-hidden">
            <Image
              src="/GTAIS.png"
              alt="GTIIT Logo"
              width={40}
              height={40}
              className="object-contain"
              onError={(e) => {
                // 如果图片加载失败，显示占位符
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">GTIIT School</h1>
            <p className="text-xs text-[#dbb3d3] truncate">Report Card System</p>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-[#6b2d5b] text-white shadow-lg shadow-[#6b2d5b]/30'
                      : 'text-[#dbb3d3] hover:bg-[#4c2341] hover:text-white'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* 底部信息 */}
        <div className="px-4 py-4 border-t border-[#4c2341]">
          <p className="text-xs text-[#8b3d75]">
            © 2025 GTIIT Affiliated
          </p>
          <p className="text-xs text-[#8b3d75]">
            International School
          </p>
        </div>
      </div>
    </aside>
  );
}

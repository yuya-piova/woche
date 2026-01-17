'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rocket,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Settings, // 将来用
} from 'lucide-react';

export default function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  // ナビゲーション項目定義
  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Monthly', href: '/monthly', icon: Calendar },
    { label: 'Meeting', href: '/meeting', icon: MessageSquare },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#1A1A1A] border-r border-white/5 z-50 transition-all duration-300 ease-in-out flex flex-col ${
        isHovered ? 'w-60 shadow-2xl' : 'w-16'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. ヘッダーロゴエリア */}
      <div className="h-[72px] flex items-center justify-center relative flex-none border-b border-white/5">
        <div className="flex items-center justify-center w-16 h-full absolute left-0 top-0">
          <Rocket className="text-blue-500 w-8 h-8" />
        </div>
        <span
          className={`text-white font-bold text-xl tracking-wider absolute left-16 transition-opacity duration-300 ${
            isHovered
              ? 'opacity-100 delay-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          LaunchPad
        </span>
      </div>

      {/* 2. ナビゲーションリンクエリア */}
      <nav className="flex-1 py-6 flex flex-col gap-2 overflow-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative group h-12 flex items-center px-4 mx-2 rounded-lg transition-colors hover:bg-white/5"
            >
              {/* アクティブ時の背景ハイライト */}
              {isActive && (
                <div className="absolute inset-0 bg-blue-600/10 border border-blue-600/20 rounded-lg" />
              )}

              {/* アイコン */}
              <div
                className={`flex-none w-8 flex items-center justify-center z-10 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`}
              >
                <item.icon size={20} />
              </div>

              {/* ラベルテキスト */}
              <span
                className={`ml-4 text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  isHovered
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-4'
                } ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* (オプション) 下部設定など */}
      <div className="p-2 border-t border-white/5">
        {/* 必要に応じて追加 */}
      </div>
    </aside>
  );
}

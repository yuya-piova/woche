'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rocket,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Settings,
  X, // 閉じるボタン用
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  openSettings: () => void; // 設定モーダルを開く関数
}

export default function Sidebar({
  isOpenMobile,
  setIsOpenMobile,
  openSettings,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Monthly', href: '/monthly', icon: Calendar },
    { label: 'Meeting', href: '/meeting', icon: MessageSquare },
  ];

  return (
    <>
      {/* スマホ用オーバーレイ（メニューが開いている時だけ表示） */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] md:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen bg-[#1A1A1A] border-r border-white/5 z-[70] transition-all duration-300 ease-in-out flex flex-col
          ${isHovered ? 'md:w-60 shadow-2xl' : 'md:w-16'}
          ${isOpenMobile ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ヘッダーエリア */}
        <div className="h-[72px] flex items-center justify-between px-4 border-b border-white/5 flex-none">
          <div className="flex items-center gap-4">
            <Rocket className="text-blue-500 w-8 h-8 flex-none" />
            <span
              className={`text-white font-bold text-xl transition-opacity duration-300 ${isHovered || isOpenMobile ? 'opacity-100' : 'opacity-0 md:hidden'}`}
            >
              LaunchPad
            </span>
          </div>
          {/* スマホのみ閉じるボタン */}
          <button
            className="md:hidden text-gray-400"
            onClick={() => setIsOpenMobile(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* ナビゲーションリンク */}
        <nav className="flex-1 py-6 flex flex-col gap-2 overflow-hidden px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpenMobile(false)}
                className="relative group h-12 flex items-center px-3 rounded-lg transition-colors hover:bg-white/5"
              >
                {isActive && (
                  <div className="absolute inset-0 bg-blue-600/10 border border-blue-600/20 rounded-lg" />
                )}
                <div
                  className={`flex-none w-10 flex items-center justify-center z-10 ${isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-white'}`}
                >
                  <item.icon size={20} />
                </div>
                <span
                  className={`ml-2 text-sm font-medium transition-all duration-300 ${isHovered || isOpenMobile ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 md:hidden'} ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 最下部：設定ボタン */}
        <div className="p-2 border-t border-white/5 flex-none">
          <button
            onClick={() => {
              openSettings();
              setIsOpenMobile(false);
            }}
            className="w-full h-12 flex items-center px-3 rounded-lg transition-colors hover:bg-white/5 text-gray-400 hover:text-white group"
          >
            <div className="flex-none w-10 flex items-center justify-center">
              <Settings
                size={20}
                className="group-hover:rotate-45 transition-transform duration-500"
              />
            </div>
            <span
              className={`ml-2 text-sm font-medium transition-all duration-300 ${isHovered || isOpenMobile ? 'opacity-100' : 'opacity-0 md:hidden'}`}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

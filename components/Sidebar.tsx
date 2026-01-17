'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Video,
  Settings as SettingsIcon,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  openSettings: () => void;
}

export default function Sidebar({
  isOpenMobile,
  setIsOpenMobile,
  openSettings,
}: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Focus', icon: <Target size={20} />, path: '/focus' },
    { name: 'Weekly', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Meeting', icon: <Video size={20} />, path: '/meeting' },
  ];

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* サイドバー本体 */}
      <aside
        className={`
        fixed left-0 z-[70] h-full bg-[#1A1A1A] border-r border-neutral-800
        flex flex-col py-6 transition-all duration-300 ease-in-out group/sidebar
        /* モバイル: isOpenMobile時に幅64(文字が見える幅) / デスクトップ: 通常16、ホバーで48 */
        ${isOpenMobile ? 'w-64' : 'w-0 md:w-16 md:hover:w-48'}
        ${!isOpenMobile && 'overflow-hidden md:overflow-visible'}
      `}
      >
        {/* アプリロゴ */}
        <div className="flex items-center px-3 mb-10 overflow-hidden">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
            <span className="text-white font-black text-xl">G</span>
          </div>
          <span
            className={`
            ml-4 font-black text-xl text-white transition-opacity duration-300 whitespace-nowrap
            /* モバイル: 常に表示 / デスクトップ: ホバー時のみ */
            ${isOpenMobile ? 'opacity-100' : 'opacity-0 md:group-hover/sidebar:opacity-100'}
          `}
          >
            Gleis
          </span>
        </div>

        {/* メニューアイテム */}
        <nav className="flex-1 flex flex-col gap-2 w-full px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsOpenMobile(false)}
                className={`
                  flex items-center w-full h-12 rounded-2xl transition-all duration-300 overflow-hidden
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                      : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                  }
                `}
              >
                <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                  {item.icon}
                </div>
                <span
                  className={`
                  ml-2 font-bold text-sm transition-all duration-300 whitespace-nowrap
                  /* モバイル: 常に表示 / デスクトップ: ホバー時のみ */
                  ${isOpenMobile ? 'opacity-100' : 'opacity-0 md:group-hover/sidebar:opacity-100'}
                `}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 下部：設定ボタン */}
        <div className="px-2 w-full">
          <button
            onClick={() => {
              openSettings();
              setIsOpenMobile(false);
            }}
            className="flex items-center w-full h-12 text-neutral-600 hover:text-white hover:bg-neutral-800 rounded-2xl transition-all overflow-hidden"
          >
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <SettingsIcon size={20} />
            </div>
            <span
              className={`
              ml-2 font-bold text-sm transition-opacity duration-300 whitespace-nowrap
              ${isOpenMobile ? 'opacity-100' : 'opacity-0 md:group-hover/sidebar:opacity-100'}
            `}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

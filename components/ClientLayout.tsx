'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react'; // ハンバーガーアイコン
import { format, startOfWeek, addDays } from 'date-fns';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // 仮の設定モーダルステート（中身は後でpage.tsxから移設可能です）
  const openSettings = () => {
    // ひとまずWindowのアラートなどで確認
    // 最終的にはここから設定モーダルを制御できるようにします
    window.dispatchEvent(new CustomEvent('open-settings'));
  };

  useEffect(() => {
    setCurrentTime(
      new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-[#171717] overflow-hidden">
      <Sidebar
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        openSettings={openSettings}
      />

      <div className="flex-1 flex flex-col min-w-0 md:ml-16 transition-all duration-300">
        <header className="flex-none p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/95 z-20">
          <div className="flex items-center gap-3">
            {/* スマホ用ハンバーガーボタン */}
            <button
              className="md:hidden text-white p-1"
              onClick={() => setIsOpenMobile(true)}
            >
              <Menu size={24} />
            </button>

            <div className="flex flex-col">
              <h1 className="text-neutral-500 text-[9px] font-bold uppercase">
                LaunchPad
              </h1>
              <span className="font-bold text-lg leading-none">Dashboard</span>
            </div>
          </div>

          <div className="text-2xl font-black tracking-tighter leading-none">
            {currentTime}
          </div>
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

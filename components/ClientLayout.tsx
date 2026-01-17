'use client';

import Sidebar from './Sidebar';
import { format, startOfWeek, addDays } from 'date-fns';
import { useState, useEffect } from 'react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentTime, setCurrentTime] = useState('');
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });

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
      {/* サイドバー (PCのみ) */}
      <div className="hidden md:block flex-none">
        <Sidebar />
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-16 transition-all duration-300 relative">
        {/* 共通ヘッダー */}
        <header className="flex-none p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/95 z-20">
          <div>
            <h1 className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">
              My Tasks
            </h1>
            <div className="text-xl font-bold flex items-center gap-2">
              <span>LaunchPad</span>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-1 rounded">
                {format(startOfCurrentWeek, 'MMM d')} -{' '}
                {format(addDays(startOfCurrentWeek, 6), 'MMM d')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-2xl font-black tracking-tighter leading-none">
              {currentTime}
            </div>
          </div>
        </header>

        {/* ページの中身 */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

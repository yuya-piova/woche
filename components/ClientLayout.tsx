'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import { Menu } from 'lucide-react';

type TaskFilter = 'All' | 'Work';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // --- 設定用の共有ステート ---
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [isCompactPast, setIsCompactPast] = useState<boolean>(false);

  // 初期化時にLocalStorageから読み込む
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem('gleisFilter') as TaskFilter;
      const savedCompact = localStorage.getItem('gleisCompactPast');
      if (savedFilter) setFilter(savedFilter);
      if (savedCompact) setIsCompactPast(savedCompact === 'true');
    }
  }, []);

  // 設定変更時にLocalStorageへ保存し、カスタムイベントを発火して各ページに通知する
  const handleSetFilter = (newFilter: TaskFilter) => {
    setFilter(newFilter);
    localStorage.setItem('gleisFilter', newFilter);
    window.dispatchEvent(new CustomEvent('settings-updated'));
  };

  const handleSetCompactPast = (val: boolean) => {
    setIsCompactPast(val);
    localStorage.setItem('gleisCompactPast', val.toString());
    window.dispatchEvent(new CustomEvent('settings-updated'));
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  // 時刻更新のタイマー
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // サイドバーなど外部からの open-settings イベントをリッスン
  useEffect(() => {
    const handleOpen = () => setShowSettings(true);
    window.addEventListener('open-settings', handleOpen);
    return () => window.removeEventListener('open-settings', handleOpen);
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
            <button
              className="md:hidden text-white p-1"
              onClick={() => setIsOpenMobile(true)}
            >
              <Menu size={24} />
            </button>

            <div className="flex flex-col">
              <h1 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">
                Gleis
              </h1>
              <span className="font-bold text-lg leading-none text-white tracking-tight">
                {pathname === '/'
                  ? 'Focus'
                  : pathname === '/weekly'
                    ? 'Weekly'
                    : pathname === '/meeting'
                      ? 'Meeting'
                      : 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="text-2xl font-black tracking-tighter leading-none">
            {currentTime}
          </div>
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>

      {/* 設定モーダル */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          filter={filter}
          setFilter={handleSetFilter}
          isCompactPast={isCompactPast}
          setIsCompactPast={handleSetCompactPast}
        />
      )}
    </div>
  );
}

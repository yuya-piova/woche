'use client';

import Sidebar from './Sidebar';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#171717]">
      {' '}
      {/* 全体の背景色をDashboardと合わせる */}
      {/* サイドバー: PCサイズ(md)以上でのみ表示 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      {/* メインコンテンツエリア */}
      {/* PCサイズ以上では左に64px(w-16)のマージンを空ける */}
      <main className="transition-all duration-300 md:ml-16 w-full h-full">
        {children}
      </main>
    </div>
  );
}

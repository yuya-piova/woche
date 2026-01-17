import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'] });

// --- 1. PWA用メタデータ設定 ---
export const metadata: Metadata = {
  title: 'Gleis',
  description: 'Task Dashboard',
  manifest: '/manifest.webmanifest', // 必須: マニフェストファイルの読み込み

  // iOS向けPWA設定（ホーム画面に追加した時の挙動）
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent', // ステータスバーを透過または黒に
    title: 'Gleis',
  },

  // アイコン設定（publicフォルダに配置されている場合、自動検出されることも多いですが明記推奨）
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png', // iOS用アイコン
  },
};

// --- 2. ビューポート設定 (スマホでの挙動制御) ---
export const viewport: Viewport = {
  themeColor: '#171717', // アプリの背景色に合わせる（アドレスバーの色など）
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 入力フォーム選択時などに勝手にズームしない設定
  userScalable: false, // ユーザーによるピンチズームを禁止（アプリライクにするため）
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-[#171717]`}>
        {/* ClientLayoutでサイドバーとメインコンテンツを構成 */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

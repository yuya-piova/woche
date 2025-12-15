'use client';
import { useState, useEffect, useRef } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  parseISO,
  isBefore,
} from 'date-fns';
import { ja } from 'date-fns/locale';

// タスクの型定義
type Task = {
  id: string;
  title: string;
  date: string | null;
  state: string;
  cat: string;
  subCats: string[];
  theme: string;
  url: string;
};

type TaskFilter = 'All' | 'Work';
type PopupState = Task | null;

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [filter, setFilter] = useState<TaskFilter>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('wocheFilter') as TaskFilter) || 'All';
    }
    return 'All';
  });
  const [popupTask, setPopupTask] = useState<PopupState>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const todayRef = useRef<HTMLDivElement>(null);

  // 今日の日付と、今週の月曜日を取得
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfCurrentWeek, i)
  );

  // データ取得
  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 1000);

    const poller = setInterval(fetchTasks, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, []);

  useEffect(() => {
    // filter の値が変更されたら localStorage に保存
    localStorage.setItem('wocheFilter', filter);
  }, [filter]); // 依存配列に [filter] を指定

  // ★ 画面スリープ抑制（Wake Lock API）の useEffect
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      // APIがサポートされているかチェック
      if ('wakeLock' in navigator) {
        try {
          // Wake Lockをリクエスト
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock アクティブ: 画面スリープを抑制中');
        } catch (err) {
          console.error(`Wake Lock リクエスト失敗: ${err}`);
        }
      } else {
        console.warn('Wake Lock APIはサポートされていません。');
      }
    };

    // コンポーネントがマウントされたらロックをリクエスト
    requestWakeLock();

    // コンポーネントがアンマウントされるとき、またはブラウザが非アクティブになったらロックを解除
    return () => {
      if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock 解除: 画面スリープ抑制を終了');
      }
    };
  }, []); // 初回のみ実行

  // ★ 完了処理（ローディング表示とNotion API連携）
  const handleComplete = async (id: string) => {
    // 既に他のタスクを処理中の場合や、このタスク自体が処理中の場合は何もしない
    if (processingId) return;

    setProcessingId(id); // 処理開始: このタスクIDをセット

    try {
      // Notion APIへ完了リクエストを送信
      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error('Notion側でのタスク完了に失敗しました');
      }

      // 成功した場合のみ、フロントエンドのリストから削除
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
      alert('タスクの完了処理に失敗しました。コンソールを確認してください。');
      // 失敗した場合はリストから削除しない
    } finally {
      setProcessingId(null); // 処理終了
    }
  };

  // ★ フィルタリングロジック
  const filterTasksByCat = (tasksToFilter: Task[]) => {
    if (filter === 'All') {
      return tasksToFilter;
    }
    // 'Work' フィルタの場合: cat が 'Work' のタスクのみ返す
    return tasksToFilter.filter((task) => task.cat === 'Work');
  };

  // 日付指定タスク（フィルタ適用済）
  const getTasksForDay = (day: Date) => {
    const tasksForDay = tasks.filter((task) => {
      if (!task.date) return false;
      return isSameDay(parseISO(task.date), day);
    });
    return filterTasksByCat(tasksForDay);
  };

  // Inboxタスク（フィルタ適用済）
  const getInboxTasks = () => {
    const inboxTasks = tasks.filter((task) => {
      if (!task.date) return true; // 日付未設定
      return isBefore(parseISO(task.date), startOfCurrentWeek); // 今週の月曜より前
    });
    return filterTasksByCat(inboxTasks);
  };

  // --- UIコンポーネント (カード) ---
  const TaskCard = ({ task }: { task: Task }) => {
    const colors: any = {
      blue: {
        bg: 'border-blue-500',
        badge: 'text-blue-200 bg-blue-900/50 border-blue-800',
      },
      green: {
        bg: 'border-green-500',
        badge: 'text-green-200 bg-green-900/50 border-green-800',
      },
      gray: {
        bg: 'border-neutral-500',
        badge: 'text-neutral-300 bg-neutral-800 border-neutral-700',
      },
    };
    const style = colors[task.theme] || colors.gray;

    // ★ Notionアプリで開くためのURLスキーム
    const notionAppUrl = task.url.replace(
      'https://www.notion.so/',
      'notion://'
    );
    const isProcessing = processingId === task.id; // 処理中判定

    return (
      <div
        className={`bg-neutral-800 p-4 rounded-lg border-l-4 ${style.bg} shadow-sm hover:bg-neutral-700 transition relative group`}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex gap-1 flex-wrap">
            {/* Cat Badge */}
            <span
              className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${style.badge}`}
            >
              {task.cat || 'No Cat'}
            </span>
            {/* SubCat Badges */}
            {task.subCats.map((sub) => (
              <span
                key={sub}
                className="px-1.5 py-0.5 text-[10px] text-neutral-400 bg-neutral-900 rounded border border-neutral-800"
              >
                {sub}
              </span>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            {/* 詳細ポップアップボタン */}
            <button
              onClick={() => setPopupTask(task)}
              className="text-neutral-500 hover:text-white p-1 rounded hover:bg-neutral-700 transition"
              title="詳細を開く"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041.02a.75.75 0 010 1.06l-.041.02m-4.5 0a.75.75 0 110-1.06.75.75 0 010 1.06m9 0a.75.75 0 110-1.06.75.75 0 010 1.06M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* URLリンクボタン (Notionアプリで開く) */}
            <a
              href={notionAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-white p-1 rounded hover:bg-neutral-700 transition"
              title="Notionアプリで開く"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="font-bold mb-1 text-lg leading-tight">{task.title}</div>
        <div className="text-xs text-neutral-500 mb-3 font-mono">
          Status: {task.state}
        </div>

        {/* ★ 完了ボタン（ローディング表示対応） */}
        <button
          onClick={() => handleComplete(task.id)}
          disabled={isProcessing}
          className={`text-xs w-full py-2 rounded transition font-bold border 
            ${
              isProcessing
                ? 'bg-red-900/50 text-red-300 border-red-800 cursor-not-allowed' // 処理中のスタイル
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-800' // 通常のスタイル
            }`}
        >
          {isProcessing ? (
            // ローディング表示
            <div className="flex items-center justify-center space-x-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>処理中...</span>
            </div>
          ) : (
            '完了 (Done)'
          )}
        </button>
      </div>
    );
  };

  if (loading)
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        Loading Notion...
      </div>
    );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#171717] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Header (トグルと日付を統合) */}
      <header className="flex-none p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/95 z-20">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-neutral-500 text-xs font-bold uppercase tracking-wider">
              My Tasks
            </h1>
            <div className="text-xl font-bold flex items-center gap-2">
              <span>Dashboard</span>
              <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded">
                {format(startOfCurrentWeek, 'MMM d')} -{' '}
                {format(addDays(startOfCurrentWeek, 6), 'MMM d')}
              </span>
            </div>
          </div>

          {/* ★ トグルボタンをHeader内に配置 */}
          <div className="hidden sm:flex space-x-3 rounded-full bg-neutral-800 p-1">
            <button
              onClick={() => setFilter('All')}
              className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-colors ${
                filter === 'All'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-transparent text-neutral-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('Work')}
              className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-colors ${
                filter === 'Work'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-transparent text-neutral-400 hover:text-white'
              }`}
            >
              Work Only
            </button>
          </div>
          <button
            onClick={() => {
              if (todayRef.current) {
                // スクロール可能な親要素を取得し、そこにスクロール処理を適用
                const parent = todayRef.current.closest('main');
                if (parent) {
                  parent.scrollLeft =
                    todayRef.current.offsetLeft - parent.offsetWidth / 2;
                }
              }
            }}
            className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-full text-sm font-semibold transition"
          >
            Today
          </button>
        </div>

        <div className="text-3xl font-black tracking-tighter leading-none">
          {currentTime}
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden bg-black">
        <div className="flex flex-col md:flex-row h-auto md:h-full min-w-full divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* 1. Inbox / Overdue Column */}
          <div className="flex-none w-full md:w-80 bg-neutral-900/50 flex flex-col h-auto md:h-full">
            <div className="p-3 border-b border-red-900/30 bg-red-900/10 sticky top-0 md:static">
              <h3 className="font-bold text-red-400 flex justify-between items-center">
                Inbox / Overdue
                <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded-full">
                  {getInboxTasks().length}
                </span>
              </h3>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 h-full min-h-[150px]">
              {getInboxTasks().length === 0 ? (
                <div className="text-center text-neutral-700 text-sm py-8">
                  {filter === 'Work' ? '業務タスクはありません' : 'No Tasks'}
                </div>
              ) : (
                getInboxTasks().map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </div>

          {/* 2-8. Week Days Columns */}
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            const dayTasks = getTasksForDay(day);

            return (
              <div
                key={day.toISOString()}
                ref={isToday ? todayRef : null}
                className={`flex-none w-full md:w-72 flex flex-col h-auto md:h-full relative ${
                  isToday ? 'bg-blue-900/10' : ''
                }`}
              >
                <div
                  className={`p-3 border-b border-neutral-800 ${
                    isToday
                      ? 'bg-blue-900/20 border-blue-500/30'
                      : 'bg-neutral-900'
                  } sticky top-0 md:static`}
                >
                  <h3
                    className={`font-bold ${
                      isToday ? 'text-blue-300' : 'text-neutral-300'
                    }`}
                  >
                    {format(day, 'EEE', { locale: ja })}{' '}
                    <span className="text-sm opacity-60 ml-1">
                      {format(day, 'M/d')}
                    </span>
                    {isToday && (
                      <span className="ml-2 text-[10px] bg-blue-500 text-white px-1.5 rounded uppercase">
                        Today
                      </span>
                    )}
                  </h3>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 h-full min-h-[150px]">
                  {dayTasks.length === 0 ? (
                    <div className="text-center text-neutral-700 text-sm py-8">
                      {filter === 'Work'
                        ? '業務タスクはありません'
                        : 'No Tasks'}
                    </div>
                  ) : (
                    dayTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ★ ポップアップモーダルの実装（詳細表示） */}
      {popupTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setPopupTask(null)} // 背景クリックで閉じる
        >
          <div
            className="bg-neutral-800 p-8 rounded-xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()} // ポップアップ内クリックで閉じない
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              {popupTask.title}
            </h2>
            <div className="mt-6 pt-4 border-t border-neutral-700/50 space-y-2 text-neutral-400 text-sm">
              <p>
                <strong>ステータス:</strong> {popupTask.state}
              </p>
              <p>
                <strong>カテゴリー:</strong> {popupTask.cat}
              </p>
              <p>
                <strong>サブカテゴリー:</strong>{' '}
                {popupTask.subCats.join(', ') || 'N/A'}
              </p>
              <p>
                <strong>期限:</strong> {popupTask.date || '日付未定'}
              </p>
            </div>

            <button
              onClick={() => setPopupTask(null)}
              className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

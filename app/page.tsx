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
  // --- 1. 定数定義 ---
  // Notion State に対応するカラードットの定義
  const STATE_COLORS: { [key: string]: string } = {
    INBOX: 'bg-red-500', // 赤
    Wrapper: 'bg-blue-500', // 青
    Waiting: 'bg-yellow-500', // 黄色
    Going: 'bg-purple-500', // 紫
    Done: 'bg-green-500', // Done
  };

  // --- 2. ステート定義 ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  // フィルタ状態 (localStorageから読み込み)
  const [filter, setFilter] = useState<TaskFilter>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('wocheFilter') as TaskFilter) || 'All';
    }
    return 'All';
  });

  // 過去日の幅縮小モード (localStorageから読み込み)
  const [isCompactPast, setIsCompactPast] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wocheCompactPast');
      return stored === 'true';
    }
    return false;
  });

  const [popupTask, setPopupTask] = useState<PopupState>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  // 設定モーダルの表示状態
  const [showSettings, setShowSettings] = useState(false);

  // Todayボタンのスクロール先参照用
  const todayRef = useRef<HTMLDivElement>(null);

  // 今日の日付と、今週の月曜日を取得
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfCurrentWeek, i)
  );

  // --- 3. データ取得 ---
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

  // --- 4. useEffect (ライフサイクルとデータ永続化) ---

  // 初期データ取得、時刻更新、データポーリング
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

  // filter の localStorage 保存
  useEffect(() => {
    localStorage.setItem('wocheFilter', filter);
  }, [filter]);

  // isCompactPast の localStorage 保存
  useEffect(() => {
    localStorage.setItem('wocheCompactPast', isCompactPast.toString());
  }, [isCompactPast]);

  // 画面スリープ抑制（Wake Lock API）
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock アクティブ: 画面スリープを抑制中');
        } catch (err) {
          console.error(`Wake Lock リクエスト失敗: ${err}`);
        }
      } else {
        console.warn('Wake Lock APIはサポートされていません。');
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock 解除: 画面スリープ抑制を終了');
      }
    };
  }, []);

  // --- 5. タスク処理関数 ---

  // タスク完了処理
  const handleComplete = async (id: string) => {
    if (processingId) return;

    setProcessingId(id);

    try {
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

      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
      alert('タスクの完了処理に失敗しました。コンソールを確認してください。');
    } finally {
      setProcessingId(null);
    }
  };

  // タスク更新処理（日付/ステータス）
  const handleUpdateTask = async (
    id: string,
    updates: { status?: string; date?: string | null }
  ) => {
    if (processingId) return;

    setProcessingId(id);

    try {
      const res = await fetch('/api/update-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) {
        throw new Error('タスクの更新に失敗しました');
      }

      setPopupTask(null);
      await fetchTasks();
    } catch (e) {
      console.error(e);
      alert('タスクの更新処理に失敗しました。');
    } finally {
      setProcessingId(null);
    }
  };

  // --- 6. タスクフィルタリングロジック ---

  // フィルタリング（All/Work Only）
  const filterTasksByCat = (tasksToFilter: Task[]) => {
    if (filter === 'All') {
      return tasksToFilter;
    }
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
      if (!task.date) return true;
      return isBefore(parseISO(task.date), startOfCurrentWeek);
    });
    return filterTasksByCat(inboxTasks);
  };

  // --- 7. UIコンポーネント (カード) ---
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

    const notionAppUrl = task.url.replace(
      'https://www.notion.so/',
      'notion://'
    );
    const isProcessing = processingId === task.id;

    return (
      <div
        className={`bg-neutral-800 p-3 rounded-lg border-l-4 ${style.bg} shadow-sm hover:bg-neutral-700 transition relative group`}
      >
        {/* タイトルとURLリンク */}
        <div className="flex justify-between items-start mb-1">
          {/* タイトル (カラードットを統合) */}
          <div className="font-bold text-base leading-tight pr-4 flex items-center">
            <span
              className={`w-2.5 h-2.5 rounded-full mr-2 flex-none ${
                STATE_COLORS[task.state] || 'bg-neutral-500'
              }`}
              title={`Status: ${task.state}`}
            />

            {task.title}
          </div>

          {/* URLリンクボタン群 */}
          <div className="flex gap-2 items-center flex-none">
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

        {/* Badges, ポップアップボタン（格上げ）を同一行に配置 */}
        <div className="flex justify-between items-center mt-2">
          {/* Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
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
          </div>

          {/* ポップアップボタン (詳細・編集) */}
          <button
            onClick={() => setPopupTask(task)}
            className={`flex-none text-xs py-1 px-3 rounded transition font-bold border 
                bg-blue-600 hover:bg-blue-700 text-white border-blue-700/50 shadow-md`}
            title="詳細と編集"
          >
            詳細
          </button>
        </div>
      </div>
    );
  };

  // --- 8. メインレンダリング ---

  if (loading)
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        Loading Notion...
      </div>
    );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#171717] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
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

          {/* Todayボタン */}
          <button
            onClick={() => {
              if (todayRef.current) {
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

          {/* 設定ボタン */}
          <button
            onClick={() => setShowSettings(true)}
            className="text-white bg-neutral-600 hover:bg-neutral-700 p-2 rounded-full transition"
            title="設定"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.562.342 1.22.565 1.884.661.173.025.346.045.52.06"
              />
            </svg>
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
          {(() => {
            const inboxTasks = getInboxTasks();
            const hasNoTasks = inboxTasks.length === 0;

            let widthClass = 'w-full md:w-80';
            if (hasNoTasks && isCompactPast) {
              // タスクがなく、コンパクトモードがONの場合
              widthClass = 'w-1/2 md:w-36'; // 幅を半分に
            }

            return (
              <div
                // ★ 修正後の className を適用
                className={`flex-none ${widthClass} bg-neutral-900/50 flex flex-col h-auto md:h-full`}
              >
                <div className="p-3 border-b border-red-900/30 bg-red-900/10 sticky top-0 md:static">
                  <h3 className="font-bold text-red-400 flex justify-between items-center">
                    Inbox / Overdue
                    <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded-full">
                      {inboxTasks.length}
                    </span>
                  </h3>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 h-full min-h-[150px]">
                  {inboxTasks.length === 0 ? (
                    <div className="text-center text-neutral-700 text-sm py-8">
                      {filter === 'Work'
                        ? '業務タスクはありません'
                        : 'No Tasks'}
                    </div>
                  ) : (
                    inboxTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* 2-8. Week Days Columns */}
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);

            // ★ 幅縮小のロジック
            const isPast = day.getTime() < today.getTime();
            const allTasksForDay = tasks.filter((task) => {
              if (!task.date) return false;
              return isSameDay(parseISO(task.date), day);
            });
            const dayTasks = filterTasksByCat(allTasksForDay);
            const hasNoTasks = dayTasks.length === 0;

            let widthClass = 'w-full md:w-72';
            if (isPast && hasNoTasks && isCompactPast) {
              widthClass = 'w-1/2 md:w-36';
            }
            // ★ ここまで幅縮小のロジック

            return (
              <div
                key={day.toISOString()}
                ref={isToday ? todayRef : null}
                className={`flex-none ${widthClass} flex flex-col h-auto md:h-full relative ${
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

      {/* ★ 9. ポップアップモーダル（詳細表示と編集フォーム） */}
      {popupTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setPopupTask(null)}
        >
          <div
            className="bg-neutral-800 p-8 rounded-xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4">
              {popupTask.title}
            </h2>

            {/* フォーム部分 */}
            <form className="space-y-4 pt-4 border-t border-neutral-700">
              {/* 1. ステータス変更ボタン */}
              <div className="flex items-center gap-4">
                <label className="text-neutral-400 font-semibold w-24">
                  ステータス:
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* INBOX, Waiting, Going, Wrapper (進行形ステータス) */}
                  {['INBOX', 'Wrapper', 'Waiting', 'Going'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={processingId === popupTask.id}
                      onClick={() => handleUpdateTask(popupTask.id, { status })}
                      className={`px-3 py-1 text-sm rounded transition font-semibold 
                        ${
                          popupTask.state === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }
                        ${
                          processingId === popupTask.id
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }
                      `}
                    >
                      {status}
                    </button>
                  ))}

                  {/* 区切り線 */}
                  <div className="w-px h-6 bg-neutral-600 self-center mx-1" />

                  {/* Done ボタン (完了ステータス) */}
                  <button
                    type="button"
                    disabled={processingId === popupTask.id}
                    onClick={() => {
                      handleComplete(popupTask.id);
                      setPopupTask(null);
                    }}
                    className={`px-3 py-1 text-sm rounded font-semibold bg-green-700 text-white hover:bg-green-600 
                      ${
                        processingId === popupTask.id
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }
                      ${
                        popupTask.state === 'Done'
                          ? 'ring-2 ring-green-400'
                          : ''
                      } 
                    `}
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* 2. 日付変更フィールド */}
              <div className="flex items-center gap-4">
                <label
                  htmlFor="task-date"
                  className="text-neutral-400 font-semibold w-24"
                >
                  期限日:
                </label>
                <input
                  id="task-date"
                  type="date"
                  value={popupTask.date || ''}
                  disabled={processingId === popupTask.id}
                  onChange={(e) =>
                    handleUpdateTask(popupTask.id, { date: e.target.value })
                  }
                  className="bg-neutral-700 text-white p-2 rounded flex-1"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateTask(popupTask.id, { date: 'null' })
                  }
                  className="text-xs text-red-400 hover:text-red-300 transition"
                >
                  [クリア]
                </button>
              </div>
            </form>

            {/* 詳細情報 */}
            <div className="mt-6 pt-4 border-t border-neutral-700/50 space-y-2 text-neutral-400 text-sm">
              <p>
                <strong>カテゴリー:</strong> {popupTask.cat}{' '}
                {popupTask.subCats.length > 0
                  ? `(${popupTask.subCats.join(', ')})`
                  : ''}
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

      {/* ★ 10. 設定モーダル */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-neutral-800 p-8 rounded-xl shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-neutral-700 pb-3">
              ダッシュボード設定
            </h2>

            <div className="space-y-6">
              {/* 1. All / Work Only トグル */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="filter-toggle"
                  className="text-neutral-300 text-lg font-medium"
                >
                  表示タスクのフィルタ
                </label>
                <button
                  onClick={() => setFilter(filter === 'All' ? 'Work' : 'All')}
                  className={`px-4 py-2 rounded-full font-bold transition text-sm
                        ${
                          filter === 'All'
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                        }
                    `}
                >
                  {filter === 'All' ? 'All' : 'Work Only'}
                </button>
              </div>

              {/* 2. 過去日の幅縮小トグル */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="compact-past-toggle"
                  className="text-neutral-300 text-lg font-medium"
                >
                  過去日のタスク非表示時の幅縮小
                </label>
                <button
                  onClick={() => setIsCompactPast(!isCompactPast)}
                  className={`px-4 py-2 rounded-full font-bold transition text-sm
                        ${
                          isCompactPast
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-600 text-neutral-300'
                        }
                    `}
                >
                  {isCompactPast ? 'ON' : 'OFF'}
                </button>
              </div>

              <p className="text-xs text-neutral-500 pt-2">
                ※ 幅縮小は、過去の日付でタスクが一件もない場合に適用されます。
              </p>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-8 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded font-semibold"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  // --- 1. 定数・初期値定義 ---
  const STATE_COLORS: { [key: string]: string } = {
    INBOX: 'bg-red-500',
    Wrapper: 'bg-blue-500',
    Waiting: 'bg-yellow-500',
    Going: 'bg-purple-500',
    Done: 'bg-green-500',
  };

  const emptyTask: Task = {
    id: 'new',
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    state: 'INBOX',
    cat: 'All',
    subCats: [],
    theme: 'gray',
    url: '',
  };

  // --- 2. ステート定義 ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  // 編集用の一時ステート
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');

  const [filter, setFilter] = useState<TaskFilter>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('wocheFilter') as TaskFilter) || 'All';
    }
    return 'All';
  });

  const [isCompactPast, setIsCompactPast] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('wocheCompactPast');
      return stored === 'true';
    }
    return false;
  });

  const [popupTask, setPopupTask] = useState<PopupState>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const todayRef = useRef<HTMLDivElement>(null);

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

  // --- 4. useEffect ---
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
    localStorage.setItem('wocheFilter', filter);
  }, [filter]);
  useEffect(() => {
    localStorage.setItem('wocheCompactPast', isCompactPast.toString());
  }, [isCompactPast]);

  // モーダルが開いた時に編集用ステートに値をセット
  useEffect(() => {
    if (popupTask) {
      setEditTitle(popupTask.id === 'new' ? '' : popupTask.title);
      setEditDate(popupTask.date);
      setEditStatus(popupTask.state);
    }
  }, [popupTask]);

  // --- 5. タスク処理関数 ---

  const handleSaveTask = async () => {
    if (!popupTask || processingId) return;
    setProcessingId(popupTask.id);

    const isNew = popupTask.id === 'new';
    const apiUrl = isNew ? '/api/create' : '/api/update-task';
    const payload = isNew
      ? { title: editTitle, date: editDate }
      : {
          id: popupTask.id,
          title: editTitle,
          date: editDate,
          status: editStatus,
        };

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      setPopupTask(null);
      await fetchTasks();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (id: string) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      const res = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('完了処理に失敗しました');
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  // --- 6. フィルタリングロジック ---
  const filterTasksByCat = (tasksToFilter: Task[]) => {
    if (filter === 'All') return tasksToFilter;
    return tasksToFilter.filter((task) => task.cat === 'Work');
  };

  const getTasksForDay = (day: Date) => {
    const tasksForDay = tasks.filter((task) => {
      if (!task.date) return false;
      return isSameDay(parseISO(task.date), day);
    });
    return filterTasksByCat(tasksForDay);
  };

  const getInboxTasks = () => {
    const inboxTasks = tasks.filter((task) => {
      if (!task.date) return true;
      return isBefore(parseISO(task.date), startOfCurrentWeek);
    });
    return filterTasksByCat(inboxTasks);
  };

  // --- 7. TaskCard ---
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

    return (
      <div
        className={`bg-neutral-800 p-3 rounded-lg border-l-4 ${style.bg} shadow-sm hover:bg-neutral-700 transition relative group`}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="font-bold text-base leading-tight pr-4 flex items-center">
            <span
              className={`w-2.5 h-2.5 rounded-full mr-2 flex-none ${
                STATE_COLORS[task.state] || 'bg-neutral-500'
              }`}
            />
            {task.title}
          </div>
          <div className="flex gap-2 items-center flex-none">
            <a
              href={notionAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-white p-1 rounded"
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
                <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <div className="flex gap-1 flex-wrap">
              <span
                className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${style.badge}`}
              >
                {task.cat || 'No Cat'}
              </span>
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
          <button
            onClick={() => setPopupTask(task)}
            className="flex-none text-xs py-1 px-3 rounded transition font-bold border bg-blue-600 hover:bg-blue-700 text-white border-blue-700/50 shadow-md"
          >
            詳細
          </button>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center font-bold">
        Loading...
      </div>
    );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#171717] text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="flex-none p-4 border-b border-neutral-800 flex flex-wrap gap-y-4 justify-between items-center bg-neutral-900/95 z-20">
        {/* 左側：タイトルエリア */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest">
              My Tasks
            </h1>
            <div className="text-xl font-bold flex items-center gap-2">
              <span>Dashboard</span>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-1 rounded">
                {format(startOfCurrentWeek, 'MMM d')} -{' '}
                {format(addDays(startOfCurrentWeek, 6), 'MMM d')}
              </span>
            </div>
          </div>
        </div>

        {/* 右側：操作エリア（スマホではここが2行目として右寄せになる） */}
        <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
          {/* 新規追加ボタン */}
          <button
            onClick={() => setPopupTask(emptyTask)}
            className="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shadow-lg shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="3"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          {/* Todayボタン */}
          <button
            onClick={() => {
              if (todayRef.current) {
                const p = todayRef.current.closest('main');
                if (p)
                  p.scrollLeft =
                    todayRef.current.offsetLeft - p.offsetWidth / 2;
              }
            }}
            className="text-white bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-full text-xs font-bold shrink-0"
          >
            Today
          </button>

          {/* 設定ボタン */}
          <button
            onClick={() => setShowSettings(true)}
            className="text-neutral-400 hover:text-white p-2 rounded-full transition shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.562.342 1.22.565 1.884.661.173.025.346.045.52.06" />
            </svg>
          </button>

          {/* 時刻表示（ここも同じエリアに入れることで、スマホでは時刻だけが一番右、ボタンがその左に並びます） */}
          <div className="text-2xl font-black tracking-tighter leading-none min-w-[80px] text-right ml-2 sm:ml-4">
            {currentTime}
          </div>
        </div>
      </header>

      {/* Main Board - スマホでも横スクロール固定 */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden bg-black snap-x snap-mandatory scroll-smooth">
        <div className="flex flex-row h-full min-w-full divide-x divide-neutral-800">
          {/* Inbox Column */}
          {(() => {
            const inboxTasks = getInboxTasks();
            const hasNoTasks = inboxTasks.length === 0;
            let widthClass = 'w-80';
            if (hasNoTasks && isCompactPast) widthClass = 'w-36';

            return (
              <div
                key="inbox-column"
                className={`flex-none ${widthClass} bg-neutral-900/30 flex flex-col h-full snap-start`}
              >
                <div className="p-3 border-b border-red-900/30 bg-red-900/10">
                  <h3 className="font-bold text-red-400 flex justify-between items-center text-sm">
                    Overdue
                    <span className="text-[10px] bg-red-900 text-red-200 px-2 py-0.5 rounded-full">
                      {inboxTasks.length}
                    </span>
                  </h3>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {inboxTasks.length === 0 ? (
                    <div className="text-center text-neutral-700 text-xs py-8">
                      No Tasks
                    </div>
                  ) : (
                    inboxTasks.map((t) => <TaskCard key={t.id} task={t} />)
                  )}
                </div>
              </div>
            );
          })()}

          {/* Week Days */}
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today);
            const isPast = day.getTime() < today.getTime();
            const dayTasks = getTasksForDay(day);
            const hasNoTasks = dayTasks.length === 0;
            let widthClass = 'w-72';
            if (isPast && hasNoTasks && isCompactPast) widthClass = 'w-36';

            return (
              <div
                key={day.toISOString()}
                ref={isToday ? todayRef : null}
                className={`flex-none ${widthClass} flex flex-col h-full relative snap-start ${
                  isToday ? 'bg-blue-900/10' : ''
                }`}
              >
                <div
                  className={`p-3 border-b border-neutral-800 ${
                    isToday
                      ? 'bg-blue-900/20 border-blue-500/30'
                      : 'bg-neutral-900'
                  }`}
                >
                  <h3
                    className={`font-bold text-sm ${
                      isToday ? 'text-blue-300' : 'text-neutral-300'
                    }`}
                  >
                    {format(day, 'EEE', { locale: ja })}
                    <span className="text-xs opacity-60 ml-1">
                      {format(day, 'M/d')}
                    </span>
                    {isToday && (
                      <span className="ml-2 text-[8px] bg-blue-500 text-white px-1.5 rounded uppercase">
                        Today
                      </span>
                    )}
                  </h3>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {dayTasks.length === 0 ? (
                    <div className="text-center text-neutral-700 text-xs py-8">
                      No Tasks
                    </div>
                  ) : (
                    dayTasks.map((t) => <TaskCard key={t.id} task={t} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Edit/Create Popup */}
      {popupTask && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPopupTask(null)}
        >
          <div
            className="bg-neutral-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex flex-col gap-1">
                <label className="text-neutral-500 text-[10px] font-bold uppercase">
                  Task Name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-neutral-700 text-white p-3 rounded-xl text-lg font-bold outline-none border-2 border-transparent focus:border-blue-500"
                  placeholder="タスクを入力..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-500 text-[10px] font-bold uppercase">
                  Date
                </label>
                <input
                  type="date"
                  value={editDate || ''}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="bg-neutral-700 text-white p-3 rounded-xl outline-none"
                />
              </div>

              {popupTask.id !== 'new' && (
                <div className="flex flex-col gap-2">
                  <label className="text-neutral-500 text-[10px] font-bold uppercase">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['INBOX', 'Wrapper', 'Waiting', 'Going'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditStatus(s)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-bold transition ${
                          editStatus === s
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-700 text-neutral-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    <div className="w-px h-6 bg-neutral-700" />
                    <button
                      type="button"
                      onClick={() => {
                        handleComplete(popupTask.id);
                        setPopupTask(null);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg font-bold bg-green-700 text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-8">
              <button
                onClick={() => setPopupTask(null)}
                className="flex-1 py-3 text-neutral-400 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                disabled={!editTitle || processingId !== null}
                className="flex-[2] bg-blue-600 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {processingId ? 'Saving...' : 'Save Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-neutral-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6">Settings</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-300">
                  表示フィルタ
                </span>
                <button
                  onClick={() => setFilter(filter === 'All' ? 'Work' : 'All')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                    filter === 'All' ? 'bg-blue-600' : 'bg-green-600'
                  }`}
                >
                  {filter === 'All' ? 'All' : 'Work Only'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-300">
                  過去日の幅縮小
                </span>
                <button
                  onClick={() => setIsCompactPast(!isCompactPast)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                    isCompactPast ? 'bg-blue-600' : 'bg-neutral-700'
                  }`}
                >
                  {isCompactPast ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full py-3 bg-neutral-700 rounded-xl font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

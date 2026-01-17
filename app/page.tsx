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
import TaskModal from '@/components/TaskModal';
import type { Task } from '@/components/TaskModal';
import { useTasks } from '@/hooks/useTasks';

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
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    state: 'INBOX',
    cat: 'All',
    subCats: [],
    theme: 'gray',
    url: '',
    summary: '',
  };

  // --- 2. ステート定義 ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupTask, setPopupTask] = useState<PopupState>(null);

  // 設定ステート（ClientLayoutと同期させる）
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [isCompactPast, setIsCompactPast] = useState<boolean>(false);

  const todayRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(startOfCurrentWeek, i),
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

  // --- 4. カスタムフック (ロジックの切り出し) ---
  const { handleSaveTask, handleComplete, processingId } = useTasks(
    tasks,
    fetchTasks,
  );

  // --- 5. useEffect ---
  useEffect(() => {
    fetchTasks();
    const poller = setInterval(fetchTasks, 60000);
    return () => clearInterval(poller);
  }, []);

  // ClientLayoutでの設定変更を検知して同期する
  useEffect(() => {
    const syncSettings = () => {
      const savedFilter = localStorage.getItem('wocheFilter');
      const savedCompact = localStorage.getItem('wocheCompactPast');
      if (savedFilter) setFilter(savedFilter as TaskFilter);
      if (savedCompact) setIsCompactPast(savedCompact === 'true');
    };

    syncSettings(); // 初回読み込み
    window.addEventListener('settings-updated', syncSettings);
    return () => window.removeEventListener('settings-updated', syncSettings);
  }, []);

  // スリープ抑制
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, []);

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

  // --- 7. TaskCard コンポーネント ---
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

    return (
      <div
        className={`bg-neutral-800 p-3 rounded-lg border-l-4 ${style.bg} shadow-sm hover:bg-neutral-700 transition relative group`}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="font-bold text-base leading-tight pr-4 flex items-center text-white">
            <span
              className={`w-2.5 h-2.5 rounded-full mr-2 flex-none ${STATE_COLORS[task.state] || 'bg-neutral-500'}`}
            />
            {task.name}
          </div>
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:text-white p-1"
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
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-1 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${style.badge}`}
            >
              {task.cat || 'No Cat'}
            </span>
          </div>
          <button
            onClick={() => setPopupTask(task)}
            className="text-xs py-1 px-3 rounded font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
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
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#171717]">
      <main className="flex-1 overflow-x-auto overflow-y-hidden bg-black snap-x snap-mandatory scroll-smooth">
        <div className="flex flex-row h-full min-w-full divide-x divide-neutral-800">
          {/* Inbox (Overdue) Column */}
          {(() => {
            const inboxTasks = getInboxTasks();
            const widthClass =
              inboxTasks.length === 0 && isCompactPast ? 'w-36' : 'w-80';
            return (
              <div
                className={`flex-none ${widthClass} bg-neutral-900/30 flex flex-col h-full snap-start transition-all duration-300`}
              >
                <div className="p-3 border-b border-red-900/30 bg-red-900/10">
                  <h3 className="font-bold text-red-400 flex justify-between items-center text-sm">
                    Overdue{' '}
                    <span className="text-[10px] bg-red-900 text-red-200 px-2 py-0.5 rounded-full">
                      {inboxTasks.length}
                    </span>
                  </h3>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {inboxTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Week Days */}
          {weekDays.map((day) => {
            const isTodayDay = isSameDay(day, today);
            const isPast = isBefore(day, today) && !isTodayDay;
            const dayTasks = getTasksForDay(day);
            const widthClass =
              isPast && dayTasks.length === 0 && isCompactPast
                ? 'w-36'
                : 'w-72';

            return (
              <div
                key={day.toISOString()}
                ref={isTodayDay ? todayRef : null}
                className={`flex-none ${widthClass} flex flex-col h-full snap-start transition-all duration-300 ${isTodayDay ? 'bg-blue-900/10' : ''}`}
              >
                <div
                  className={`p-3 border-b border-neutral-800 ${isTodayDay ? 'bg-blue-900/20 border-blue-500/30' : 'bg-neutral-900'}`}
                >
                  <h3
                    className={`font-bold text-sm ${isTodayDay ? 'text-blue-300' : 'text-neutral-300'}`}
                  >
                    {format(day, 'EEE', { locale: ja })}{' '}
                    <span className="text-xs opacity-60 ml-1">
                      {format(day, 'M/d')}
                    </span>
                  </h3>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {dayTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setPopupTask(emptyTask)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl z-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="3"
          stroke="currentColor"
          className="w-7 h-7"
        >
          <path d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* Task Modal */}
      {popupTask && (
        <TaskModal
          task={popupTask}
          onClose={() => setPopupTask(null)}
          onSave={(name, date, status) =>
            handleSaveTask(popupTask, name, date, status)
          }
          onComplete={handleComplete}
          processingId={processingId}
        />
      )}
    </div>
  );
}

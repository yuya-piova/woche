'use client';

import { useState, useEffect } from 'react';
import {
  format,
  getWeek,
  differenceInDays,
  startOfYear,
  endOfYear,
} from 'date-fns';
import {
  Target,
  Calendar,
  Activity,
  ChevronRight,
  Circle,
  ExternalLink,
} from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import type { Task } from '@/components/TaskModal';
import { useTasks } from '@/hooks/useTasks';

export default function FocusPage() {
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 設定ステート（ClientLayoutと同期）
  const [filter, setFilter] = useState<'All' | 'Work'>('All');

  const fetchTasks = async () => {
    try {
      // 完了済み(Done)も含めて当月分を取得
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAllTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const { handleSaveTask, handleComplete, processingId } = useTasks(
    allTasks,
    fetchTasks,
  );

  useEffect(() => {
    fetchTasks();
    const poller = setInterval(fetchTasks, 60000);

    const syncSettings = () => {
      const savedFilter = localStorage.getItem('gleisFilter');
      if (savedFilter) setFilter(savedFilter as 'All' | 'Work');
    };

    syncSettings();
    window.addEventListener('settings-updated', syncSettings);
    window.addEventListener('storage', syncSettings);

    return () => {
      clearInterval(poller);
      window.removeEventListener('settings-updated', syncSettings);
      window.removeEventListener('storage', syncSettings);
    };
  }, []);

  // --- データ集計ロジック ---
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // 1. リスト表示用（今日の日付 & 未完了 & カテゴリフィルタ）
  const displayTasks = allTasks.filter(
    (t) =>
      t.date === todayStr &&
      t.state !== 'Done' &&
      (filter === 'All' || t.cat === 'Work'),
  );

  // 2. STATS用：今日の進捗計算
  const todayTasks = allTasks.filter(
    (t) => t.date === todayStr && (filter === 'All' || t.cat === 'Work'),
  );
  const todayDoneCount = todayTasks.filter((t) => t.state === 'Done').length;
  const todayRemainingCount = todayTasks.filter(
    (t) => t.state !== 'Done',
  ).length;
  const totalToday = todayDoneCount + todayRemainingCount;
  const progressRate =
    totalToday > 0 ? Math.round((todayDoneCount / totalToday) * 100) : 0;

  // --- カレンダー・進捗計算 ---
  const today = new Date();
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);
  const totalDaysInYear = differenceInDays(yearEnd, yearStart) + 1;
  const passedDays = differenceInDays(today, yearStart) + 1;
  const yearProgress = ((passedDays / totalDaysInYear) * 100).toFixed(1);
  const weekNumber = getWeek(today, { weekStartsOn: 1 });

  return (
    <div className="h-full bg-[#171717] flex flex-col md:flex-row overflow-hidden no-scrollbar">
      {/* 左側：スタッツパネル */}
      <div className="w-full md:w-80 p-8 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col gap-10 shrink-0 bg-neutral-900/10">
        <header>
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Calendar size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              Current Date
            </span>
          </div>
          <div className="flex items-baseline gap-4">
            <div className="text-5xl font-black tracking-tighter text-white">
              {format(today, 'MM.dd')}
            </div>
            <div className="text-xl font-black text-neutral-700 font-mono tracking-tighter">
              #{weekNumber}
            </div>
          </div>
          <div className="text-xl text-neutral-500 font-bold tracking-tight mt-1">
            {format(today, 'EEEE')}
          </div>
        </header>

        <section>
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2 text-neutral-500">
              <Activity size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Year Progress
              </span>
            </div>
            <span className="text-sm font-mono font-bold text-blue-500">
              {yearProgress}%
            </span>
          </div>
          <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden p-[2px]">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${yearProgress}%` }}
            />
          </div>
        </section>

        {/* タスク集計パネル：Doneを含めた進捗を表示 */}
        <div className="bg-neutral-900/50 p-6 rounded-[24px] border border-neutral-800 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="text-neutral-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Target size={12} /> Today's Focus
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/20">
              {progressRate}% Done
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-5xl font-black text-white leading-none">
                {todayRemainingCount}
              </span>
              <span className="text-[10px] text-neutral-600 font-bold uppercase mt-2 tracking-tighter">
                Active Tasks Remaining
              </span>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <Circle size={48} className="text-neutral-800" strokeWidth={4} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-mono font-bold text-blue-500">
                  {todayDoneCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右側：メインコンテンツエリア */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-3xl mx-auto">
          {/* モバイルでは非表示 */}
          <div className="hidden md:flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
              <Target size={24} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Focus on Tasks
            </h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-neutral-900/50 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-neutral-900 rounded-[32px]">
              <p className="text-neutral-600 font-bold italic">
                No active tasks for today.
              </p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {displayTasks.map((task) => (
                <div
                  key={task.id}
                  className="group p-5 md:p-6 bg-neutral-900/40 rounded-[24px] md:rounded-[28px] border border-neutral-800/50 hover:border-blue-500/30 transition-all duration-300 shadow-xl relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          task.theme === 'blue'
                            ? 'bg-blue-600/10 text-blue-500 border-blue-600/20'
                            : task.theme === 'green'
                              ? 'bg-green-600/10 text-green-500 border-green-600/20'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}
                      >
                        {task.cat || 'No Cat'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-neutral-800 text-neutral-500 border border-neutral-700">
                        {task.state}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.url && (
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-neutral-600 hover:text-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <div
                        onClick={() => setSelectedTask(task)}
                        className="p-2 text-neutral-700 group-hover:text-blue-500 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedTask(task)}
                    className="cursor-pointer"
                  >
                    <h3 className="text-lg md:text-xl font-bold text-neutral-100 mb-2 group-hover:text-blue-400 transition-colors">
                      {task.name}
                    </h3>
                    <p className="text-neutral-500 leading-relaxed text-xs md:text-sm line-clamp-2 italic">
                      {task.summary || 'No summary available.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={(name, date, status) =>
            handleSaveTask(selectedTask, name, date, status)
          }
          onComplete={handleComplete}
          processingId={processingId}
        />
      )}
    </div>
  );
}

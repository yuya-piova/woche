'use client';

import { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  subMonths,
  addMonths,
} from 'date-fns';
import {
  Trophy,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import type { Task } from '@/components/TaskModal';

export default function MonthlyPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyTasks = async (date: Date) => {
    setLoading(true);
    const monthStr = format(date, 'yyyy-MM');
    try {
      const res = await fetch(`/api/tasks?month=${monthStr}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch monthly tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyTasks(currentMonth);
  }, [currentMonth]);

  // --- 集計ロジック ---
  const doneTasks = tasks.filter((t) => t.state === 'Done');
  const workDone = doneTasks.filter((t) => t.cat === 'Work').length;
  const lifeDone = doneTasks.filter((t) => t.cat === 'Life').length;

  // 日別データの作成
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const dailyStats = daysInMonth.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const count = doneTasks.filter((t) => t.date === dayStr).length;
    return { dayStr, count, label: format(day, 'd') };
  });

  const maxDailyCount = Math.max(...dailyStats.map((d) => d.count), 1);

  // 前月・次月移動
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="h-full bg-[#171717] text-white overflow-y-auto no-scrollbar p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* ヘッダー: 月選択 */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase">
                Monthly Archive
              </h1>
              <p className="text-neutral-500 font-bold text-sm tracking-widest">
                {format(currentMonth, 'MMMM yyyy')}
              </p>
            </div>
          </div>

          <div className="flex bg-neutral-900 rounded-xl p-1 border border-neutral-800">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-neutral-800 rounded-lg transition"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 flex items-center font-black text-sm">
              {format(currentMonth, 'yyyy.MM')}
            </div>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-neutral-800 rounded-lg transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        {/* STATS カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900/50 p-6 rounded-[32px] border border-neutral-800 flex flex-col gap-2">
            <div className="text-blue-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Trophy size={14} /> Total Achievements
            </div>
            <div className="text-5xl font-black italic">{doneTasks.length}</div>
            <div className="text-neutral-600 text-[10px] font-bold uppercase">
              Tasks completed this month
            </div>
          </div>

          <div className="bg-neutral-900/50 p-6 rounded-[32px] border border-neutral-800 flex flex-col gap-2">
            <div className="text-green-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <PieChart size={14} /> Balance (Work/Life)
            </div>
            <div className="flex items-end gap-4">
              <div className="text-3xl font-black text-blue-400">
                {workDone}
                <span className="text-xs ml-1 text-neutral-600">W</span>
              </div>
              <div className="text-3xl font-black text-green-400">
                {lifeDone}
                <span className="text-xs ml-1 text-neutral-600">L</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full mt-2 overflow-hidden flex">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${(workDone / doneTasks.length) * 100}%` }}
              />
              <div
                className="h-full bg-green-500"
                style={{ width: `${(lifeDone / doneTasks.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-neutral-900/50 p-6 rounded-[32px] border border-neutral-800 flex flex-col gap-2">
            <div className="text-purple-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <BarChart3 size={14} /> Daily Peak
            </div>
            <div className="text-5xl font-black italic">
              {maxDailyCount === 1 && doneTasks.length === 0
                ? 0
                : maxDailyCount}
            </div>
            <div className="text-neutral-600 text-[10px] font-bold uppercase">
              Max tasks in a single day
            </div>
          </div>
        </div>

        {/* アクティビティチャート (簡易バーチャート) */}
        <section className="bg-neutral-900/30 p-8 rounded-[40px] border border-neutral-800/50">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-8 flex items-center gap-2">
            <BarChart3 size={14} /> Activity Heatmap
          </h3>
          <div className="flex items-end justify-between gap-1 h-32">
            {dailyStats.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 group"
              >
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${d.count > 0 ? 'bg-blue-600 hover:bg-blue-400' : 'bg-neutral-800/50'}`}
                  style={{
                    height: `${(d.count / maxDailyCount) * 100}%`,
                    minHeight: d.count > 0 ? '4px' : '2px',
                  }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {d.count} tasks
                  </div>
                </div>
                <span className="text-[8px] font-bold text-neutral-700">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 完了ログ一覧 */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
            <CheckCircle2 size={14} /> Completion Log
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 bg-neutral-900/20 p-4 rounded-2xl border border-neutral-800/50"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${task.cat === 'Work' ? 'bg-blue-500' : 'bg-green-500'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate text-neutral-200">
                    {task.name}
                  </div>
                  <div className="text-[10px] text-neutral-600 font-mono">
                    {task.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

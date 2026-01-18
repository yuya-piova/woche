'use client';

import { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
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
  ExternalLink,
} from 'lucide-react';
import type { Task } from '@/components/TaskModal';

export default function MonthlyPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Work'>('All');

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

    const syncSettings = () => {
      const savedFilter = localStorage.getItem('gleisFilter');
      if (savedFilter) setFilter(savedFilter as 'All' | 'Work');
    };
    syncSettings();
    window.addEventListener('settings-updated', syncSettings);
    return () => window.removeEventListener('settings-updated', syncSettings);
  }, [currentMonth]);

  // --- 集計ロジック ---
  const doneTasks = tasks.filter((t) => t.state === 'Done');

  // Balance（集計）は設定にかかわらず常に両方を計算
  const workDoneCount = doneTasks.filter((t) => t.cat === 'Work').length;
  const lifeDoneCount = doneTasks.filter((t) => t.cat === 'Life').length;

  // 表示用フィルタリング（STATSやログ、チャートに適用）
  const displayDoneTasks = doneTasks.filter(
    (t) => filter === 'All' || t.cat === 'Work',
  );

  // 日別データの作成（積み上げグラフ用）
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const dailyStats = daysInMonth.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayTasks = doneTasks.filter((t) => {
      if (!t.date) return false;
      // 日付に幅がある場合(YYYY-MM-DDTHH:mm...)の開始日のみを判定
      return t.date.split('T')[0] === dayStr;
    });

    const workCount = dayTasks.filter((t) => t.cat === 'Work').length;
    const lifeCount = dayTasks.filter((t) => t.cat === 'Life').length;

    // 設定がWorkのみの場合はLifeを0として扱う（チャートの表示制御）
    const effectiveLifeCount = filter === 'All' ? lifeCount : 0;

    return {
      dayStr,
      workCount,
      lifeCount: effectiveLifeCount,
      total: workCount + effectiveLifeCount,
      label: format(day, 'd'),
    };
  });

  const maxDailyCount = Math.max(...dailyStats.map((d) => d.total), 1);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="h-full bg-[#171717] text-white overflow-y-auto no-scrollbar p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* ヘッダー */}
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
              <Trophy size={14} /> {filter === 'All' ? 'Total' : 'Work'}{' '}
              Achievements
            </div>
            <div className="text-5xl font-black italic">
              {displayDoneTasks.length}
            </div>
            <div className="text-neutral-600 text-[10px] font-bold uppercase">
              Tasks completed this month
            </div>
          </div>

          {/* Balanceカード：常に両方を集計表示 */}
          <div className="bg-neutral-900/50 p-6 rounded-[32px] border border-neutral-800 flex flex-col gap-2">
            <div className="text-green-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <PieChart size={14} /> Balance (Work/Life)
            </div>
            <div className="flex items-end gap-4">
              <div className="text-3xl font-black text-blue-400">
                {workDoneCount}
                <span className="text-xs ml-1 text-neutral-600">W</span>
              </div>
              <div className="text-3xl font-black text-green-400">
                {lifeDoneCount}
                <span className="text-xs ml-1 text-neutral-600">L</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full mt-2 overflow-hidden flex">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{
                  width: `${(workDoneCount / (doneTasks.length || 1)) * 100}%`,
                }}
              />
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(lifeDoneCount / (doneTasks.length || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-neutral-900/50 p-6 rounded-[32px] border border-neutral-800 flex flex-col gap-2">
            <div className="text-purple-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <BarChart3 size={14} /> Daily Peak
            </div>
            <div className="text-5xl font-black italic">
              {maxDailyCount > 0 ? maxDailyCount : 0}
            </div>
            <div className="text-neutral-600 text-[10px] font-bold uppercase">
              Max activity in a day
            </div>
          </div>
        </div>

        {/* Activity Heatmap (積み上げ二色バー) */}
        <section className="bg-neutral-900/30 p-8 rounded-[40px] border border-neutral-800/50">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-8 flex items-center gap-2">
            <BarChart3 size={14} /> Activity Stack
          </h3>
          <div className="flex items-end justify-between gap-1 h-32">
            {dailyStats.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 group relative"
              >
                <div
                  className="w-full flex flex-col-reverse justify-start transition-all duration-500"
                  style={{
                    height: `${(d.total / maxDailyCount) * 100}%`,
                    minHeight: d.total > 0 ? '4px' : '2px',
                  }}
                >
                  {/* Work部 (青) - styleで背景色を固定 */}
                  <div
                    className="w-full rounded-b-sm"
                    style={{
                      height: `${(d.workCount / (d.total || 1)) * 100}%`,
                      backgroundColor: '#2563eb', // blue-600
                    }}
                  />

                  {/* Life部 (緑) - styleで背景色を固定 */}
                  {filter === 'All' && (
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${(d.lifeCount / (d.total || 1)) * 100}%`,
                        backgroundColor: '#16a34a', // green-600
                      }}
                    />
                  )}

                  {/* ツールチップ */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-xl">
                    {d.workCount}W {filter === 'All' && `/ ${d.lifeCount}L`}
                  </div>
                </div>
                <span className="text-[8px] font-bold text-neutral-700">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Completion Log */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
            <CheckCircle2 size={14} /> Completion Log ({filter})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayDoneTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-4 bg-neutral-900/20 p-4 rounded-2xl border border-neutral-800/50 hover:border-blue-500/30 transition-all"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${task.cat === 'Work' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate text-neutral-200">
                    {task.name}
                  </div>
                  <div className="text-[10px] text-neutral-600 font-mono italic">
                    {/* 日付文字列から開始日のみを抽出 */}
                    {task.date ? task.date.split('T')[0] : 'No Date'}
                  </div>
                </div>
                {task.url && (
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-neutral-700 hover:text-white transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

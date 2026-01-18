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
  Hash,
  Activity,
  ChevronRight,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import type { Task } from '@/components/TaskModal';
import { useTasks } from '@/hooks/useTasks';

export default function FocusPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const res = await fetch(`/api/tasks?date=${todayStr}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const { handleSaveTask, handleComplete, processingId } = useTasks(
    tasks,
    fetchTasks,
  );

  useEffect(() => {
    fetchTasks();
  }, []);

  // --- 統計用データ計算 ---
  const today = new Date();
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);
  const totalDaysInYear = differenceInDays(yearEnd, yearStart) + 1;
  const passedDays = differenceInDays(today, yearStart) + 1;
  const yearProgress = ((passedDays / totalDaysInYear) * 100).toFixed(1);
  const weekNumber = getWeek(today, { weekStartsOn: 1 });

  // タスク集計
  const remainingTasks = tasks.length;

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
            <div className="text-5xl font-black tracking-tighter">
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

        {/* タスク集計パネル */}
        <div className="bg-neutral-900/50 p-6 rounded-[24px] border border-neutral-800 flex flex-col gap-4">
          <div className="text-neutral-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Target size={12} /> Today's Stats
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-white leading-none">
                {remainingTasks}
              </span>
              <span className="text-[10px] text-neutral-600 font-bold uppercase mt-1">
                Pending Tasks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 右側：メインコンテンツエリア */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
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
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-neutral-900 rounded-[32px]">
              <p className="text-neutral-600 font-bold italic">
                No focus tasks for today.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="group p-6 bg-neutral-900/40 rounded-[28px] border border-neutral-800/50 hover:border-blue-500/30 transition-all duration-300 cursor-pointer shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        task.theme === 'blue'
                          ? 'bg-blue-600/10 text-blue-500 border-blue-600/20'
                          : task.theme === 'green'
                            ? 'bg-green-600/10 text-green-500 border-green-600/20'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {task.cat || 'No Cat'}
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-neutral-700 group-hover:text-blue-500 transition-colors"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-100 mb-3 group-hover:text-blue-400 transition-colors">
                    {task.name}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed text-sm line-clamp-2 italic">
                    {task.summary ||
                      'No summary available for this focus task.'}
                  </p>
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

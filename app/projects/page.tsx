'use client';

import { useState, useEffect } from 'react';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import TaskModal from '@/components/TaskModal';
import type { Task } from '@/app/api/tasks/route';
import { useTasks } from '@/hooks/useTasks';

export default function ProjectsPage() {
  const getFiscalYear = (date: Date) => {
    return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  };

  const [currentFY, setCurrentFY] = useState(getFiscalYear(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // API側でフィルタリング済み
      const res = await fetch(`/api/tasks?fiscalYear=${currentFY}&catTag=PRJ`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch project tasks:', error);
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
  }, [currentFY]);

  const activeTasks = tasks.filter(
    (t) => t.state !== 'Done' && t.state !== 'Canceled',
  );
  const doneTasks = tasks.filter((t) => t.state === 'Done');

  const prevFY = () => setCurrentFY((prev) => prev - 1);
  const nextFY = () => setCurrentFY((prev) => prev + 1);

  return (
    <div className="h-full bg-[#171717] flex flex-col text-white overflow-hidden">
      {/* ヘッダーエリア */}
      <div className="flex-none p-6 md:p-8 border-b border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Project Management
            </h1>
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">
              Fiscal Year {currentFY} ({currentFY}.4.1 - {currentFY + 1}.3.31)
            </p>
          </div>
        </div>

        <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
          <button
            onClick={prevFY}
            className="p-2 hover:bg-neutral-800 rounded-md transition text-neutral-400 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 flex items-center font-black text-sm font-mono text-indigo-400">
            FY{currentFY}
          </div>
          <button
            onClick={nextFY}
            className="p-2 hover:bg-neutral-800 rounded-md transition text-neutral-400 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-neutral-900 rounded-2xl" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-neutral-800 rounded-3xl text-neutral-600">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold">
                No project tasks found in FY{currentFY}
              </p>
            </div>
          ) : (
            <>
              {/* Active Projects */}
              <section>
                <div className="flex items-center gap-2 mb-6 text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em]">
                    Active Projects
                  </h2>
                  <span className="ml-2 px-2 py-0.5 bg-indigo-500/10 rounded-full text-[10px] font-bold">
                    {activeTasks.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="group bg-neutral-900/50 border border-neutral-800 hover:border-indigo-500/50 p-5 rounded-2xl transition-all cursor-pointer hover:bg-neutral-900 flex flex-col justify-between min-h-[140px]"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="px-2 py-1 rounded-md bg-neutral-800 text-[10px] font-bold text-neutral-400 border border-neutral-700 uppercase">
                            {task.cat || 'No Cat'}
                          </span>
                          {task.url && (
                            <a
                              href={task.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-neutral-600 hover:text-white transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                        <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-indigo-400 transition-colors">
                          {task.name}
                        </h3>
                        <div className="flex items-center gap-2 text-neutral-500 text-xs font-mono">
                          <Calendar size={12} />
                          {task.date || 'No Date'}
                        </div>
                      </div>

                      {/* 修正1: PRJ削除。左下にSubCat、右下にState */}
                      <div className="mt-4 flex items-end justify-between border-t border-neutral-800 pt-3">
                        <div className="flex flex-wrap gap-1">
                          {task.subCats.map((sub) => (
                            <span
                              key={sub}
                              className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[9px] border border-neutral-700"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                        <div className="px-2 py-1 rounded bg-indigo-900/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                          {task.state}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Completed Projects */}
              {doneTasks.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-6 text-neutral-400">
                    <span className="w-2 h-2 rounded-full bg-green-500/50"></span>
                    <h2 className="text-xs font-black uppercase tracking-[0.2em]">
                      Completed in FY{currentFY}
                    </h2>
                    <span className="ml-2 px-2 py-0.5 bg-neutral-800 rounded-full text-[10px] font-bold">
                      {doneTasks.length}
                    </span>
                  </div>

                  {/* 修正2: 取り消し線やグレーアウトを廃止、視認性をActiveに近づける */}
                  <div className="space-y-2">
                    {doneTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 p-3 rounded-xl border border-neutral-800 bg-neutral-900/30 text-neutral-200"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
                        <span className="flex-1 text-sm font-bold">
                          {task.name}
                        </span>

                        {/* 日付の左にSubCatを表示 */}
                        <div className="flex gap-1">
                          {task.subCats.map((sub) => (
                            <span
                              key={sub}
                              className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-800 text-neutral-400 border border-neutral-700/50"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-mono text-neutral-400">
                          {task.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
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

'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Plus,
  Settings as SettingsIcon,
  X,
  ExternalLink,
  Check,
  Trash2,
  Moon,
  Github,
} from 'lucide-react';

// --- 型定義 ---
type Task = {
  id: string;
  name: string;
  date: string | null;
  state: string;
  cat: string;
  subCats: string[];
  theme: string;
  url: string;
  summary: string;
};

// --- 設定モーダル（エラー回避のためファイル内に定義） ---
function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
      <div className="bg-[#1A1A1A] border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black flex items-center gap-2">
              <SettingsIcon size={20} className="text-blue-500" />
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon size={18} className="text-neutral-400" />
                <span className="text-sm font-bold text-neutral-200">
                  Dark Mode
                </span>
              </div>
              <div className="w-10 h-5 bg-blue-600 rounded-full flex items-center px-1">
                <div className="w-3 h-3 bg-white rounded-full ml-auto" />
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <Github size={18} className="text-neutral-400" />
                <span className="text-sm font-bold text-neutral-200">
                  GitHub Sync
                </span>
              </div>
              <span className="text-[10px] font-black bg-neutral-800 px-2 py-1 rounded text-neutral-500">
                SOON
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-4 rounded-2xl transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const handleOpenSettings = () => setShowSettings(true);
    window.addEventListener('open-settings', handleOpenSettings);
    return () =>
      window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  const openModal = (task: Task) => {
    setSelectedTask(task);
    setEditName(task.name);
  };

  const handleSaveTask = async () => {
    if (!selectedTask) return;
    try {
      const res = await fetch('/api/tasks/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTask.id, name: editName }),
      });
      if (res.ok) {
        setTasks(
          tasks.map((t) =>
            t.id === selectedTask.id ? { ...t, name: editName } : t,
          ),
        );
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    try {
      const res = await fetch(`/api/tasks/delete?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTasks(tasks.filter((t) => t.id !== id));
        setSelectedTask(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAdd = async (date: string | null) => {
    const name = window.prompt('新しいタスク名を入力してください');
    if (!name) return;
    const res = await fetch('/api/tasks/create', {
      method: 'POST',
      body: JSON.stringify({ name, date }),
    });
    if (res.ok) fetchTasks();
  };

  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = [...Array(7)].map((_, i) => addDays(startDate, i));

  return (
    <div className="h-full flex flex-col bg-[#171717] overflow-hidden">
      <main className="flex-1 overflow-x-auto no-scrollbar flex p-6 gap-6">
        {/* Inbox */}
        <section className="w-72 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">
              Inbox
            </h2>
            <button
              onClick={() => handleQuickAdd(null)}
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-20">
            {tasks
              .filter((t) => !t.date)
              .map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => openModal(task)}
                />
              ))}
          </div>
        </section>

        {/* Weekly columns */}
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasks.filter((t) => t.date === dateStr);
          const active = isToday(day);

          return (
            <section
              key={dateStr}
              className="w-72 shrink-0 flex flex-col gap-4"
            >
              <div
                className={`px-2 py-1 rounded-xl transition-colors ${active ? 'bg-blue-600/5' : ''}`}
              >
                <div
                  className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-blue-500' : 'text-neutral-600'}`}
                >
                  {format(day, 'EEE', { locale: ja })}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-black ${active ? 'text-white' : 'text-neutral-300'}`}
                  >
                    {format(day, 'dd')}
                  </span>
                  {active && (
                    <span className="text-[10px] font-bold text-blue-500 italic uppercase">
                      Today
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-20">
                {dayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => openModal(task)}
                  />
                ))}
                <button
                  onClick={() => handleQuickAdd(dateStr)}
                  className="w-full py-3 border-2 border-dashed border-neutral-800/30 rounded-[24px] text-neutral-800 hover:border-neutral-700 hover:text-neutral-600 transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Add Task
                  </span>
                </button>
              </div>
            </section>
          );
        })}
      </main>

      {/* 詳細モーダル */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-[#1A1A1A] border border-white/10 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${selectedTask.theme === 'blue' ? 'bg-blue-600/10 text-blue-500 border-blue-600/20' : 'bg-neutral-800 text-neutral-400 border-neutral-700'}`}
                  >
                    {selectedTask.cat}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-neutral-800 text-neutral-500 text-[10px] font-black uppercase border border-neutral-700">
                    {selectedTask.state}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">
                  Task Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none focus:text-blue-400 transition-colors px-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-neutral-600 uppercase tracking-widest ml-1">
                  Summary
                </label>
                <div className="bg-white/[0.03] border border-white/5 rounded-[20px] p-5 min-h-[100px]">
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    {selectedTask.summary || 'No summary available.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex gap-3">
                  <a
                    href={selectedTask.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5"
                  >
                    <ExternalLink size={18} />
                    <span>Notion</span>
                  </a>
                  <button
                    onClick={handleSaveTask}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                  >
                    <Check size={18} />
                    <span>Save Changes</span>
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="py-2 text-red-500/40 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

// リッチな質感の TaskCard コンポーネント
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative p-5 bg-neutral-900/60 border border-white/5 rounded-[24px] cursor-pointer hover:border-blue-500/30 hover:bg-neutral-800/40 transition-all duration-300 shadow-xl"
    >
      <div
        className={`absolute left-0 top-5 bottom-5 w-1 rounded-r-full transition-all group-hover:w-1.5 ${
          task.theme === 'blue'
            ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
            : task.theme === 'green'
              ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
              : 'bg-neutral-700'
        }`}
      />

      <div className="pl-3">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 group-hover:text-blue-400 transition-colors">
            {task.cat}
          </span>
          {task.state === 'Doing' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </div>
        <h3 className="font-bold text-[14px] text-neutral-200 leading-tight group-hover:text-white transition-colors line-clamp-2">
          {task.name}
        </h3>
        {task.summary && (
          <p className="mt-2 text-[10px] text-neutral-600 line-clamp-1 italic group-hover:text-neutral-500 transition-colors">
            {task.summary}
          </p>
        )}
      </div>
    </div>
  );
}

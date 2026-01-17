'use client';

import { useState, useEffect } from 'react';

// プロジェクト共通のタスク型
export type Task = {
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

interface TaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (name: string, date: string | null, status: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  processingId: string | null;
}

export default function TaskModal({
  task,
  onClose,
  onSave,
  onComplete,
  processingId,
}: TaskModalProps) {
  // 編集用の一時ステート（page.tsxから移動）
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');

  // モーダルが開いた時に値をセット
  useEffect(() => {
    setEditName(task.id === 'new' ? '' : task.name);
    setEditDate(task.date);
    setEditStatus(task.state);
  }, [task]);

  const handleSaveClick = async () => {
    if (!editName || processingId !== null) return;

    try {
      // 1. 保存を実行（app/page.tsx または app/focus/page.tsx の handleSaveTask が呼ばれる）
      await onSave(editName, editDate, editStatus);
      // 2. 完了したらモーダルを閉じる
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-5">
          {/* Task Name Input */}
          <div className="flex flex-col gap-1">
            <label className="text-neutral-500 text-[10px] font-bold uppercase">
              Task Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-neutral-700 text-white p-3 rounded-xl text-lg font-bold outline-none border-2 border-transparent focus:border-blue-500"
              placeholder="タスクを入力..."
            />
          </div>

          {/* Date Input */}
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

          {/* Status Selection (Existing Task Only) */}
          {task.id !== 'new' && (
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
                    onComplete(task.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg font-bold bg-green-700 text-white"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-neutral-400 font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSaveClick}
            disabled={!editName || processingId !== null}
            className="flex-[2] bg-blue-600 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 text-white"
          >
            {processingId === task.id ? 'Saving...' : 'Save Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

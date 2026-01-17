import { useState } from 'react';
import type { Task } from '@/components/TaskModal';

export function useTasks(
  initialTasks: Task[],
  fetchTasks: () => Promise<void>,
) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 保存処理
  const handleSaveTask = async (
    popupTask: Task,
    name: string,
    date: string | null,
    status: string,
  ) => {
    if (processingId) return;
    setProcessingId(popupTask.id);

    const isNew = popupTask.id === 'new';
    const apiUrl = isNew ? '/api/create' : '/api/update-task';
    const payload = isNew
      ? { name, date }
      : {
          id: popupTask.id,
          name,
          date,
          status,
        };

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      await fetchTasks();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setProcessingId(null);
    }
  };

  // 完了処理
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
      await fetchTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  return { handleSaveTask, handleComplete, processingId };
}

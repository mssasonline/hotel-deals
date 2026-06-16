'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/authContext';

type Priority = 'low' | 'medium' | 'high';
type TaskStatus = 'todo' | 'done';

interface Task {
  id: string;
  title: string;
  hotel: string;
  priority: Priority;
  status: TaskStatus;
}

const INITIAL_TASKS: Task[] = [];

const PRIORITY_CONFIG: Record<Priority, { label: string; bg: string; text: string }> = {
  high:   { label: 'High',   bg: 'bg-red-50',    text: 'text-red-600'   },
  medium: { label: 'Medium', bg: 'bg-amber-50',  text: 'text-amber-600' },
  low:    { label: 'Low',    bg: 'bg-gray-100',  text: 'text-gray-500'  },
};

function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, bg, text } = PRIORITY_CONFIG[priority];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${bg} ${text}`}>
      {label}
    </span>
  );
}

function TaskCard({
  task,
  onMove,
  onDelete,
}: {
  task: Task;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isDone = task.status === 'done';
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 transition-opacity ${isDone ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold text-gray-900 leading-snug flex-1 ${isDone ? 'line-through text-gray-400' : ''}`}>
          {task.title}
        </p>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
          title="Delete task"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
        </svg>
        <span className="truncate">{task.hotel}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <button
          type="button"
          onClick={() => onMove(task.id)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
            isDone
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'text-white'
          }`}
          style={!isDone ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
        >
          {isDone ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Undo
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark Done
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function AddTaskModal({
  hotels,
  onAdd,
  onClose,
}: {
  hotels: string[];
  onAdd: (title: string, hotel: string, priority: Priority) => void;
  onClose: () => void;
}) {
  const [title, setTitle]       = useState('');
  const [hotel, setHotel]       = useState(hotels[0] ?? '');
  const [priority, setPriority] = useState<Priority>('medium');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, hotel, priority);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">New Task</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Task Description
            </label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clean room after checkout"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
          </div>

          {hotels.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Hotel
              </label>
              <select
                value={hotel}
                onChange={(e) => setHotel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              >
                {hotels.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Priority
            </label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                const { label, bg, text } = PRIORITY_CONFIG[p];
                const selected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                      selected
                        ? `${bg} ${text} border-current`
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks]       = useState<Task[]>(INITIAL_TASKS);
  const [showAdd, setShowAdd]   = useState(false);
  const [hotelNames, setHotelNames] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function loadHotels() {
      const { data } = await supabase
        .from('hotel_partners')
        .select('hotels(name)')
        .eq('user_id', userId);
      if (data) {
        const names = (data as Record<string, unknown>[])
          .map(r => (r.hotels as { name: string } | null)?.name)
          .filter((n): n is string => !!n);
        setHotelNames(names);
      }
    }
    loadHotels().catch(err => console.error('[tasks] loadHotels error:', err));
  }, [user]);

  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  function moveTask(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: t.status === 'todo' ? 'done' : 'todo' } : t
      )
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addTask(title: string, hotel: string, priority: Priority) {
    const newTask: Task = {
      id: `t${Date.now()}`,
      title,
      hotel,
      priority,
      status: 'todo',
    };
    setTasks((prev) => [newTask, ...prev]);
    setShowAdd(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {showAdd && <AddTaskModal hotels={hotelNames} onAdd={addTask} onClose={() => setShowAdd(false)} />}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-500 text-sm">
            {todoTasks.length} pending · {doneTasks.length} completed
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', boxShadow: '0 2px 10px rgba(30,58,138,0.25)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* To Do */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">To Do</h2>
            <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {todoTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {todoTasks.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                <p className="text-gray-400 text-sm">All tasks completed!</p>
              </div>
            ) : (
              todoTasks.map((task) => (
                <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} />
              ))
            )}
          </div>
        </div>

        {/* Done */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Done</h2>
            <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {doneTasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {doneTasks.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                <p className="text-gray-400 text-sm">No completed tasks yet.</p>
              </div>
            ) : (
              doneTasks.map((task) => (
                <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

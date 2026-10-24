import { useState } from 'react';
import { api } from '../lib/api';
import { generateSubtasks, suggestPriority } from '../api/ai';

interface CreateTaskModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function CreateTaskModal({ workspaceId, isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAiSubtasks = async () => {
    if (!title.trim()) {
      setError('Please enter a task title first.');
      return;
    }
    setError('');
    setLoadingSubtasks(true);
    try {
      const generated = await generateSubtasks(title, description);
      setSubtasks((prev) => [...prev, ...generated]);
    } catch (err: any) {
      console.error('Failed to generate subtasks:', err);
      setError('AI Subtask generation failed. Please try again.');
    } finally {
      setLoadingSubtasks(false);
    }
  };

  const handleAiPriority = async () => {
    if (!title.trim()) {
      setError('Please enter a task title first.');
      return;
    }
    setError('');
    setLoadingPriority(true);
    try {
      const suggested = await suggestPriority(title, description);
      setPriority(suggested);
    } catch (err: any) {
      console.error('Failed to suggest priority:', err);
      setError('AI Priority suggestion failed. Please try again.');
    } finally {
      setLoadingPriority(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/tasks', {
        workspaceId,
        title,
        description,
        priority,
      });

      const createdTask = response.data;

      if (subtasks.length > 0 && createdTask?.id) {
        for (const st of subtasks) {
          await api.post(`/tasks/${createdTask.id}/subtasks`, { title: st });
        }
      }

      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setSubtasks([]);
      onTaskCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setError(err.response?.data?.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-800">Create New Task</h2>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Task Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Implement user authentication flow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Add details about this task..."
            />
          </div>

          {/* AI Helper Actions with Independent Controls */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAiSubtasks}
              disabled={loadingSubtasks || loading}
              className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loadingSubtasks ? 'Generating...' : '✨ Auto Subtasks'}
            </button>

            <button
              type="button"
              onClick={handleAiPriority}
              disabled={loadingPriority || loading}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loadingPriority ? 'Suggesting...' : '✨ Suggest Priority'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {subtasks.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Subtasks ({subtasks.length})
              </label>
              <ul className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2 bg-gray-50">
                {subtasks.map((st, idx) => (
                  <li key={idx} className="text-xs text-gray-700 flex items-center gap-1.5">
                    <span className="text-purple-600 font-bold">•</span> {st}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
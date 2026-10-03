import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import CreateTaskModal from '../components/CreateTaskModal';

interface Workspace {
  id: string;
  name: string;
  description?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

const COLUMNS: { label: string; status: Task['status'] }[] = [
  { label: 'To Do', status: 'TODO' },
  { label: 'In Progress', status: 'IN_PROGRESS' },
  { label: 'In Review', status: 'IN_REVIEW' },
  { label: 'Done', status: 'DONE' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces');
      setWorkspaces(res.data);
      if (res.data.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching workspaces', err);
    }
  };

  const fetchTasks = async (workspaceId: string) => {
    try {
      const res = await api.get(`/tasks?workspaceId=${workspaceId}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Error fetching tasks', err);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchTasks(selectedWorkspace.id);
    }
  }, [selectedWorkspace]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/workspaces', { name: newWorkspaceName.trim() });
      const createdWorkspace = res.data;
      setWorkspaces((prev) => [...prev, createdWorkspace]);
      setSelectedWorkspace(createdWorkspace);
      setNewWorkspaceName('');
      setShowCreateWs(false);
    } catch (err) {
      console.error('Failed to create workspace:', err);
      alert('Could not create workspace. Please check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
      if (selectedWorkspace) fetchTasks(selectedWorkspace.id);
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r bg-white p-4 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-600 mb-6">DevFlow AI</h1>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Workspaces</span>
              <button
                type="button"
                onClick={() => setShowCreateWs(!showCreateWs)}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                + New
              </button>
            </div>

            {showCreateWs && (
              <form onSubmit={handleCreateWorkspace} className="mb-3 space-y-1">
                <input
                  type="text"
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full rounded border p-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newWorkspaceName.trim()}
                  className="w-full rounded bg-blue-600 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer font-medium"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </form>
            )}

            <div className="space-y-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWorkspace(ws)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm cursor-pointer ${
                    selectedWorkspace?.id === ws.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {ws.name}
                </button>
              ))}
              {workspaces.length === 0 && !showCreateWs && (
                <p className="text-xs text-gray-400">No workspaces yet.</p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full rounded border border-red-200 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
        >
          Logout
        </button>
      </div>

      {/* Main Kanban Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-white p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedWorkspace ? selectedWorkspace.name : 'Select a Workspace'}
            </h2>
            <p className="text-xs text-gray-500">Task Management & Board</p>
          </div>
          {selectedWorkspace && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              + Add Task
            </button>
          )}
        </header>

        {/* Kanban Columns */}
        <main className="flex-1 p-6 overflow-x-auto">
          {!selectedWorkspace ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Create or select a workspace from the sidebar to get started.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 h-full min-w-[800px]">
              {COLUMNS.map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.status);
                return (
                  <div key={col.status} className="flex flex-col rounded-lg bg-gray-200/60 p-3">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-sm text-gray-700">{col.label}</h3>
                      <span className="rounded bg-gray-300 px-2 py-0.5 text-xs font-bold text-gray-600">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-md bg-white p-3 shadow-sm border border-gray-200 hover:shadow-md transition"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-sm text-gray-800">{task.title}</h4>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                task.priority === 'URGENT'
                                  ? 'bg-red-100 text-red-600'
                                  : task.priority === 'HIGH'
                                  ? 'bg-orange-100 text-orange-600'
                                  : task.priority === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          
                          <div className="mt-2 pt-2 border-t flex justify-end">
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleUpdateTaskStatus(task.id, e.target.value as Task['status'])
                              }
                              className="text-xs border rounded p-1 bg-gray-50 text-gray-600"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="IN_REVIEW">In Review</option>
                              <option value="DONE">Done</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedWorkspace && (
        <CreateTaskModal
          workspaceId={selectedWorkspace.id}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTaskCreated={() => fetchTasks(selectedWorkspace.id)}
        />
      )}
    </div>
  );
}
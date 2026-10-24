import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { searchTasks, type SearchTaskResult } from '../api/ai';
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

  // AI Semantic Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchTaskResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [selectedWorkspace]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedWorkspace) return;

    setIsSearching(true);
    try {
      const results = await searchTasks(searchQuery, selectedWorkspace.id);
      setSearchResults(results);
    } catch (err) {
      console.error('Semantic search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const res = await api.post('/workspaces', { name: newWorkspaceName });
      setWorkspaces([...workspaces, res.data]);
      setSelectedWorkspace(res.data);
      setNewWorkspaceName('');
      setShowCreateWs(false);
    } catch (err) {
      console.error('Failed to create workspace', err);
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

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      if (selectedWorkspace) fetchTasks(selectedWorkspace.id);
    } catch (err) {
      console.error('Failed to delete task', err);
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
                onClick={() => setShowCreateWs(!showCreateWs)}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                + New
              </button>
            </div>

            {showCreateWs && (
              <form onSubmit={handleCreateWorkspace} className="mb-3">
                <input
                  type="text"
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full rounded border p-1 text-xs mb-1"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full rounded bg-blue-600 py-1 text-xs text-white"
                >
                  Save
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
        <header className="border-b bg-white p-4 flex justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedWorkspace ? selectedWorkspace.name : 'Select a Workspace'}
            </h2>
            <p className="text-xs text-gray-500">Task Management & Vector RAG Search</p>
          </div>

          {selectedWorkspace && (
            <div className="flex items-center gap-3">
              {/* Semantic Search Bar */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="🔍 AI Semantic Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-md border px-3 py-1.5 text-xs w-64 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
                {searchResults.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="rounded-md border px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </form>

              <button
                onClick={() => setIsModalOpen(true)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
              >
                + Add Task
              </button>
            </div>
          )}
        </header>

        {/* Kanban Columns / Search Results */}
        <main className="flex-1 p-6 overflow-x-auto">
          {searchResults.length > 0 ? (
            <div className="mb-6 rounded-lg border bg-purple-50/50 p-4">
              <h3 className="font-bold text-sm text-purple-900 mb-3">
                ✨ AI Semantic Search Results ({searchResults.length})
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {searchResults.map((res) => (
                  <div key={res.id} className="rounded-md bg-white p-3 shadow border border-purple-200">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm text-gray-800">{res.title}</h4>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {(res.similarity * 100).toFixed(0)}% Match
                      </span>
                    </div>
                    {res.description && <p className="text-xs text-gray-500 line-clamp-2">{res.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
                            <div className="flex items-center gap-1.5">
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
                              {/* Delete Task Button */}
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-gray-400 hover:text-red-600 text-xs p-0.5 transition cursor-pointer"
                                title="Delete task"
                              >
                                🗑️
                              </button>
                            </div>
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
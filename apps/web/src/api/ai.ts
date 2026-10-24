import { api } from '../lib/api';

export interface GenerateSubtasksResponse {
  subtasks: string[];
}

export interface SuggestPriorityResponse {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface SearchTaskResult {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  similarity: number;
}

export const generateSubtasks = async (title: string, description?: string): Promise<string[]> => {
  const response = await api.post<GenerateSubtasksResponse>('/ai/generate-subtasks', {
    title,
    description,
  });
  return response.data.subtasks;
};

export const suggestPriority = async (title: string, description?: string): Promise<string> => {
  const response = await api.post<SuggestPriorityResponse>('/ai/suggest-priority', {
    title,
    description,
  });
  return response.data.priority;
};

export const searchTasks = async (query: string, workspaceId: string): Promise<SearchTaskResult[]> => {
  const response = await api.post<{ results: SearchTaskResult[] }>('/ai/search', {
    query,
    workspaceId,
  });
  return response.data.results;
};
import { api } from '../lib/api';

export interface GenerateSubtasksResponse {
  subtasks: string[];
}

export interface SuggestPriorityResponse {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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
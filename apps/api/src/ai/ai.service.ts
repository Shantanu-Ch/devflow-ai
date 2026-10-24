import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;
  // Put high-speed flash-lite models first for near-instant execution (<1s)
  private candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
  ];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  // Helper method to attempt prompt generation across fallback models
  private async generateWithFallback(prompt: string): Promise<string> {
    let lastError: any = null;

    for (const model of this.candidateModels) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`Model ${model} unavailable (${error.status || error.message}). Trying next candidate...`);
      }
    }

    throw lastError || new Error('All candidate AI models failed.');
  }

  // Generate subtasks automatically from a task title and description
  async generateSubtasks(taskTitle: string, description?: string): Promise<string[]> {
    try {
      const prompt = `You are an expert project manager assistant.
Given the following task, break it down into 3 to 5 actionable subtasks.
Return ONLY a valid JSON array of strings representing the subtasks, without any markdown formatting or extra text.

Task Title: ${taskTitle}
Description: ${description || 'N/A'}`;

      const rawResponse = await this.generateWithFallback(prompt);
      const text = rawResponse.trim() || '[]';
      const cleanedText = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error('Failed to generate subtasks:', error);
      throw new InternalServerErrorException('AI subtask generation failed. Please try again.');
    }
  }

  // Suggest task priority (LOW, MEDIUM, HIGH, URGENT) based on context
  async suggestPriority(taskTitle: string, description?: string): Promise<string> {
    try {
      const prompt = `You are a project manager. Based on the following task, classify its priority as one of: LOW, MEDIUM, HIGH, or URGENT.
Return ONLY the priority word in uppercase, without any extra text or punctuation.

Task Title: ${taskTitle}
Description: ${description || 'N/A'}`;

      const rawResponse = await this.generateWithFallback(prompt);
      const priority = rawResponse.trim().toUpperCase() || 'MEDIUM';
      if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
        return priority;
      }
      return 'MEDIUM';
    } catch (error) {
      console.error('Failed to suggest priority:', error);
      throw new InternalServerErrorException('AI priority suggestion failed. Please try again.');
    }
  }
}
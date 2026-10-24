import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;
  private candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
  ];

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  // Generate vector embeddings forced to 768 dimensions to match pgvector(768)
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddingModels = [
      'gemini-embedding-001',
      'gemini-embedding-2',
      'text-embedding-004',
    ];

    for (const model of embeddingModels) {
      try {
        const response: any = await this.ai.models.embedContent({
          model,
          contents: text,
          config: {
            outputDimensionality: 768,
          },
        });

        const values =
          response.embeddings?.[0]?.values || response.embedding?.values;

        if (values && Array.isArray(values) && values.length > 0) {
          console.log(`[AI Embedding] Generated ${values.length}-dim vector using ${model} for: "${text.substring(0, 30)}..."`);
          return values;
        }
      } catch (error: any) {
        console.warn(`[AI Embedding Model ${model} failed]:`, error?.message || error);
      }
    }

    console.error('[AI Embedding Error]: All embedding candidate models failed.');
    return [];
  }

  // Save or update vector embedding for a task in pgvector
  async upsertTaskEmbedding(taskId: string, title: string, description?: string) {
    const contentToEmbed = `Task: ${title}. Description: ${description || ''}`;
    const embedding = await this.generateEmbedding(contentToEmbed);

    if (!embedding || embedding.length === 0) {
      console.warn(`[AI] Could not generate embedding for task ${taskId}`);
      return;
    }

    const vectorString = `[${embedding.join(',')}]`;

    try {
      await this.prisma.$executeRawUnsafe(
        `
        INSERT INTO "TaskEmbedding" ("id", "taskId", "vector", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2::vector, NOW(), NOW())
        ON CONFLICT ("taskId")
        DO UPDATE SET "vector" = $2::vector, "updatedAt" = NOW();
        `,
        taskId,
        vectorString,
      );
      console.log(`[AI] Successfully upserted embedding for task ID: ${taskId}`);
    } catch (dbError) {
      console.error('[AI DB Upsert Error]:', dbError);
    }
  }

  // Backfill vector embeddings for tasks lacking embeddings
  async backfillWorkspaceEmbeddings(workspaceId: string) {
    const tasksWithoutEmbeddings = await this.prisma.task.findMany({
      where: {
        workspaceId,
        embedding: null,
      },
    });

    if (tasksWithoutEmbeddings.length > 0) {
      console.log(`[AI] Backfilling ${tasksWithoutEmbeddings.length} tasks with embeddings...`);
      for (const task of tasksWithoutEmbeddings) {
        await this.upsertTaskEmbedding(task.id, task.title, task.description || '');
      }
    }
  }

  // Perform semantic vector search on tasks within a workspace
  async semanticSearch(query: string, workspaceId: string, limit = 5) {
    console.log(`[AI Search] Performing search for query: "${query}" in workspace: ${workspaceId}`);
    
    // 1. Backfill any missing embeddings
    await this.backfillWorkspaceEmbeddings(workspaceId);

    // 2. Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.warn('[AI Search] Query embedding generation failed.');
      return [];
    }

    const vectorString = `[${queryEmbedding.join(',')}]`;

    try {
      // 3. Perform cosine similarity query
      const results: any[] = await this.prisma.$queryRawUnsafe(
        `
        SELECT 
          t.id, 
          t.title, 
          t.description, 
          t.status, 
          t.priority,
          1 - (te.vector <=> $1::vector) as similarity
        FROM "Task" t
        JOIN "TaskEmbedding" te ON t.id = te."taskId"
        WHERE t."workspaceId" = $2
        ORDER BY te.vector <=> $1::vector ASC
        LIMIT $3;
        `,
        vectorString,
        workspaceId,
        limit,
      );

      console.log(`[AI Search] Found ${results.length} matching tasks.`);
      return results;
    } catch (queryError) {
      console.error('[AI Search Query Error]:', queryError);
      return [];
    }
  }

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
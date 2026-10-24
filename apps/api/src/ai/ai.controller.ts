import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-subtasks')
  async generateSubtasks(@Body() body: { title: string; description?: string }) {
    const subtasks = await this.aiService.generateSubtasks(body.title, body.description);
    return { subtasks };
  }

  @Post('suggest-priority')
  async suggestPriority(@Body() body: { title: string; description?: string }) {
    const priority = await this.aiService.suggestPriority(body.title, body.description);
    return { priority };
  }

  @Post('search')
  async semanticSearch(@Body() body: { query: string; workspaceId: string }) {
    const results = await this.aiService.semanticSearch(body.query, body.workspaceId);
    return { results };
  }
}
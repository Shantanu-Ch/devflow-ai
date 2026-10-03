import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TaskStatus, Priority } from '@prisma/client';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  create(
    @Request() req: any,
    @Body()
    body: {
      workspaceId: string;
      title: string;
      description?: string;
      priority?: Priority;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    return this.tasksService.create(req.user.sub, body);
  }

  @Get()
  findAll(@Query('workspaceId') workspaceId: string, @Request() req: any) {
    return this.tasksService.findAllInWorkspace(workspaceId, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body()
    body: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: Priority;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    return this.tasksService.update(id, req.user.sub, body);
  }

  @Post(':id/subtasks')
  addSubtask(@Param('id') id: string, @Request() req: any, @Body() body: { title: string }) {
    return this.tasksService.addSubtask(id, req.user.sub, body.title);
  }

  @Patch('subtasks/:subtaskId/toggle')
  toggleSubtask(@Param('subtaskId') subtaskId: string, @Request() req: any) {
    return this.tasksService.toggleSubtask(subtaskId, req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.remove(id, req.user.sub);
  }
}
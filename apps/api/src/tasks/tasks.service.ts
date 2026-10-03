import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, Priority } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async checkWorkspaceAccess(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Access to this workspace is denied');
    }
    return member;
  }

  async create(
    userId: string,
    dto: {
      workspaceId: string;
      title: string;
      description?: string;
      priority?: Priority;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    await this.checkWorkspaceAccess(dto.workspaceId, userId);

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority || Priority.MEDIUM,
        workspaceId: dto.workspaceId,
        creatorId: userId,
        assigneeId: dto.assigneeId || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        subtasks: true,
      },
    });
  }

  async findAllInWorkspace(workspaceId: string, userId: string) {
    await this.checkWorkspaceAccess(workspaceId, userId);

    return this.prisma.task.findMany({
      where: { workspaceId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        subtasks: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    taskId: string,
    userId: string,
    dto: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: Priority;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.checkWorkspaceAccess(task.workspaceId, userId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        subtasks: true,
      },
    });
  }

  async addSubtask(taskId: string, userId: string, title: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.checkWorkspaceAccess(task.workspaceId, userId);

    return this.prisma.subtask.create({
      data: { title, taskId },
    });
  }

  async toggleSubtask(subtaskId: string, userId: string) {
    const subtask = await this.prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');

    await this.checkWorkspaceAccess(subtask.task.workspaceId, userId);

    return this.prisma.subtask.update({
      where: { id: subtaskId },
      data: { completed: !subtask.completed },
    });
  }

  async remove(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.checkWorkspaceAccess(task.workspaceId, userId);

    return this.prisma.task.delete({ where: { id: taskId } });
  }
}
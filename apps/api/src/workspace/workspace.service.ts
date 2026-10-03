import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: { name: string; description?: string }) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
      include: { members: true },
    });
    return workspace;
  }

  async findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async findOne(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        tasks: true,
      },
    });
  }

  async addMember(workspaceId: string, requesterId: string, email: string, role: Role) {
    const requesterMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: requesterId } },
    });

    if (!requesterMember || (requesterMember.role !== Role.OWNER && requesterMember.role !== Role.ADMIN)) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    const userToInvite = await this.prisma.user.findUnique({ where: { email } });
    if (!userToInvite) {
      throw new NotFoundException('User with provided email not found');
    }

    return this.prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: userToInvite.id } },
      update: { role },
      create: { workspaceId, userId: userToInvite.id, role },
    });
  }
}
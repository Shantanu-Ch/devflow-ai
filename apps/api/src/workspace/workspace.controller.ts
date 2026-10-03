import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '@prisma/client';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post()
  create(@Request() req: any, @Body() body: { name: string; description?: string }) {
    return this.workspaceService.create(req.user.sub, body);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.workspaceService.findAllForUser(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.workspaceService.findOne(id, req.user.sub);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { email: string; role: Role },
  ) {
    return this.workspaceService.addMember(id, req.user.sub, body.email, body.role);
  }
}
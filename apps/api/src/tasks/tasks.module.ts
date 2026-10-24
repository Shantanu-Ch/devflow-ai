import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    }),
    AiModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, PrismaService],
})
export class TasksModule {}
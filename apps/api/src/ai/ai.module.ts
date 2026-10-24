import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    }),
  ],
  controllers: [AiController],
  providers: [AiService, PrismaService],
  exports: [AiService],
})
export class AiModule {}
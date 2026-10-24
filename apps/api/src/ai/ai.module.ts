import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [JwtModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
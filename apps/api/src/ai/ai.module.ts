import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiController } from './ai.controller';
import { AiProxyService } from './ai-proxy.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 35000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AiController],
  providers: [AiProxyService],
})
export class AiModule {}

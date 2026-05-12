import { Module } from '@nestjs/common';
import { ErpIntegrationController } from './erp-integration.controller';
import { ErpIntegrationService } from './erp-integration.service';

@Module({
  controllers: [ErpIntegrationController],
  providers: [ErpIntegrationService],
  exports: [ErpIntegrationService],
})
export class ErpIntegrationModule {}

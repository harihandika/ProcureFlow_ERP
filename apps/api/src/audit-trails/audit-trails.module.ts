import { Global, Module } from '@nestjs/common';
import { AuditTrailsController } from './audit-trails.controller';
import { AuditTrailsService } from './audit-trails.service';

@Global()
@Module({
  controllers: [AuditTrailsController],
  providers: [AuditTrailsService],
  exports: [AuditTrailsService],
})
export class AuditTrailsModule {}

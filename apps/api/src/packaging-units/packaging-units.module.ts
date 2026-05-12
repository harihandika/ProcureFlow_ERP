import { Module } from '@nestjs/common';
import { PackagingUnitsController } from './packaging-units.controller';
import { PackagingUnitsService } from './packaging-units.service';

@Module({
  controllers: [PackagingUnitsController],
  providers: [PackagingUnitsService],
  exports: [PackagingUnitsService],
})
export class PackagingUnitsModule {}

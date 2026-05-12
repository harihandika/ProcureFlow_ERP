import { PartialType } from '@nestjs/swagger';
import { CreatePackagingUnitDto } from './create-packaging-unit.dto';

export class UpdatePackagingUnitDto extends PartialType(CreatePackagingUnitDto) {}

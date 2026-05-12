import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ItemQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'IT Equipment' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by default supplier id.' })
  @IsOptional()
  @IsUUID()
  defaultSupplierId?: string;

  @ApiPropertyOptional({ description: 'Filter by default packaging unit id.' })
  @IsOptional()
  @IsUUID()
  defaultPackagingUnitId?: string;
}

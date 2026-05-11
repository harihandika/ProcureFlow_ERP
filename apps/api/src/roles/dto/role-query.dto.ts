import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class RoleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter system roles.' })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return value === true || value === 'true';
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

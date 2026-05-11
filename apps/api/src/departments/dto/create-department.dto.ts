import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'IT' })
  @IsString()
  @MaxLength(40)
  code: string;

  @ApiProperty({ example: 'Information Technology' })
  @IsString()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ example: 'Technology operations and internal systems.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'User id of the department manager.' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Parent department id for hierarchy.' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

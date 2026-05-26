import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectApprovalDto {
  @ApiProperty({ example: 'Budget allocation is not sufficient for this request.' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

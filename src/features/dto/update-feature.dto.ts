/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeatureDto {
  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Global default state' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

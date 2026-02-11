/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluateContextDto {
  @ApiPropertyOptional({ example: 'user-123' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: ['beta-testers', 'employees'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  groups?: string[];

  @ApiPropertyOptional({ example: 'eu' })
  @IsString()
  @IsOptional()
  region?: string;
}

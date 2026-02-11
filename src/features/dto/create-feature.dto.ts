/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({
    example: 'dark-mode',
    description: 'Unique key for the feature flag (lowercase, hyphens allowed)',
  })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message:
      'key must be lowercase alphanumeric with hyphens, e.g. "dark-mode"',
  })
  key: string;

  @ApiPropertyOptional({ example: 'Enable dark mode for the app' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: false, description: 'Global default state' })
  @IsBoolean()
  isEnabled: boolean;
}

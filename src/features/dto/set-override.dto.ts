/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetOverrideDto {
  @ApiProperty({
    example: true,
    description: 'Whether the feature is enabled for this override',
  })
  @IsBoolean()
  isEnabled: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard API response wrapper for Swagger documentation.
 */
export class ApiResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional({ description: 'Response payload' })
  data?: T;

  @ApiProperty({ example: '2025-02-11T12:00:00.000Z' })
  timestamp: string;
}

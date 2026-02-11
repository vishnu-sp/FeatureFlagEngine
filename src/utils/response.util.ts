/**
 * Standard API response format for consistent response bodies across all endpoints.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  timestamp: string;
}

/**
 * Build a success response with standard format.
 */
export function buildSuccessResponse<T>(
  data: T,
  statusCode = 200,
  message?: string,
): ApiResponse<T> {
  return {
    success: true,
    statusCode,
    ...(message && { message }),
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build an error response body (used by exception filters).
 */
export function buildErrorResponse(
  statusCode: number,
  message: string,
  error?: string,
): Omit<ApiResponse<null>, 'data'> & { error?: string } {
  return {
    success: false,
    statusCode,
    message,
    ...(error && { error }),
    timestamp: new Date().toISOString(),
  };
}

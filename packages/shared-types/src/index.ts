export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

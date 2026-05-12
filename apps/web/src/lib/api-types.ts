export type ApiMessage = string | string[];

export type ApiErrorResponse = {
  statusCode?: number;
  message?: ApiMessage;
  error?: string;
  path?: string;
  timestamp?: string;
};

export type ApiResponse<TData = unknown> = {
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
};

export type PaginatedApiResponse<TData = unknown> = ApiResponse<TData[]> & {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

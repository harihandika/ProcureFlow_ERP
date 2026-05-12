import { isAxiosError } from 'axios';
import type { ApiErrorResponse, ApiMessage } from '@/lib/api-types';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_ERROR_MESSAGE = 'Unable to reach the API server. Make sure the backend is running.';

export function getApiErrorMessage(error: unknown, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  if (!isAxiosError<ApiErrorResponse>(error)) {
    return fallbackMessage;
  }

  if (error.code === 'ERR_NETWORK') {
    return NETWORK_ERROR_MESSAGE;
  }

  const message = error.response?.data?.message;

  if (message) {
    return normalizeApiMessage(message);
  }

  return fallbackMessage;
}

export function isUnauthorizedApiError(error: unknown) {
  return isAxiosError<ApiErrorResponse>(error) && error.response?.status === 401;
}

function normalizeApiMessage(message: ApiMessage) {
  return Array.isArray(message) ? message.join(' ') : message;
}

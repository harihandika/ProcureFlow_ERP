import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

type ToastOptions = {
  description?: string;
};

export function showSuccessToast(message: string, options?: ToastOptions) {
  toast.success(message, {
    description: options?.description,
  });
}

export function showErrorToast(error: unknown, fallbackMessage = 'Action failed. Please try again.') {
  const message = typeof error === 'string' ? error : getApiErrorMessage(error, fallbackMessage);

  toast.error(message);
}

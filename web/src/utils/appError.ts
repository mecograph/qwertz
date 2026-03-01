export interface AppError {
  code: string;
  message: string;
  retryable: boolean;
}

export function toAppError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof Error) {
    return {
      code: 'runtime_error',
      message: error.message || fallbackMessage,
      retryable: true,
    };
  }

  if (typeof error === 'string') {
    return {
      code: 'runtime_error',
      message: error,
      retryable: true,
    };
  }

  return {
    code: 'unknown_error',
    message: fallbackMessage,
    retryable: false,
  };
}

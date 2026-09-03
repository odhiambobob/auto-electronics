export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!err) return fallback
  if (typeof err === 'string' && err.trim()) return err

  const error = err as {
    statusCode?: number
    statusMessage?: string
    message?: string
    data?: { statusMessage?: string; message?: string; statusCode?: number }
  }

  const status = error.statusCode || error.data?.statusCode
  const explicit =
    error.data?.statusMessage ||
    error.data?.message ||
    error.statusMessage

  if (explicit && explicit !== 'Internal Server Error' && explicit !== 'FetchError') {
    return explicit
  }

  if (status === 401) return 'Your session expired. Please log in again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'The requested item was not found.'
  if (status === 409) return 'This record already exists.'
  if (status === 429) return 'Too many attempts. Please wait and try again.'
  if (status === 503) return 'The service is temporarily unavailable. Please try again.'

  if (error.message && error.message !== 'FetchError' && !error.message.startsWith('[')) {
    return error.message
  }

  return fallback
}

export function useApiError() {
  return { getErrorMessage }
}

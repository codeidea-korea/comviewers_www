import { ApiClientError } from '@/api/httpClient'

export function isAccountReadDenied(error: Error | null) {
  return error instanceof ApiClientError && error.status === 403
}

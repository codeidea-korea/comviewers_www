import { ApiClientError } from '@/api/httpClient'

// A timeout, transport loss, server error, or unreadable success response may follow a committed post.
export function isDefinitivePostRejection(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false
  if (error.kind === 'api') return true
  return error.kind === 'http' && error.status !== undefined
    && error.status >= 400 && error.status < 500 && error.status !== 408
}

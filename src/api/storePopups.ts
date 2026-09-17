import { z } from 'zod'
import type { ApiClient } from './httpClient'

const popupSchema = z.object({
  id: z.number().int().positive().safe(),
  title: z.string(),
  content: z.string().nullable(),
  imageUrl: z.string().nullable(),
  linkUrl: z.string().nullable(),
  displayPosition: z.enum(['left', 'center', 'right']),
  targets: z.array(z.object({ targetType: z.string(), targetId: z.number().int().nonnegative().safe() })),
})

export function createStorePopupsApi(client: ApiClient) {
  return {
    active(signal?: AbortSignal) {
      return client.request('/api/v1/popups/active', z.array(popupSchema), { signal })
    },
  }
}

import { createContext, useContext, useState, type ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'

const PublicCatalogQueryContext = createContext<QueryClient | null>(null)

/** Public responses do not belong to a customer or organization session. */
export function PublicCatalogQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
  } }))
  return <PublicCatalogQueryContext.Provider value={client}>{children}</PublicCatalogQueryContext.Provider>
}

export function usePublicQueryClient(): QueryClient {
  const client = useContext(PublicCatalogQueryContext)
  if (!client) throw new Error('PublicCatalogQueryProvider is required')
  return client
}

export const usePublicCatalogQueryClient = usePublicQueryClient

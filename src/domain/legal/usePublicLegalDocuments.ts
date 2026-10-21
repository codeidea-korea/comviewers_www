import { useQuery } from '@tanstack/react-query'
import { usePublicQueryClient } from '@/app/PublicCatalogQueryProvider'
import { useServices } from '@/app/ServiceProvider'
import { legalDocumentSchema, type LegalKind } from './legalRepository'

export function usePublicLegalDocuments(kind: LegalKind, includeHistory = false) {
  const { legal } = useServices()
  const publicClient = usePublicQueryClient()
  return useQuery({
    queryKey: ['legal', kind, { includeHistory }],
    queryFn: async ({ signal }) => {
      const documents = legalDocumentSchema.array().parse(await legal.list(kind, signal, includeHistory))
      if (documents.some((item) => item.kind !== kind)) throw new Error('문서 종류가 일치하지 않습니다.')
      // The history API puts the current publication first, even for a backdated revision.
      if (includeHistory) return documents
      return [...documents].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
    },
  }, publicClient)
}

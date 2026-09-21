import { useQuery } from '@tanstack/react-query'
import { usePublicQueryClient } from '@/app/PublicCatalogQueryProvider'
import { useServices } from '@/app/ServiceProvider'
import { legalDocumentSchema, type LegalKind } from './legalRepository'

export function usePublicLegalDocuments(kind: LegalKind) {
  const { legal } = useServices()
  const publicClient = usePublicQueryClient()
  return useQuery({
    queryKey: ['legal', kind],
    queryFn: async () => {
      const documents = legalDocumentSchema.array().parse(await legal.list(kind))
      if (documents.some((item) => item.kind !== kind)) throw new Error('문서 종류가 일치하지 않습니다.')
      return [...documents].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
    },
  }, publicClient)
}

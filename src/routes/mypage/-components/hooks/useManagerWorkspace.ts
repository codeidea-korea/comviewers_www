import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/routes/community/-components/hooks/useDebouncedValue'
import { useServices } from '@/app/ServiceProvider'
import type { ManagerCatalogQuery } from '@/domain/myAccount/managerServices'
export const defaultManagerQuery: ManagerCatalogQuery = { page: 0, size: 10 }

export const managerWorkspaceKey = ['my-account', 'managers'] as const
export function useManagerWorkspace(input: ManagerCatalogQuery = defaultManagerQuery) {
  const { managers } = useServices().myAccount
  const keyword = useDebouncedValue(input.keyword?.trim() ?? '')
  const query = { ...input, keyword: keyword || undefined }
  return useQuery({ queryKey: [...managerWorkspaceKey, query], queryFn: ({ signal }) => {
    if (!managers) throw new Error('담당자 관리 권한을 확인해 주세요.')
    return managers.readPage ? managers.readPage(query, signal) : managers.read(signal)
  } })
}

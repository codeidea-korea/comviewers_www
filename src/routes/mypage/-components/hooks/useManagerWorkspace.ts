import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'

export const managerWorkspaceKey = ['my-account', 'managers'] as const
export function useManagerWorkspace() {
  const { managers } = useServices().myAccount
  return useQuery({ queryKey: managerWorkspaceKey, queryFn: ({ signal }) => {
    if (!managers) throw new Error('담당자 관리 권한을 확인해 주세요.')
    return managers.read(signal)
  } })
}

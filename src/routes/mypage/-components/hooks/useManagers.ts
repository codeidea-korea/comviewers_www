import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import type { ManagerInput } from '@/domain/myAccount/managerServices'
import { managerWorkspaceKey, useManagerWorkspace } from './useManagerWorkspace'
export function useManagers() {
  const account = useManagerWorkspace()
  const { managers } = useServices().myAccount
  const client = useQueryClient()
  const service = () => { if (!managers) throw new Error('담당자 관리 권한을 확인해 주세요.'); return managers }
  const onSuccess = () => client.invalidateQueries({ queryKey: managerWorkspaceKey })
  const save = useMutation({ mutationFn: (input: { id?: string; draft: ManagerInput }) => service().saveManager(input), onSuccess })
  const assign = useMutation({ mutationFn: (input: { managerId: string | null; rcpcIds: readonly string[] }) => service().assignManager(input), onSuccess })
  const remove = useMutation({ mutationFn: (id: string) => service().deleteManager(id), onSuccess })
  return { ...account, save, assign, remove, checkLogin: async (loginId: string) => service().isManagerLoginAvailable(loginId) }
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import type { ManagerInput } from '@/domain/myAccount/managerServices'
import { myAccountKey, useMyAccount } from './useMyAccount'
export function useManagers() {
  const account = useMyAccount()
  const { myAccount } = useServices()
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries({ queryKey: myAccountKey })
  const save = useMutation({ mutationFn: (input: { id?: string; draft: ManagerInput }) => myAccount.saveManager(input), onSuccess })
  const assign = useMutation({ mutationFn: (input: { managerId: string | null; rcpcIds: readonly string[] }) => myAccount.assignManager(input), onSuccess })
  const remove = useMutation({ mutationFn: (id: string) => myAccount.deleteManager(id), onSuccess })
  return { ...account, save, assign, remove, checkLogin: (loginId: string) => myAccount.isManagerLoginAvailable(loginId) }
}

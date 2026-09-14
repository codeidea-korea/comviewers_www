import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { myAccountSchema } from '@/domain/myAccount/services'
import { postSchema } from '@/domain/storefront/services'

export const myAccountKey = ['my-account', 'snapshot'] as const
export function useMyAccountPosts() {
  const { storefront } = useServices()
  return useQuery({ queryKey: ['storefront', 'posts'], queryFn: async () => postSchema.array().parse(await storefront.listPosts()), select: (posts) => posts.filter((post) => post.isMine) })
}
export function useMyAccount() {
  const { myAccount } = useServices()
  return useQuery({ queryKey: myAccountKey, queryFn: async () => myAccountSchema.parse(await myAccount.read()) })
}
export function useAccountStorage() {
  const query = useMyAccount()
  const { myAccount } = useServices()
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries({ queryKey: myAccountKey })
  const remove = useMutation({ mutationFn: (ids: readonly string[]) => myAccount.removeStorage(ids), onSuccess })
  const quantity = useMutation({ mutationFn: ({ id, value }: { id: string; value: number }) => myAccount.changeStorageQuantity(id, value), onSuccess })
  return { ...query, remove, quantity }
}
export function useAccountFavorites() {
  const query = useMyAccount()
  const { myAccount } = useServices()
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries({ queryKey: myAccountKey })
  const addGroup = useMutation({ mutationFn: ({ label, parentId }: { label: string; parentId: string | null }) => myAccount.addFavoriteGroup(label, parentId), onSuccess })
  const move = useMutation({ mutationFn: ({ ids, groupId }: { ids: readonly string[]; groupId: string }) => myAccount.moveFavorites(ids, groupId), onSuccess })
  return { ...query, addGroup, move }
}

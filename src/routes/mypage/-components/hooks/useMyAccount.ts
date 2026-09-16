import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { myAccountSchema } from '@/domain/myAccount/services'

export const myAccountKey = ['my-account', 'snapshot'] as const
export function useMyAccount() {
  const { myAccount } = useServices()
  return useQuery({ queryKey: myAccountKey, queryFn: async () => myAccountSchema.parse(await myAccount.read()) })
}

import { useServices } from '@/app/ServiceProvider'
import { HttpOrdersPage } from './-components/http/HttpOrderPages'

export function OrdersPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) throw new Error('주문내역 API가 설정되지 않았습니다.')
  return <HttpOrdersPage api={myAccount.readApi} />
}

import { useServices } from '@/app/ServiceProvider'
import { HttpOrderDetailPage } from './-components/http/HttpOrderPages'

export function OrderDetailPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) throw new Error('주문 상세 API가 설정되지 않았습니다.')
  return <HttpOrderDetailPage api={myAccount.readApi} />
}

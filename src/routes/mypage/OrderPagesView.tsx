import { useServices } from '@/app/ServiceProvider'
import { OrdersPageContent } from './-components/http/HttpOrderPages'
import { MyPageLayout } from './MypageComponentsView'

export function OrdersPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout title="주문내역"><p role="alert">주문내역을 불러오지 못했습니다.</p></MyPageLayout>
  return <OrdersPageContent api={myAccount.readApi} />
}

import { useServices } from '@/app/ServiceProvider'
import { OrderDetailPageContent } from './-components/http/HttpOrderPages'
import { MyPageLayout } from './MypageComponentsView'

export function OrderDetailPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout title="주문 상세"><p role="alert">주문 상세를 불러오지 못했습니다.</p></MyPageLayout>
  return <OrderDetailPageContent api={myAccount.readApi} />
}

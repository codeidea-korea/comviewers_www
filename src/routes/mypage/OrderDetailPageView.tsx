import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useServices } from '@/app/ServiceProvider'
import { OrderDetailPageContent } from './-components/orders/OrderPagesContent'
import { MyPageLayout } from './MypageComponentsView'

export function OrderDetailPage() {
  useUiTranslation()
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout backTo="/mypage/orders" title={uiText("주문 상세")}><p role="alert">{uiText("주문 상세를 불러오지 못했습니다.")}</p></MyPageLayout>
  return <OrderDetailPageContent api={myAccount.readApi} />
}

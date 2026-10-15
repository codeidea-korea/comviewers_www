import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useServices } from '@/app/ServiceProvider'
import { OrdersPageContent } from './-components/orders/OrderPagesContent'
import { MyPageLayout } from './MypageComponentsView'

export function OrdersPage() {
  useUiTranslation()
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout title={uiText("주문내역")}><p role="alert">{uiText("주문내역을 불러오지 못했습니다.")}</p></MyPageLayout>
  return <OrdersPageContent api={myAccount.readApi} />
}

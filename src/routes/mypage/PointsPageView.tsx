import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import { useServices } from '@/app/ServiceProvider'
import { PointsPageContent } from './-components/benefits/BenefitPagesContent'
import { MyPageLayout } from './MypageComponentsView'

export function PointsPage() {
  useUiTranslation()
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout title={uiText("포인트")}><p role="alert">{uiText("포인트를 불러오지 못했습니다.")}</p></MyPageLayout>
  return <PointsPageContent api={myAccount.readApi} />
}

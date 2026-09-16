import { useServices } from '@/app/ServiceProvider'
import { PointsPageContent } from './-components/http/HttpBenefitPages'
import { MyPageLayout } from './MypageComponentsView'

export function PointsPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout title="포인트"><p role="alert">포인트를 불러오지 못했습니다.</p></MyPageLayout>
  return <PointsPageContent api={myAccount.readApi} />
}

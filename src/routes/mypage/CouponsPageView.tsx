import { useServices } from '@/app/ServiceProvider'
import { CouponsPageContent } from './-components/benefits/BenefitPagesContent'
import { MyPageLayout } from './MypageComponentsView'

export function CouponsPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout title="쿠폰"><p role="alert">쿠폰을 불러오지 못했습니다.</p></MyPageLayout>
  return <CouponsPageContent api={myAccount.readApi} />
}

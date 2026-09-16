import { useServices } from '@/app/ServiceProvider'
import { MypageDashboardContent } from './-components/dashboard/DashboardPageContent'
import { MyPageLayout } from './MypageComponentsView'

export function MypageHomePage({ detailMode = false }: { detailMode?: boolean }) {
  const { myAccount } = useServices()
  if (!myAccount.readApi || !myAccount.rcpcApi || !myAccount.inquiryApi) {
    return <MyPageLayout><p role="alert">마이페이지 정보를 불러오지 못했습니다.</p></MyPageLayout>
  }
  return <MypageDashboardContent
    detailMode={detailMode}
    inquiries={myAccount.inquiryApi}
    rcpcs={myAccount.rcpcApi}
    read={myAccount.readApi}
  />
}

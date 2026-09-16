import { useServices } from '@/app/ServiceProvider'
import { RcpcListContent } from './-components/rcpc/RcpcPagesContent'
import { MyPageLayout } from './MypageComponentsView'
import { MypageHomePage } from './MypageHomePageView'

export function RcpcListPage() {
  const { myAccount } = useServices()
  if (!myAccount.rcpcApi) {
    return <MyPageLayout title="이용 RCPC"><p role="alert">이용 RCPC를 불러오지 못했습니다.</p></MyPageLayout>
  }
  return <RcpcListContent api={myAccount.rcpcApi} mutations={myAccount.rcpcMutations} />
}

export function RcpcDetailPage() {
  return <MypageHomePage detailMode />
}

import { Link, useParams } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { RcpcReplacementCheckout } from './-components/RcpcReplacementCheckout'
import { MyPageLayout } from './MypageComponentsView'

export function ReplacementCheckoutPage() {
  const { myAccount } = useServices()
  const { changeId } = useParams()
  return <MyPageLayout title="장비 교체 주문서">{myAccount.rcpcApi
    ? <RcpcReplacementCheckout key={`${myAccount.rcpcApi.organizationId}:${changeId}`} api={myAccount.rcpcApi} />
    : <p>교체할 RCPC의 상세 화면에서 결제 가능한 견적을 먼저 확인해 주세요. <Link to="/mypage/rcpc">이용 RCPC로 이동</Link></p>}</MyPageLayout>
}

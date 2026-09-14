import { useServices } from '@/app/ServiceProvider'
import { HttpCouponsPage } from './-components/http/HttpBenefitPages'

export function CouponsPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) throw new Error('쿠폰 조회 API가 연결되지 않았습니다.')
  return <HttpCouponsPage api={myAccount.readApi} />
}

import { useServices } from '@/app/ServiceProvider'
import { HttpPointsPage } from './-components/http/HttpBenefitPages'

export function PointsPage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) throw new Error('포인트 조회 API가 연결되지 않았습니다.')
  return <HttpPointsPage api={myAccount.readApi} />
}

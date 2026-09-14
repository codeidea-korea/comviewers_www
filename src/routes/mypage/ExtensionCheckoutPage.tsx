import { Link, useLocation } from 'react-router'
import { z } from 'zod'
import { useServices } from '@/app/ServiceProvider'
import { extensionSelectionSchema } from '@/api/extensionCheckout'
import { MyPageLayout } from './MypageComponentsView'
import { RcpcExtensionCheckout } from './-components/RcpcExtensionCheckout'

const stateSchema = z.object({ selection: extensionSelectionSchema, offerIds: z.number().int().positive().safe().array().max(100).optional() })
export function ExtensionCheckoutPage() {
  const location = useLocation()
  const api = useServices().myAccount.rcpcApi
  const state = stateSchema.safeParse(location.state)
  return <MyPageLayout title="기간 연장 주문서">{api && state.success ? <RcpcExtensionCheckout key={location.key} pageMode api={api} rentalIds={state.data.selection.rentalIds} initialSelection={state.data.selection} offerIds={state.data.offerIds} />
    : <p>연장할 RCPC와 기간을 먼저 선택해 주세요. <Link to="/mypage/rcpc">이용 RCPC로 이동</Link></p>}</MyPageLayout>
}

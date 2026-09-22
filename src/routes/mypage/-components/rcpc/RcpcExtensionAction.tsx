import type { MyRcpcItem } from '@/api/myRcpc'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Button } from '@/components/ui/ButtonControl'
import { useSession } from '@/app/session/SessionProvider'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import { extensionBlocked, extensionTarget } from '../rcpcPresentation'
import { CManagerExtensionRequestAction } from './CManagerExtensionRequestAction'

export function RcpcExtensionAction({ api, canExtend, item }: { api: MyRcpcReadServices; canExtend: boolean; item: MyRcpcItem }) {
  const session = useSession()
  const cManager = session.status === 'authenticated' && session.customerSession?.memberRole === 'c_manager'
  if (cManager) {
    if (extensionBlocked(item)) return <Button disabled size="small">기간연장 요청</Button>
    return <CManagerExtensionRequestAction api={api} item={item}/>
  }
  if (!canExtend) return null
  if (extensionBlocked(item)) return <Button disabled size="small">기간연장</Button>
  return <RcpcExtensionCheckout api={api} displayTargets={[extensionTarget(item)]} rentalIds={[item.rentalId]} triggerLabel="기간연장"/>
}

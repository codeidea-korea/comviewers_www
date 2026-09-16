import type { MyRcpcItem } from '@/api/myRcpc'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Button } from '@/components/ui/ButtonControl'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import { extensionBlocked, extensionTarget } from '../rcpcPresentation'

export function RcpcExtensionAction({ api, canExtend, item }: { api: MyRcpcReadServices; canExtend: boolean; item: MyRcpcItem }) {
  if (!canExtend) return null
  if (extensionBlocked(item)) return <Button disabled size="small">기간연장</Button>
  return <RcpcExtensionCheckout api={api} displayTargets={[extensionTarget(item)]} rentalIds={[item.rentalId]} triggerLabel="기간연장"/>
}

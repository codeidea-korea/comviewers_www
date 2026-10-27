import { useUiTranslation } from '@/i18n/uiTranslation'
import type { MyRcpcItem } from '@/api/myRcpc'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Button } from '@/components/ui/ButtonControl'
import { useSession } from '@/app/session/SessionProvider'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import { extensionBlocked, extensionTarget, rentalActionsEnded, rentalResumptionWaiting } from '../rcpcPresentation'
import { CManagerExtensionRequestAction } from './CManagerExtensionRequestAction'

export function RcpcExtensionAction({ api, canExtend, item, showUnavailable = false }: { api: MyRcpcReadServices; canExtend: boolean; item: MyRcpcItem; showUnavailable?: boolean }) {
  const { uiText } = useUiTranslation()
  const session = useSession()
  const cManager = session.status === 'authenticated' && session.customerSession?.memberRole === 'c_manager'
  if (rentalActionsEnded(item) && !rentalResumptionWaiting(item)) return null
  if (cManager) {
    if (extensionBlocked(item)) return <Button disabled size="small">{uiText("기간연장 조회")}</Button>
    return <CManagerExtensionRequestAction api={api} item={item}/>
  }
  if (!canExtend) return showUnavailable ? <Button disabled size="small">{uiText("기간연장")}</Button> : null
  if (extensionBlocked(item)) return <Button disabled size="small">{uiText("기간연장")}</Button>
  return <RcpcExtensionCheckout api={api} displayTargets={[extensionTarget(item)]} rentalIds={[item.rentalId]} triggerLabel={uiText("기간연장")}/>
}

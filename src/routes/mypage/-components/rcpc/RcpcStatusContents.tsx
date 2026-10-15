import { useUiTranslation } from '@/i18n/uiTranslation'
import type { MyRcpcItem } from '@/api/myRcpc'
import { TranslatedText } from '@/i18n/translation'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import { endedRental, rentalOperationalStatus } from '../rcpcPresentation'

export function RcpcStatusContents({ item }: { item: MyRcpcItem }) {
  const { uiText } = useUiTranslation()
  const rentalStatus = rentalOperationalStatus(item)
  if (rentalStatus === 'termination_waiting') {
    return <><img alt="" data-status="disabled" src={serverDisabledIcon}/><span><TranslatedText id="rental.formatWaiting"/></span></>
  }
  if (endedRental(item.rentalStatus)) {
    return <><img alt="" data-status="disabled" src={serverDisabledIcon}/><span>{uiText("종료")}</span></>
  }
  if (rentalStatus === 'extension_waiting') {
    return <><img alt="" data-status="waiting" src={serverWaitingIcon}/><span>{uiText("연장대기")}</span></>
  }

  const status = item.connectionStatus.toUpperCase() === 'ONLINE' ? 'on' : 'off'
  const icon = status === 'on' ? serverOnIcon : serverOffIcon

  return <><img alt="" data-status={status} src={icon}/><span>{status === 'on' ? uiText("실행 중") : uiText("확인 필요")}</span></>
}

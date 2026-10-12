import type { MyRcpcItem } from '@/api/myRcpc'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import { connectionLabels, rentalOperationalStatus } from '../rcpcPresentation'

export function RcpcStatusContents({ item }: { item: MyRcpcItem }) {
  const rentalStatus = rentalOperationalStatus(item)
  if (rentalStatus === 'termination_waiting') {
    return <><img alt="" data-status="disabled" src={serverDisabledIcon}/><span>종료대기</span></>
  }
  if (rentalStatus === 'terminated' || rentalStatus === 'refunded' || item.serverStatus === 'ended') {
    return <><img alt="" data-status="disabled" src={serverDisabledIcon}/><span>종료</span></>
  }
  if (rentalStatus === 'extension_waiting' || item.serverStatus === 'extension_waiting') {
    return <><img alt="" data-status="waiting" src={serverWaitingIcon}/><span>연장대기</span></>
  }
  if (item.serverStatus === 'format_waiting') {
    return <><img alt="" data-status="waiting" src={serverWaitingIcon}/><span>포맷대기</span></>
  }

  const connection = item.connectionStatus.toUpperCase()
  const status = connection === 'ONLINE' ? 'on'
    : connection === 'STALE' || connection === 'NEVER_CONNECTED' || connection === 'OFFLINE' ? 'off' : 'disabled'
  const icon = status === 'on' ? serverOnIcon : status === 'off' ? serverOffIcon : serverDisabledIcon

  return <><img alt="" data-status={status} src={icon}/><span>{item.serverStatus === 'needs_attention' && connection === 'ONLINE' ? '확인 필요' : connectionLabels[connection] ?? '미확인'}</span></>
}

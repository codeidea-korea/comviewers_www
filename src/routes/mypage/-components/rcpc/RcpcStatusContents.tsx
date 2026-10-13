import type { MyRcpcItem } from '@/api/myRcpc'
import { FormatWaitingServerState } from '@/components/common/FormatWaitingServerState'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import { endedRental, rentalOperationalStatus } from '../rcpcPresentation'

export function RcpcStatusContents({ item }: { item: MyRcpcItem }) {
  const rentalStatus = rentalOperationalStatus(item)
  if (rentalStatus === 'termination_waiting') {
    return <FormatWaitingServerState/>
  }
  if (endedRental(item.rentalStatus)) {
    return <><img alt="" data-status="disabled" src={serverDisabledIcon}/><span>종료</span></>
  }
  if (rentalStatus === 'extension_waiting') {
    return <><img alt="" data-status="waiting" src={serverWaitingIcon}/><span>연장대기</span></>
  }

  const status = item.serverStatus === 'running' ? 'on' : 'off'
  const icon = status === 'on' ? serverOnIcon : serverOffIcon

  return <><img alt="" data-status={status} src={icon}/><span>{status === 'on' ? '실행 중' : '확인 필요'}</span></>
}

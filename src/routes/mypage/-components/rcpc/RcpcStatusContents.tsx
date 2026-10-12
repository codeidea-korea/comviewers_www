import type { MyRcpcItem } from '@/api/myRcpc'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import { connectionLabels } from '../rcpcPresentation'

export function RcpcStatusContents({ item }: { item: MyRcpcItem }) {
  const connection = item.connectionStatus.toUpperCase()
  const icon = connection === 'ONLINE' ? serverOnIcon
    : connection === 'STALE' ? serverWaitingIcon
      : connection === 'OFFLINE' ? serverOffIcon : serverDisabledIcon

  return <><img alt="" src={icon}/><span>{connectionLabels[connection] ?? '미확인'}</span></>
}

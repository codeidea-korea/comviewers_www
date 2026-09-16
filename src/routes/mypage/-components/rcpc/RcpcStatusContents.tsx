import type { MyRcpcItem } from '@/api/myRcpc'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import { extensionBlocked, serverStatusLabels } from '../rcpcPresentation'

export function RcpcStatusContents({ item }: { item: MyRcpcItem }) {
  const icon = extensionBlocked(item)
    ? serverDisabledIcon
    : item.serverStatus === 'needs_attention'
      ? serverOffIcon
      : item.serverStatus === 'extension_waiting'
        ? serverWaitingIcon
        : serverOnIcon

  return <><img alt="" src={icon}/><span>{serverStatusLabels[item.serverStatus] ?? item.serverStatus}</span></>
}

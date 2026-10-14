import type { Product } from '../../domain/products/types'
import { useTranslation } from '../../i18n/translation'
import onlineIcon from '../../assets/figma/icon-server-on.svg'
import offlineIcon from '../../assets/figma/icon-server-off.svg'
import unknownIcon from '../../assets/figma/icon-server-disabled.svg'

export function ProductServerState({ state }: { state: Product['serverState'] }) {
  const { t } = useTranslation()
  const label = t(state === null ? 'common.noInformation' : state === 'online' ? 'product.connected' : 'product.disconnected')
  const icon = state === null ? unknownIcon : state === 'online' ? onlineIcon : offlineIcon
  return <span className={`product-server-state is-${state ?? 'unknown'}`} title={label}><img alt={label} src={icon} /></span>
}

import type { Product } from '../../domain/products/types'
import { TranslatedText, useTranslation } from '../../i18n/translation'
import onlineIcon from '../../assets/figma/product-server-online.png'
import offlineIcon from '../../assets/figma/product-server-offline.png'

// Figma serverState 406:8734: on 406:8733 / off 406:8732, 24×24.
export function ProductServerState({ state }: { state: Product['serverState'] }) {
  const { t } = useTranslation()
  if (state === null) return <TranslatedText id="common.noInformation" />
  return <img alt={t(state === 'online' ? 'product.connected' : 'product.disconnected')} className="product-server-state" height={24} src={state === 'online' ? onlineIcon : offlineIcon} width={24} />
}

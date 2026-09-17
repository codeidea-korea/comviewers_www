import type { StorefrontPopup } from '@/domain/storefront/services'
import { PopupLayer } from '@/components/ui/PopupLayerControl'

function safeLink(value: string | null) {
  if (!value) return null
  const link = value.trim()
  if (/^\/(?!\/)[^\\\s]*$/.test(link)) return link
  try {
    const url = new URL(link)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

export function HomeStorePopup({ popup, onClose }: { popup: StorefrontPopup; onClose: () => void }) {
  const link = safeLink(popup.linkUrl)
  const image = popup.imageUrl ? <img alt={popup.title} src={popup.imageUrl} /> : null

  return <PopupLayer className={`store-popup-layer store-popup-layer--${popup.displayPosition}`} dialogClassName="store-popup-card" isOpen onClose={onClose} title={popup.title}>
    {image && (link ? <a href={link} rel="noopener noreferrer" target="_blank">{image}</a> : image)}
    {popup.content && <p className="store-popup-card__content">{popup.content}</p>}
    <div className="store-popup-card__actions">
      {link && !image && <a href={link} rel="noopener noreferrer" target="_blank">자세히 보기</a>}
      <button onClick={onClose} type="button">닫기</button>
    </div>
  </PopupLayer>
}

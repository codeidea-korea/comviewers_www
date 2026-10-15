import moreVertical from '@/assets/figma/comment-more-fill.svg'
import modalClose from '@/assets/figma/inquiry-modal-close.svg'
import './inquiry-chat-menu.css'

export type InquiryChatMenuAction = 'products' | 'add'

interface MenuProps {
  addDisabled: boolean
  onSelect: (action: InquiryChatMenuAction) => void
}

export function InquiryChatHeader({ title, onClose, ...menuProps }: Parameters<typeof InquiryChatMenuTrigger>[0] & { title: string; onClose: () => void }) {
  return <header>
    <InquiryChatMenuTrigger {...menuProps}/>
    <h2>{title}</h2>
    <button aria-label="닫기" className="inquiry-chat__close" onClick={onClose} type="button"><img alt="" className="inquiry-chat__icon inquiry-chat__icon--close" src={modalClose}/></button>
  </header>
}

export function InquiryChatMenuTrigger({ standalone, disabled = false, open, onToggle, addDisabled, onSelect }: MenuProps & {
  standalone: boolean
  disabled?: boolean
  open: boolean
  onToggle: () => void
}) {
  return standalone
    ? <select aria-label="문의 메뉴" className="inquiry-chat__native-menu" disabled={disabled} value="" onChange={event => {
      const action = event.currentTarget.value
      event.currentTarget.value = ''
      if (action === 'products' || action === 'add' && !addDisabled) onSelect(action)
    }}><option value="">더보기</option><option value="products">문의 상품</option><option value="add" disabled={addDisabled}>문의 상품 추가</option></select>
    : <button aria-expanded={open} aria-haspopup="menu" aria-label="문의 메뉴" className="inquiry-chat__products-trigger" disabled={disabled} onClick={onToggle} type="button"><img alt="" src={moreVertical}/></button>
}

export function InquiryChatMenu({ open, onClose, addDisabled, onSelect }: MenuProps & { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <div className="inquiry-chat__menu" role="menu" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
  }}>
    <button onClick={() => onSelect('products')} role="menuitem" type="button">문의 상품</button>
    <button disabled={addDisabled} onClick={() => onSelect('add')} role="menuitem" type="button">문의 상품 추가</button>
  </div>
}

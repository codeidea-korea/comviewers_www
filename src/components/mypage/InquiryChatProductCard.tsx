import { useUiTranslation } from '@/i18n/uiTranslation'
import type { HTMLAttributes } from 'react'
import productThumb from '@/assets/figma/windows-card-render.png'

export function InquiryChatProductCard({ productNo, alias, serverRoomName, onSelect, ...props }: Omit<HTMLAttributes<HTMLElement>, 'onSelect'> & {
  productNo?: string | null
  alias?: string | null
  serverRoomName?: string | null
  onSelect?: () => void
}) {
  const { uiText } = useUiTranslation()
  const location = serverRoomName === '서버실 정보 없음' ? uiText('서버실 정보 없음') : serverRoomName
  const name = alias?.trim() || uiText("별명없음")
  return <article {...props} className="inquiry-chat__product">
    <span>{uiText("문의 상품")}</span><img alt={uiText("RCPC 상품")} src={productThumb}/>
    <div><small>{productNo ?? uiText("상품 정보 없음")}</small>{onSelect ? <button type="button" onClick={onSelect}>{name}</button> : <b>{name}</b>}<em>{location ?? uiText("서버실 정보 없음")}</em></div>
  </article>
}

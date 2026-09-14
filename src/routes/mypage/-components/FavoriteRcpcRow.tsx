import type { AccountRcpc } from '@/domain/myAccount/services'
import { useState } from 'react'
import eyeOffIcon from '../../../assets/figma/eye-off.svg'
import anydeskIcon from '../../../assets/figma/icon-connect-anydesk.svg'
import teamviewerIcon from '../../../assets/figma/icon-connect-teamviewer.svg'
import webConnectIcon from '../../../assets/figma/icon-connect-web.svg'
import copyIcon from '../../../assets/figma/icon-content-copy.svg'
import serverDisabledIcon from '../../../assets/figma/icon-server-disabled.svg'
import serverOffIcon from '../../../assets/figma/icon-server-off.svg'
import serverOnIcon from '../../../assets/figma/icon-server-on.svg'
import serverWaitingIcon from '../../../assets/figma/icon-server-waiting.svg'
import starEmptyIcon from '../../../assets/figma/review-star-empty.svg'
import starFilledIcon from '../../../assets/figma/review-star-filled.svg'
import editIcon from '../../../assets/figma/scrap-edit.svg'
import eyeIcon from '../../../assets/figma/scrap-eye.svg'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import { RcpcConnectionInfo } from './AccountConnectionInfo'
import { type OpenRcpc,type TargetAction,getFavoriteRcpc } from './favoritesTypes'

export function FavoriteRcpcRow({ canManage = true, checked, index, item, onCheckedChange, onExtend, onInquiry, onOpenRcpcPopup }: { canManage?: boolean; checked: boolean; index: number; item: AccountRcpc; onCheckedChange: (index: number, checked: boolean) => void; onExtend: TargetAction; onInquiry: TargetAction; onOpenRcpcPopup: OpenRcpc }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const ended = item.state === '이용종료'
  const desktopAlias = item.alias || item.rcpcId
  const mobileAlias = desktopAlias
  const state = item.state
  const stateIcon = ended ? serverDisabledIcon : item.status === '확인 필요' ? serverOffIcon : item.status === '연장대기' ? serverWaitingIcon : item.state === '종료' ? serverOffIcon : serverOnIcon

  return (
    <article className={`mobile-scrap-card${ended ? ' is-ended' : ''}`} data-sort-row={index} role="row">
      <div className="mobile-scrap-card__selection" role="cell"><Checkbox aria-label={`${index + 1}번 RCPC 선택`} checked={checked} inputClassName="favorites-table__check" onChange={(event) => onCheckedChange(index, event.target.checked)} /></div>
      <div className="rcpc-list__product" role="cell">
        <strong>
          <img alt="" className="mobile-scrap-card__star mobile-scrap-card__star--desktop" src={item.favorite ? starFilledIcon : starEmptyIcon} />
          <img alt="" className="mobile-scrap-card__star mobile-scrap-card__star--mobile" src={starFilledIcon} />
          <span className="mobile-scrap-card__alias mobile-scrap-card__alias--desktop">{desktopAlias}</span>
          <span className="mobile-scrap-card__alias mobile-scrap-card__alias--mobile">{mobileAlias}</span>
          {canManage && (!item.alias
            ? <button className="favorites-table__alias-action" onClick={(event) => onOpenRcpcPopup('alias', item, event.currentTarget)} type="button">별명설정<i aria-hidden="true" /></button>
            : <button aria-label={`${item.rcpcId} RCPC 별명 설정`} className="rcpc-list__inline-action" onClick={(event) => onOpenRcpcPopup('alias', item, event.currentTarget)} type="button"><img alt="" src={editIcon} /></button>)}
        </strong>
        <button className="rcpc-list__spec-action" onClick={(event) => onOpenRcpcPopup('spec', item, event.currentTarget)} type="button">{item.rcpcId}<u>사양보기</u></button>
      </div>
      <div data-mobile-label="서버실" role="cell"><span className="mobile-scrap-card__server-value">{item.company}<span className="mobile-scrap-card__server-separator">/</span><br />{item.center}</span></div>
      <div className="rcpc-list__state" data-mobile-label="서버 상태" role="cell"><span className="rcpc-list__state-value"><img alt="" src={stateIcon} /><span>{state}</span></span></div>
      <div data-mobile-label="이용 기간" role="cell"><strong>{ended ? '이용종료' : `${item.daysLeft}일 남음`}</strong><small>{item.endsAt}<br />까지</small></div>
      <RcpcConnectionInfo className="rcpc-list__connect" copyIcon={copyIcon} eyeIcon={eyeIcon} eyeOffIcon={eyeOffIcon} mobileLabel="접속 정보" onCopy={() => undefined} onTogglePassword={() => setPasswordVisible((current) => !current)} password="-" passwordDataAttribute="data-favorites-password" passwordVisible={passwordVisible} remote={item.remote} remoteIcon={item.remote.startsWith('Team') ? teamviewerIcon : anydeskIcon} role="cell" webIcon={webConnectIcon} />
      <div data-mobile-label="트래픽 사용량" role="cell"><span className="mobile-scrap-card__traffic-value">{item.traffic}</span></div>
      <div className="rcpc-list__actions" role="cell">
        <span><button disabled title="재부팅" type="button">재부팅</button><button onClick={(event) => onInquiry([getFavoriteRcpc(item)], event.currentTarget)} type="button">문의</button></span>
        {canManage ? ended ? <span aria-disabled="true" className="is-disabled">기간연장</span> : <button className="is-dark" onClick={(event) => onExtend([getFavoriteRcpc(item)], event.currentTarget)} type="button">기간연장</button> : null}
      </div>
    </article>
  )
}

import eyeOffIcon from '@/assets/figma/eye-off.svg'
import anydeskIcon from '@/assets/figma/icon-connect-anydesk.svg'
import teamviewerIcon from '@/assets/figma/icon-connect-teamviewer.svg'
import webConnectIcon from '@/assets/figma/icon-connect-web.svg'
import copyIcon from '@/assets/figma/icon-content-copy.svg'
import serverDisabledIcon from '@/assets/figma/icon-server-disabled.svg'
import serverOffIcon from '@/assets/figma/icon-server-off.svg'
import serverOnIcon from '@/assets/figma/icon-server-on.svg'
import serverWaitingIcon from '@/assets/figma/icon-server-waiting.svg'
import sortIcon from '@/assets/figma/icon-unfold-less.svg'
import starEmptyIcon from '@/assets/figma/review-star-empty.svg'
import starFilledIcon from '@/assets/figma/review-star-filled.svg'
import editIcon from '@/assets/figma/scrap-edit.svg'
import eyeIcon from '@/assets/figma/scrap-eye.svg'
import type { AccountRcpc } from '@/domain/myAccount/services'
import { useState } from 'react'
import { RcpcConnectionInfo } from './AccountConnectionInfo'
import type { AccountSort } from './accountSorting'
import { SortButton } from './accountSorting'

type RcpcListItem = AccountRcpc & { ended: boolean; visualState: string }
type RcpcAction = (item: AccountRcpc, trigger: HTMLButtonElement) => void
export function RcpcListTable({ canExtend = true, items, sort, sortConfig, onOpenRcpcPopup, onReboot, onInquiry, onCopy }: {
  canExtend?: boolean
  items: RcpcListItem[]; sort: (key: string) => void; sortConfig: AccountSort | null;
  onOpenRcpcPopup: (type: string, item: AccountRcpc, trigger: HTMLButtonElement) => void;
  onReboot: RcpcAction; onInquiry: RcpcAction; onCopy: () => void;
}) {
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<string[]>([])
  return (
        <div className="rcpc-list rcpc-list--table">
          <div className="rcpc-list__header"><span><SortButton icon={sortIcon} label="RCPC" onSort={sort} sortConfig={sortConfig} sortKey="rcpc">RCPC</SortButton></span><span><SortButton icon={sortIcon} label="서버 위치" onSort={sort} sortConfig={sortConfig} sortKey="location">서버 위치</SortButton></span><span><SortButton icon={sortIcon} label="서버 상태" onSort={sort} sortConfig={sortConfig} sortKey="state">서버 상태</SortButton></span><span><SortButton icon={sortIcon} label="이용 기간" onSort={sort} sortConfig={sortConfig} sortKey="period">이용 기간</SortButton></span><span>접속 정보</span><span><SortButton icon={sortIcon} label="트래픽 사용량" onSort={sort} sortConfig={sortConfig} sortKey="traffic">트래픽<br />사용량</SortButton></span><span>빠른 실행</span></div>
          {items.map((item) => (
            <article className={item.ended ? 'is-ended' : ''} data-sort-row={item.id} key={item.id}>
              <div className="rcpc-list__product"><strong><img alt="" src={item.favorite ? starFilledIcon : starEmptyIcon} /><span>{item.alias}</span><button aria-label={`${item.rcpcId} RCPC 별명 설정`} className="rcpc-list__inline-action" onClick={(event) => onOpenRcpcPopup('alias', item, event.currentTarget)} type="button"><img alt="" src={editIcon} /></button></strong><button className="rcpc-list__spec-action" onClick={(event) => onOpenRcpcPopup('spec', item, event.currentTarget)} type="button">{item.rcpcId} <u>사양보기</u></button></div>
              <div>{item.company}<br />{item.center}</div>
              <div className="rcpc-list__state"><img alt="" src={item.ended ? serverDisabledIcon : item.visualState === '확인 필요' ? serverOffIcon : item.visualState === '연장대기' ? serverWaitingIcon : serverOnIcon} /><span>{item.visualState}</span></div>
              <div><strong>{item.ended ? '이용종료' : `${item.daysLeft}일 남음`}</strong><small>{item.endsAt}<br />까지</small></div>
              <RcpcConnectionInfo className="rcpc-list__connect" copyIcon={copyIcon} eyeIcon={eyeIcon} eyeOffIcon={eyeOffIcon} onCopy={onCopy} onTogglePassword={() => setVisiblePasswordIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} password={item.remotePassword} passwordDataAttribute="data-rcpc-password" passwordVisible={visiblePasswordIds.includes(item.id)} remote={item.remote} remoteIcon={item.remote.startsWith('Team') ? teamviewerIcon : anydeskIcon} webIcon={webConnectIcon} />
<div>{item.traffic}</div><div className="rcpc-list__actions"><span><button disabled={item.ended} onClick={(event) => onReboot(item, event.currentTarget)} type="button">재부팅</button><button className="rcpc-list__inquiry-action" onClick={(event) => onInquiry(item, event.currentTarget)} type="button">문의</button></span>{canExtend ? item.ended ? <button className="is-disabled" disabled type="button">기간연장</button> : <button className="is-dark" onClick={(event) => onOpenRcpcPopup('extension', item, event.currentTarget)} type="button">기간연장</button> : null}</div>
            </article>
          ))}
        </div>
  )
}

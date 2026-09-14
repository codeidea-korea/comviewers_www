import { useState } from 'react'
import eyeOffIcon from '../../../assets/figma/eye-off.svg'
import connectAnydeskIcon from '../../../assets/figma/icon-connect-anydesk.svg'
import connectTeamviewerIcon from '../../../assets/figma/icon-connect-teamviewer.svg'
import connectWebIcon from '../../../assets/figma/icon-connect-web.svg'
import copyIcon from '../../../assets/figma/icon-content-copy.svg'
import serverDisabledIcon from '../../../assets/figma/icon-server-disabled.svg'
import serverOffIcon from '../../../assets/figma/icon-server-off.svg'
import serverOnIcon from '../../../assets/figma/icon-server-on.svg'
import sortIcon from '../../../assets/figma/icon-unfold-less.svg'
import starIcon from '../../../assets/figma/review-star-filled.svg'
import editIcon from '../../../assets/figma/scrap-edit.svg'
import eyeIcon from '../../../assets/figma/scrap-eye.svg'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import { RcpcConnectionInfo } from './AccountConnectionInfo'
import type { AccountSort } from './accountSorting'
import { nextSortConfig,SortButton,sortRows } from './accountSorting'
import { type InquiryTarget,type OpenRcpc,type RcpcView,getInquiryRcpc } from './homeRcpc'

export function HomeRcpcTable({ items, manager, onInquiry, onOpenRcpcPopup, onOpenReboot, selectable = false }: {
 items: RcpcView[]; manager: boolean; selectable?: boolean; onInquiry: (items: InquiryTarget[], trigger: HTMLButtonElement) => void;
 onOpenRcpcPopup: OpenRcpc; onOpenReboot: (rcpc: RcpcView, trigger: HTMLButtonElement) => void
}) {
  const showSelection = manager || selectable
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<string[]>([])
  const [copyMessage, setCopyMessage] = useState('')
  const [sortConfig, setSortConfig] = useState<AccountSort | null>(null)
  const copyConnectionValue = () => { setCopyMessage('현재 이용할 수 없습니다.') }
  const stateIcon = (state: string) => {
    if (state === '실행 중') return serverOnIcon
    if (state === '연장대기') return serverOffIcon
    if (state === '종료') return serverDisabledIcon
    return serverOffIcon
  }
  const sortedItems = sortRows(items, sortConfig, (item, key) => {
    if (key === 'rcpc') return item.alias
    if (key === 'location') return `${item.company} ${item.center}`
    if (key === 'state') return item.state
    if (key === 'period') return item.state === '종료' || item.state === '이용종료' ? 0 : item.daysLeft
    return item.traffic
  })
  const sort = (key: string) => setSortConfig((current) => nextSortConfig(current, key))

  return (
    <div className={`mypage-home-rcpc${showSelection ? ' is-selectable' : ''}`}>
      <div className="mypage-home-rcpc__head">
        <span><SortButton className="mypage-home-sort-button" icon={sortIcon} label="RCPC" onSort={sort} sortConfig={sortConfig} sortKey="rcpc">RCPC</SortButton></span>
        <span><SortButton className="mypage-home-sort-button" icon={sortIcon} label="서버 위치" onSort={sort} sortConfig={sortConfig} sortKey="location">서버 위치</SortButton></span>
        <span><SortButton className="mypage-home-sort-button" icon={sortIcon} label="서버 상태" onSort={sort} sortConfig={sortConfig} sortKey="state">서버 상태</SortButton></span>
        <span><SortButton className="mypage-home-sort-button" icon={sortIcon} label="이용 기간" onSort={sort} sortConfig={sortConfig} sortKey="period">이용 기간</SortButton></span>
        <span>접속 정보</span>
        <span><SortButton className="mypage-home-sort-button" icon={sortIcon} label="트래픽 사용량" onSort={sort} sortConfig={sortConfig} sortKey="traffic">트래픽<br />사용량</SortButton></span>
        <span>빠른 실행</span>
      </div>
      {sortedItems.map((item) => {
        const ended = item.state === '종료' || item.state === '이용종료'
        const aliasUnset = !manager && item.aliasUnset
        const passwordVisible = visiblePasswordIds.includes(item.id)
        return <article className={ended ? 'is-disabled' : ''} data-sort-row={item.id} key={item.id}>
          {showSelection ? <div className="mypage-home-rcpc__select"><Checkbox aria-label={`${item.rcpcId} 선택`} /></div> : null}
          <div className="mypage-home-rcpc__alias">
            <strong><img alt="" src={starIcon} /><span>{aliasUnset ? item.rcpcId : item.alias}</span>{aliasUnset ? null : <button aria-label={`${item.rcpcId} RCPC 별명 설정`} className="mypage-home-rcpc__edit" onClick={(event) => onOpenRcpcPopup('alias', item, event.currentTarget)} type="button"><img alt="" src={editIcon} /></button>}</strong>
            <button className="mypage-home-rcpc__spec-action" onClick={(event) => onOpenRcpcPopup(aliasUnset ? 'alias' : 'spec', item, event.currentTarget)} type="button">{aliasUnset ? '별명설정 ›' : `${item.rcpcId} 사양보기`}</button>
          </div>
          <div className="mypage-home-rcpc__server">{item.company}<br />메가서버실</div>
          <div className="mypage-home-rcpc__state"><img alt="" src={stateIcon(item.state)} /><span>{item.state}</span></div>
          <div className="mypage-home-rcpc__period"><strong>{item.state === '종료' ? '이용종료' : `${item.daysLeft}일 남음`}</strong><small>{item.endsAt} 17:25:23 까지</small></div>
          <RcpcConnectionInfo className="mypage-home-rcpc__connection" copyIcon={copyIcon} eyeIcon={eyeIcon} eyeOffIcon={eyeOffIcon} onCopy={copyConnectionValue} onTogglePassword={() => setVisiblePasswordIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} password={item.remotePassword} passwordDataAttribute="data-mypage-rcpc-password" passwordVisible={passwordVisible} remote={item.remote} remoteIcon={item.remote.startsWith('Team') ? connectTeamviewerIcon : connectAnydeskIcon} wanIp={item.wanIp} webIcon={connectWebIcon} />
          <div className="mypage-home-rcpc__traffic">{item.traffic}</div>
          <div className="mypage-home-rcpc__actions"><span><button disabled={ended} onClick={(event) => onOpenReboot(item, event.currentTarget)} type="button">재부팅</button><button disabled={ended} onClick={(event) => onInquiry([getInquiryRcpc(item, manager)], event.currentTarget)} type="button">문의</button></span>{ended ? <button className="is-disabled" disabled type="button">기간연장</button> : <button onClick={(event) => onOpenRcpcPopup('extension', item, event.currentTarget)} type="button">기간연장</button>}</div>
        </article>
      })}
      {copyMessage ? <p aria-live="polite" className="mypage-home-rcpc__copy-notice">{copyMessage}</p> : null}
    </div>
  )
}

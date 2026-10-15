import { useUiTranslation } from '@/i18n/uiTranslation'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { isActiveManager } from '@/domain/myAccount/managerServices'
import { useSession } from '@/app/session/SessionProvider'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import moreIcon from '../../../assets/figma/comment-more-fill.svg'
import addIcon from '../../../assets/figma/icon-add.svg'
import linkIcon from '../../../assets/figma/icon-link.svg'
import searchIcon from '../../../assets/figma/mypage-search.svg'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import { Pagination } from '../../../components/ui/PaginationControl'
import { AccountQueryState } from './AccountQueryState'
import { useManagerWorkspace } from './hooks/useManagerWorkspace'
import { MyPageLayout } from '../MypageComponentsView'
import { managerCatalogRowMatches } from './managerCatalogSearch'
import { ManagerFilterToolbar } from './ManagerFilterToolbar'
import './managerCatalog.css'
import { RcpcSelectionMenu } from './RcpcSelectionMenu'
import './manager-qa.css'

export function ManagerCatalog({ selectedRows, onSelectedRowsChange: setSelectedRows, onCreate, onEdit, onAssign, onUnassign, onSettings, onCloseMenu, onToggleMenu, openMenuRow = null }: {
  selectedRows: string[]; onSelectedRowsChange: Dispatch<SetStateAction<string[]>>;
  onCreate: () => void; onEdit: (id: string) => void;
  onSettings: () => void;
  onAssign: (ids: string[]) => void; onUnassign: (ids: string[]) => void;
  onCloseMenu: () => void; onToggleMenu: (id: string) => void; openMenuRow?: string | null;
}) {
  const { uiText, t } = useUiTranslation()
  const account = useManagerWorkspace()
  const session = useSession()
  const managers = useMemo(() => [...(account.data?.managers ?? [])].filter(isActiveManager).sort((left, right) => left.name.localeCompare(right.name, 'ko')), [account.data?.managers])
  const managerRows = (account.data?.rcpcs ?? []).map((item) => {
    const assigned = managers.filter((manager) => manager.assignedRcpcIds.includes(item.id) || manager.assignedRcpcIds.includes(item.rcpcId))
    return { id: item.id, rcpc: item.rcpcId, alias: item.alias, period: `${item.startedAt}~${item.endsAt}`, remain: t("mypageSupport.template6", { value0: item.daysLeft }), managerIds: assigned.map((manager) => manager.id), managerNames: assigned.map((manager) => manager.name), managers: assigned }
  })
  const [search, setSearch] = useState('')
  const [managerFilter, setManagerFilter] = useState<string | 'unassigned' | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const { message: copyMessage, setMessage: setCopyMessage, toastKey } = useToastMessage()
  const openMenuContainerRef = useRef<HTMLSpanElement | null>(null)
  const filteredRows = managerRows.filter((row) => (managerFilter === null || (managerFilter === 'unassigned' ? !row.managerIds.length : row.managerIds.includes(managerFilter)))
    && managerCatalogRowMatches(row, search))
  const pageSize = 10
  const totalPages = Math.ceil(filteredRows.length / pageSize)
  const safePage = totalPages ? Math.min(currentPage, totalPages) : 1
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedRows.includes(row.id))
  const changeAll = (checked: boolean) => setSelectedRows((current) => checked
    ? [...new Set([...current, ...visibleRows.map((row) => row.id)])]
    : current.filter((id) => !visibleRows.some((row) => row.id === id)))
  const changeRow = (rowId: string, checked: boolean) => setSelectedRows((current) => checked
    ? [...current, rowId].filter((value, position, values) => values.indexOf(value) === position)
    : current.filter((id) => id !== rowId))
  const copyAccessLink = async () => {
    try {
      const organization = session.status === 'authenticated' ? session.organizations.find(item => item.id === session.organizationId) : null
      if (!organization?.organizationNo) throw new Error('Organization code unavailable')
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(`${window.location.origin}/manager/${encodeURIComponent(organization.organizationNo)}/mypage`)
      setCopyMessage("복사되었습니다.")
    } catch { setCopyMessage("접속 링크를 복사하지 못했습니다. 다시 시도해 주세요.") }
  }
  useEffect(() => {
    if (managerFilter && managerFilter !== 'unassigned' && !managers.some(manager => manager.id === managerFilter)) {
      setManagerFilter(null)
      setCurrentPage(1)
    }
  }, [managerFilter, managers])
  useEffect(() => {
    if (!openMenuRow) return

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && openMenuContainerRef.current?.contains(event.target)) return
      onCloseMenu()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onCloseMenu()
      openMenuContainerRef.current?.querySelector<HTMLButtonElement>('.manager-catalog__menu-trigger')?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCloseMenu, openMenuRow])
  const unassignedCount = managerRows.filter((row) => !row.managerIds.length).length
  const chooseGroup = (groupId: string | 'unassigned' | null) => {
    setManagerFilter(groupId)
    setCurrentPage(1)
  }
  return <MyPageLayout><section className="manager-catalog manager-catalog--mypage">
    <ManagerFilterToolbar managers={managers} selected={managerFilter} unassignedCount={unassignedCount} onSelect={chooseGroup} onSettings={onSettings} onCreate={onCreate} onCopyLink={() => void copyAccessLink()} search={search} onSearch={value => { setSearch(value); setCurrentPage(1) }}/>
    <AccountQueryState pending={account.isPending} error={account.error} retry={account.refetch}/>
    <div className="manager-catalog__tools"><label><input aria-label={uiText("담당자 검색")} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} placeholder={uiText("담당자명, RCPC 품번 또는 별명을 검색해 주세요.")} value={search} /><img alt="" src={searchIcon} /></label><span><button onClick={copyAccessLink} type="button">{uiText("접속 링크복사")} <img alt="" src={linkIcon} /></button><button onClick={onCreate} type="button">{uiText("담당자 등록")} <img alt="" src={addIcon} /></button></span></div>
    <Toast message={uiText(copyMessage)} toastKey={toastKey}/>
    <div className="manager-catalog__body"><div className="manager-catalog__table-panel"><div className="manager-catalog__select"><label><Checkbox checked={allVisibleSelected} onChange={(event) => changeAll(event.target.checked)} /> {uiText("모두선택")}</label><RcpcSelectionMenu label={uiText("선택한 RCPC 담당자 작업")} nativeOnMobile><button disabled={!selectedRows.length} onClick={() => onUnassign(selectedRows)} type="button">{uiText("일괄 담당자 해제")}</button><button disabled={!selectedRows.length} onClick={() => onAssign(selectedRows)} type="button">{uiText("일괄 담당자 지정")}</button></RcpcSelectionMenu></div><div aria-label={uiText("RCPC 담당자 목록")} className="manager-catalog__table" role="table"><div className="manager-catalog__head" role="row"><span aria-label={uiText("선택")} role="columnheader" /><span role="columnheader">{uiText("품번")}</span><span role="columnheader">{uiText("RCPC 별명")}</span><span role="columnheader">{uiText("이용기간")}</span><span role="columnheader">{uiText("남은 일수")}</span><span role="columnheader">{uiText("담당자 정보")}</span><span aria-label={uiText("작업")} role="columnheader" /></div>{visibleRows.map((row) => {
      const menuOpen = openMenuRow === row.id
      return <div className="manager-catalog__row" key={row.id} role="row"><span role="cell"><Checkbox aria-label={t("mypageSupport.template7", { value0: row.alias, value1: row.rcpc })} checked={selectedRows.includes(row.id)} onChange={(event) => changeRow(row.id, event.target.checked)} /></span><span role="cell">{row.rcpc}</span><span role="cell">{row.alias}</span><span role="cell">{row.period}</span><span role="cell">{row.remain}</span><span className="manager-catalog__manager-cell" role="cell">{row.managers.length ? row.managers.map((manager) => <button aria-label={t("mypageSupport.template8", { value0: manager.name })} className="manager-catalog__manager-info" key={manager.id} onClick={() => onEdit(manager.id)} type="button">{manager.name} {manager.loginId}</button>) : uiText("미배정")}</span><span className="manager-catalog__action-cell" ref={menuOpen ? openMenuContainerRef : undefined} role="cell"><button aria-controls={`manager-row-menu-${row.id}`} aria-expanded={menuOpen} aria-haspopup="menu" aria-label={t("mypageSupport.template9", { value0: row.alias })} className="manager-catalog__menu-trigger" onClick={() => onToggleMenu(row.id)} type="button"><img alt="" src={moreIcon} /></button>{menuOpen ? <span aria-label={t("mypageSupport.template10", { value0: row.alias })} className="manager-catalog__menu" id={`manager-row-menu-${row.id}`} role="menu"><button role="menuitem" type="button" onClick={() => onAssign([row.id])}>{row.managerIds.length ? uiText("담당자 변경") : uiText("담당자 설정")}</button>{row.managerIds.length ? <button onClick={() => onUnassign([row.id])} role="menuitem" type="button">{uiText("담당자 해제")}</button> : null}</span> : null}</span></div>
    })}{visibleRows.length ? null : <div className="manager-catalog__empty" role="row"><span role="cell">{search.trim() ? uiText("검색 조건에 해당하는 담당자 또는 RCPC가 없습니다.") : managerFilter && managerFilter !== 'unassigned' ? uiText("담당자에게 배정된 RCPC가 없습니다.") : uiText("등록된 RCPC가 없습니다.")}</span></div>}</div><div aria-label={uiText("모바일 RCPC 담당자 목록")} className="mobile-manager-list">{visibleRows.map((row) => <article className="mobile-manager-card" key={row.id}>
      <h2><Checkbox aria-label={t("mypageSupport.template7", { value0: row.alias, value1: row.rcpc })} checked={selectedRows.includes(row.id)} onChange={(event) => changeRow(row.id, event.target.checked)} />{row.rcpc}</h2>
      <dl>
        <div><dt>{uiText("RCPC 별명")}</dt><dd>{row.alias || '-'}</dd></div>
        <div><dt>{uiText("이용기간")}</dt><dd>{row.period}</dd></div>
        <div><dt>{uiText("남은 일수")}</dt><dd>{row.remain}</dd></div>
        <div><dt>{uiText("담당자 정보")}</dt><dd>{row.managers.length ? row.managers.map((manager) => <button aria-label={t("mypageSupport.template8", { value0: manager.name })} className="manager-catalog__manager-info" key={manager.id} onClick={() => onEdit(manager.id)} type="button">{manager.name} {manager.loginId}</button>) : uiText("미배정")}</dd></div>
      </dl>
      <footer><button type="button" onClick={() => onAssign([row.id])}>{row.managerIds.length ? uiText("담당자 변경") : uiText("담당자 설정")}</button>{row.managerIds.length ? <button type="button" onClick={() => onUnassign([row.id])}>{uiText("담당자 해제")}</button> : <button type="button" disabled>{uiText("담당자 해제")}</button>}</footer>
    </article>)}{visibleRows.length ? null : <p className="manager-catalog__empty">{search.trim() ? uiText("검색 조건에 해당하는 담당자 또는 RCPC가 없습니다.") : managerFilter && managerFilter !== 'unassigned' ? uiText("담당자에게 배정된 RCPC가 없습니다.") : uiText("등록된 RCPC가 없습니다.")}</p>}</div>{totalPages ? <Pagination currentPage={safePage} onPageChange={setCurrentPage} totalPages={totalPages} /> : null}</div></div>
  </section></MyPageLayout>
}

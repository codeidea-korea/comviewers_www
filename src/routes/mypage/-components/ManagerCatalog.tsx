import { isActiveManager } from '@/domain/myAccount/managerServices'
import { useEffect, useMemo, useState } from 'react'
import moreIcon from '../../../assets/figma/comment-more-fill.svg'
import addIcon from '../../../assets/figma/icon-add.svg'
import linkIcon from '../../../assets/figma/icon-link.svg'
import searchIcon from '../../../assets/figma/mypage-search.svg'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import { Pagination } from '../../../components/ui/PaginationControl'
import { AccountQueryState } from './AccountQueryState'
import { useMyAccount } from './hooks/useMyAccount'
import { MyPageLayout } from '../MypageComponentsView'
import { managerCatalogRowMatches } from './managerCatalogSearch'

export function ManagerCatalog({ notice = '', onCreate, onEdit, onAssign, onUnassign, onToggleMenu, openMenuRow = null }: {
  notice?: string; onCreate: () => void; onEdit: (id: string) => void;
  onAssign: (ids: string[]) => void; onUnassign: (ids: string[]) => void;
  onToggleMenu: (id: string) => void; openMenuRow?: string | null;
}) {
  const account = useMyAccount()
  const managers = useMemo(() => [...(account.data?.managers ?? [])].filter(isActiveManager).sort((left, right) => left.name.localeCompare(right.name, 'ko')), [account.data?.managers])
  const managerRows = (account.data?.rcpcs ?? []).map((item) => {
    const assigned = managers.filter((manager) => manager.assignedRcpcIds.includes(item.id) || manager.assignedRcpcIds.includes(item.rcpcId))
    return { id: item.id, rcpc: item.rcpcId, alias: item.alias, period: `${item.startedAt}~${item.endsAt}`, remain: `${item.daysLeft}일`, managerIds: assigned.map((manager) => manager.id), managerNames: assigned.map((manager) => manager.name), managers: assigned }
  })
  const [search, setSearch] = useState('')
  const [managerFilter, setManagerFilter] = useState<string | 'unassigned' | null>(null)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [copied, setCopied] = useState(false)
  const [mobileGroupsOpen, setMobileGroupsOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const filteredRows = managerRows.filter((row) => (managerFilter === null || (managerFilter === 'unassigned' ? !row.managerIds.length : row.managerIds.includes(managerFilter)))
    && managerCatalogRowMatches(row, search))
  const pageSize = 10
  const totalPages = Math.ceil(filteredRows.length / pageSize)
  const safePage = totalPages ? Math.min(currentPage, totalPages) : 1
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)
  const openMenuRowData = managerRows.find((row) => row.id === openMenuRow)
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedRows.includes(row.id))
  const selectedVisibleRows = visibleRows.filter((row) => selectedRows.includes(row.id))
  const changeAll = (checked: boolean) => setSelectedRows((current) => checked
    ? [...new Set([...current, ...visibleRows.map((row) => row.id)])]
    : current.filter((id) => !visibleRows.some((row) => row.id === id)))
  const changeRow = (rowId: string, checked: boolean) => setSelectedRows((current) => checked
    ? [...current, rowId].filter((value, position, values) => values.indexOf(value) === position)
    : current.filter((id) => id !== rowId))
  const copyAccessLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(`${window.location.origin}/login`)
      setCopied(true)
    } catch { setCopied(false) }
  }
  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(timeout)
  }, [copied])
  useEffect(() => {
    if (managerFilter && managerFilter !== 'unassigned' && !managers.some(manager => manager.id === managerFilter)) {
      setManagerFilter(null)
      setCurrentPage(1)
    }
  }, [managerFilter, managers])
  const unassignedCount = managerRows.filter((row) => !row.managerIds.length).length
  const currentGroupLabel = managerFilter === null ? '전체 담당자' : managerFilter === 'unassigned' ? '미배정' : managers.find((manager) => manager.id === managerFilter)?.name ?? '전체 담당자'
  const chooseGroup = (groupId: string | 'unassigned' | null) => {
    setManagerFilter(groupId)
    setCurrentPage(1)
    setMobileGroupsOpen(false)
  }
  return <MyPageLayout title="RCPC 담당자 관리"><section className="manager-catalog manager-catalog--mypage content-container">
    <h1 className="manager-catalog__mobile-title">RCPC 담당자 관리</h1>
    {notice ? <p role="status" className="mypage-notice">{notice}</p> : null}
    <AccountQueryState pending={account.isPending} error={account.error} retry={account.refetch}/>
    <div className="manager-catalog__tools"><label><input aria-label="담당자 검색" onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} placeholder="담당자명, RCPC 품번 또는 별명을 검색해 주세요." value={search} /><img alt="" src={searchIcon} /></label><span><button onClick={copyAccessLink} type="button">접속 링크복사 <img alt="" src={linkIcon} /></button><button onClick={onCreate} type="button">담당자 등록 <img alt="" src={addIcon} /></button></span></div>
    <div className="manager-catalog__mobile-tools">
      <button type="button" onClick={() => setMobileGroupsOpen(true)}>{currentGroupLabel}</button>
      <button type="button" onClick={onCreate}>담당자 등록</button>
      <button aria-expanded={mobileSearchOpen} aria-label="담당자 검색 열기" className="manager-catalog__mobile-search-button" type="button" onClick={() => setMobileSearchOpen((open) => !open)}><img alt="" src={searchIcon}/></button>
      {mobileSearchOpen ? <label className="manager-catalog__mobile-search"><span className="sr-only">담당자 검색</span><input onChange={(event) => { setSearch(event.target.value); setCurrentPage(1) }} placeholder="담당자명, RCPC 품번 또는 별명" value={search}/></label> : null}
    </div>
    {copied ? <p className="manager-catalog__copy-toast" role="status">복사되었습니다.</p> : null}
    <div className="manager-catalog__body"><aside><strong>담당자 목록</strong><div className="manager-catalog__groups">
      {managers.map((manager) => <button className={managerFilter === manager.id ? 'is-active' : ''} key={manager.id} onClick={() => { setManagerFilter(manager.id); setCurrentPage(1) }} type="button"><b>{manager.name}<em>{manager.assignedRcpcIds.length}</em></b></button>)}
      {managers.length ? <button className={managerFilter === 'unassigned' ? 'is-active' : ''} onClick={() => { setManagerFilter('unassigned'); setCurrentPage(1) }} type="button"><b>미배정<em>{unassignedCount}</em></b></button> : <p>등록된 담당자가 없습니다.</p>}
    </div></aside><div className="manager-catalog__table-panel"><div className="manager-catalog__select"><label><Checkbox checked={allVisibleSelected} onChange={(event) => changeAll(event.target.checked)} /> 모두선택</label>{selectedVisibleRows.length ? <span><button type="button" onClick={() => onUnassign(selectedVisibleRows.map((row) => row.id))}>일괄 담당자 해제</button><button type="button" onClick={() => onAssign(selectedVisibleRows.map((row) => row.id))}>일괄 담당자 지정</button></span> : null}</div><div aria-label="RCPC 담당자 목록" className="manager-catalog__table" role="table"><div className="manager-catalog__head" role="row"><span aria-label="선택" role="columnheader" /><span role="columnheader">품번</span><span role="columnheader">RCPC 별명</span><span role="columnheader">이용기간</span><span role="columnheader">남은 일수</span><span role="columnheader">담당자 정보</span><span aria-label="작업" role="columnheader" /></div>{visibleRows.map((row)=><div className="manager-catalog__row" key={row.id} role="row"><span role="cell"><Checkbox aria-label={`${row.alias} ${row.rcpc} 선택`} checked={selectedRows.includes(row.id)} onChange={(event) => changeRow(row.id, event.target.checked)} /></span><span role="cell">{row.rcpc}</span><span role="cell">{row.alias}</span><span role="cell">{row.period}</span><span role="cell">{row.remain}</span><span className="manager-catalog__manager-cell" role="cell">{row.managers.map((manager) => <button aria-label={`${manager.name} 담당자 정보`} className="manager-catalog__manager-info" key={manager.id} onClick={() => onEdit(manager.id)} type="button">{manager.name} {manager.loginId}</button>)}</span><span className="manager-catalog__action-cell" role="cell"><button aria-controls={`manager-row-menu-${row.id}`} aria-expanded={openMenuRow === row.id} aria-label={`${row.alias} 담당자 메뉴`} onClick={() => onToggleMenu(row.id)} type="button"><img alt="" src={moreIcon} /></button></span></div>)}{visibleRows.length ? null : <div className="manager-catalog__empty" role="row"><span role="cell">{search.trim() ? '검색 조건에 해당하는 담당자 또는 RCPC가 없습니다.' : managerFilter && managerFilter !== 'unassigned' ? '담당자에게 배정된 RCPC가 없습니다.' : '등록된 RCPC가 없습니다.'}</span></div>}</div><div aria-label="모바일 RCPC 담당자 목록" className="mobile-manager-list">{visibleRows.map((row) => <article className="mobile-manager-card" key={row.id}>
      <h2><Checkbox aria-label={`${row.alias} ${row.rcpc} 선택`} checked={selectedRows.includes(row.id)} onChange={(event) => changeRow(row.id, event.target.checked)} />{row.alias || row.rcpc}</h2>
      <dl>
        <div><dt>품번</dt><dd>{row.rcpc}</dd></div>
        <div><dt>이용기간</dt><dd>{row.period}</dd></div>
        <div><dt>남은 일수</dt><dd>{row.remain}</dd></div>
        <div><dt>담당자</dt><dd>{row.managers.length ? row.managers.map((manager) => <button aria-label={`${manager.name} 담당자 정보`} className="manager-catalog__manager-info" key={manager.id} onClick={() => onEdit(manager.id)} type="button">{manager.name} {manager.loginId}</button>) : '미배정'}</dd></div>
      </dl>
      <footer><button type="button" onClick={() => onAssign([row.id])}>{row.managerIds.length ? '담당자 변경' : '담당자 설정'}</button>{row.managerIds.length ? <button type="button" onClick={() => onUnassign([row.id])}>담당자 해제</button> : <button type="button" disabled>담당자 해제</button>}</footer>
    </article>)}{visibleRows.length ? null : <p className="manager-catalog__empty">{search.trim() ? '검색 조건에 해당하는 담당자 또는 RCPC가 없습니다.' : managerFilter && managerFilter !== 'unassigned' ? '담당자에게 배정된 RCPC가 없습니다.' : '등록된 RCPC가 없습니다.'}</p>}</div>{totalPages ? <Pagination currentPage={safePage} onPageChange={setCurrentPage} totalPages={totalPages} /> : null}</div></div>{openMenuRowData ? <div aria-label={`${openMenuRowData.alias} 담당자 작업`} className="manager-catalog__menu" id={`manager-row-menu-${openMenuRowData.id}`}><button type="button" onClick={() => onAssign([openMenuRowData.id])}>{openMenuRowData.managerIds.length ? '담당자 변경' : '담당자 설정'}</button>{openMenuRowData.managerIds.length ? <button onClick={() => onUnassign([openMenuRowData.id])} type="button">담당자 해제</button> : null}</div> : null}
    {mobileGroupsOpen ? <div className="mobile-manager-groups-backdrop" role="presentation" onClick={() => setMobileGroupsOpen(false)}><div aria-modal="true" className="mobile-manager-groups-sheet" role="dialog" aria-label="담당자 목록" onClick={(event) => event.stopPropagation()}><span className="mobile-manager-groups-sheet__handle"/><button className={managerFilter === null ? 'is-selected' : ''} type="button" onClick={() => chooseGroup(null)}>전체 담당자</button>{managers.map((manager) => <button className={managerFilter === manager.id ? 'is-selected' : ''} key={manager.id} type="button" onClick={() => chooseGroup(manager.id)}>{manager.name} ({manager.assignedRcpcIds.length})</button>)}<button className={managerFilter === 'unassigned' ? 'is-selected' : ''} type="button" onClick={() => chooseGroup('unassigned')}>미배정 ({unassignedCount})</button></div></div> : null}
  </section></MyPageLayout>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { InquiryAction } from '../inquiries/InquiryAction'
import { useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { createCustomerRcpcMutations, SavedRcpcGroup } from '@/api/customerRcpcMutations'
import { ApiClientError } from '@/api/httpClient'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Pagination } from '@/components/ui/PaginationControl'
import { MyPageLayout, MyPageMobileFilterSheet } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { isAccountReadDenied } from '../accountReadAccess'
import { AccountReadDeniedDialog } from '../modals/AccountReadDeniedDialog'
import { RcpcExtensionCheckout } from '../RcpcExtensionCheckout'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { Modal } from '@/components/ui/ModalControl'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { FavoritesSettingsDialog, NewFavoritesGroupDialog, type FavoriteGroupOption } from '../modals/FavoritesGroupDialogs'
import { endedRental, extensionBlocked, extensionTarget } from '../rcpcPresentation'
import { RcpcDashboardTable } from '../rcpc/RcpcDashboardTable'
import { useSession } from '@/app/session/SessionProvider'
import { canManageFavorites, FavoritesManageOnly } from '../favoritesAccess'
import { orderFavoriteGroups } from './orderFavoriteGroups'
import groupUnfoldIcon from '@/assets/figma/favorites-group-unfold.svg'
import groupSettingsIcon from '@/assets/figma/favorites-group-settings.svg'
import groupCheckIcon from '@/assets/figma/favorites-group-check.svg'
import groupChevronUpIcon from '@/assets/figma/favorites-group-chevron-up.svg'
import dragIcon from '@/assets/figma/icon-drag-indicator.svg'
import deleteIcon from '@/assets/figma/icon-delete.svg'
import backIcon from '@/assets/figma/chevron-left.svg'
import closeIcon from '@/assets/figma/inquiry-modal-close.svg'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
type GroupSelection = 'all' | 'unclassified' | number
type SortKey = NonNullable<MyRcpcQuery['sort']>

const mobileSortLabels: Partial<Record<SortKey, string>> = {
  productNo: 'RCPC',
  serverRoom: '서버 위치',
  serverStatus: '서버 상태',
  servicePeriod: '이용 기간',
  traffic: '트래픽 사용량',
  favoriteEdited: '즐겨찾기 변경순',
}
const mobileSortByLabel = Object.fromEntries(Object.entries(mobileSortLabels).map(([sort, label]) => [label, sort])) as Record<string, SortKey>
const mobileSortItems = Object.values(mobileSortLabels)

const groupQueryKey = (organizationId: string) => ['my-rcpc-groups', organizationId] as const

function flattenGroups(groups: readonly SavedRcpcGroup[]): SavedRcpcGroup[] {
  return groups.flatMap((group) => [group, ...group.children])
}

function groupFavoriteCount(group: SavedRcpcGroup): number {
  return group.rcpcCount + group.children.reduce((total, child) => total + child.rcpcCount, 0)
}

function mutationMessage(error: Error | null): string | null {
  if (!error) return null
  if (error instanceof ApiClientError && error.code === 'RC002') return '그룹 단계 또는 생성 한도를 확인해 주세요. 상위 그룹은 최대 10개, 각 하위 그룹은 최대 20개, 전체는 최대 100개입니다.'
  if (error instanceof ApiClientError && error.code === 'RC001') return '즐겨찾기 상태가 변경되었습니다. 목록을 새로 확인해 주세요.'
  return error.message
}

export function FavoritesPageContent({ api, mutations, settings = false }: { api: MyRcpcReadServices; mutations: RcpcMutations; settings?: boolean }) {
  const navigate = useNavigate()
  const session = useSession()
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<GroupSelection>('all')
  const [selectedRentals, setSelectedRentals] = useState<ReadonlySet<number>>(() => new Set())
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<MyRcpcQuery>({ size: 20, sort: 'serverStatus', sortDirection: 'asc' })
  const [mobileSortOpen, setMobileSortOpen] = useState(false)
  const [creating, setCreating] = useState(false), [editing, setEditing] = useState(false), [assigning, setAssigning] = useState(false)
  const [groupEditMode, setGroupEditMode] = useState(false)
  const [mobileGroupOpen, setMobileGroupOpen] = useState(false)
  const available = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'filter-options'], queryFn: ({ signal }) => api.filterOptions(signal) })
  const groups = useQuery({
    queryKey: groupQueryKey(api.organizationId),
    queryFn: ({ signal }) => mutations.groups(signal),
  })
  const rows = useQuery({
    queryKey: ['my-rcpcs', api.organizationId, 'favorites', selectedGroup, page, filters],
    queryFn: ({ signal }) => api.list({
      ...filters,
      favorite: true,
      groupId: typeof selectedGroup === 'number' ? selectedGroup : undefined,
      ungrouped: selectedGroup === 'unclassified' ? true : undefined,
      page,
    }, signal),
  })
  const accessDenied = isAccountReadDenied(groups.error) || isAccountReadDenied(rows.error) || isAccountReadDenied(available.error)
  const groupsData = useMemo(() => accessDenied ? [] : groups.data ? orderFavoriteGroups(groups.data) : undefined, [accessDenied, groups.data])
  const rowsData: Awaited<ReturnType<MyRcpcReadServices['list']>> | undefined = accessDenied
    ? { items: [], page: 0, size: filters.size ?? 20, totalElements: 0, totalPages: 0 }
    : rows.data
  const locations = accessDenied ? [] : available.data?.regions ?? []
  const rooms = accessDenied ? [] : (available.data?.serverRooms ?? []).filter(item => !filters.region || item.region === filters.region)
  const updateFilters = (next: MyRcpcQuery) => {
    if (accessDenied) return
    setFilters(previous => ({ ...previous, ...next })); setPage(0); setSelectedRentals(new Set())
  }
  const visibleSelection = accessDenied ? new Set<number>() : selectedRentals
  const allGroups = flattenGroups(groupsData ?? [])
  const unclassifiedCount = accessDenied ? 0 : available.data?.unclassifiedFavoriteCount
  const visualGroups: FavoriteGroupOption[] = [
    { id: 'unclassified', label: '미분류', parentId: null, count: unclassifiedCount },
    ...allGroups.map((group) => ({
      id: String(group.id),
      label: group.name,
      parentId: group.parentGroupId === null ? null : String(group.parentGroupId),
      count: group.parentGroupId === null ? groupFavoriteCount(group) : group.rcpcCount,
    })),
  ]
  const inquiryTargets = (rowsData?.items ?? []).filter(item => visibleSelection.has(item.rentalId) && !endedRental(item.rentalStatus)).slice(0, 20)
  const selectableItems = (rowsData?.items ?? []).filter(item => !extensionBlocked(item))
  const allSelected = selectableItems.length > 0 && selectableItems.every(item => visibleSelection.has(item.rentalId))
  const partiallySelected = visibleSelection.size > 0 && !allSelected
  const customerSession = session.status === 'authenticated' ? session.customerSession : null
  const canManage = !accessDenied && canManageFavorites(customerSession?.memberRole)
  const owner = customerSession?.memberRole === 'owner'
  const canExtend = !accessDenied && owner && customerSession?.commerceAvailable === true
  const selectedGroupLabel = accessDenied || selectedGroup === 'all'
    ? '전체'
    : selectedGroup === 'unclassified'
      ? '미분류'
      : allGroups.find(group => group.id === selectedGroup)?.name ?? '전체'
  useEffect(() => {
    setEditing(canManage && settings)
    setGroupEditMode(false)
    if (!canManage) {
      setCreating(false)
      setAssigning(false)
    }
  }, [canManage, settings])
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: groupQueryKey(api.organizationId) }),
      queryClient.invalidateQueries({ queryKey: ['my-rcpcs', api.organizationId] }),
    ])
  }
  const assignment = useMutation({
    mutationFn: async (groupId: number | null) => {
      if (!canManage) throw new Error('Forbidden')
      if (selectedRentals.size === 0) throw new Error('이동할 RCPC를 선택해 주세요.')
      const rentalIds = [...selectedRentals]
      const results = await Promise.allSettled(rentalIds.map((rentalId) => mutations.assignGroup(String(rentalId), groupId === null ? null : String(groupId))))
      const failed = rentalIds.filter((_, index) => results[index].status === 'rejected')
      setSelectedRentals(new Set(failed))
      if (failed.length) throw new Error(`${rentalIds.length - failed.length}대 이동 완료, ${failed.length}대 이동 실패. 선택된 실패 항목을 다시 시도해 주세요.`)
    },
    onSuccess: () => { setSelectedRentals(new Set()); setAssigning(false) },
    onSettled: refresh,
  })
  const createGroup = useMutation({ mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) => {
    if (!canManage) throw new Error('Forbidden')
    return mutations.createGroup({ name, parentGroupId: parentId ? Number(parentId) : null })
  }, onSuccess: async () => { await refresh(); setCreating(false) } })
  const openAssignment = () => { assignment.reset(); setCreating(false); setAssigning(true) }
  const closeAssignment = () => { if (!assignment.isPending) { assignment.reset(); setAssigning(false) } }
  const openNewGroup = () => { assignment.reset(); createGroup.reset(); setAssigning(false); setCreating(true) }
  const closeNewGroup = () => { if (!createGroup.isPending) { createGroup.reset(); setCreating(false) } }
  const closeGroupSettings = () => {
    setEditing(false)
    setGroupEditMode(false)
    if (settings) navigate('/mypage/favorites')
  }

  const selectGroup = (groupId: GroupSelection) => {
    setSelectedGroup(groupId)
    setPage(0)
    setSelectedRentals(new Set())
  }

  return <MyPageLayout wideHeader={<FavoritesGroupToolbar canManage={canManage} groups={groupsData ?? []} onSelect={selectGroup} onSettings={() => { setGroupEditMode(false); setEditing(true) }} selectedGroup={selectedGroup} selectedGroupLabel={selectedGroupLabel} unclassifiedCount={unclassifiedCount ?? null} />}>
    {accessDenied ? <AccountReadDeniedDialog key={api.organizationId} resource="즐겨찾기" /> : <AccountQueryState pending={groups.isPending || rows.isPending} error={groups.error ?? rows.error} retry={() => { void groups.refetch(); void rows.refetch() }} />}
    {!accessDenied && available.error ? <p role="alert">서버 위치·미분류 수량을 조회하지 못했습니다. <button type="button" onClick={() => void available.refetch()}>다시 시도</button></p> : null}
    <div className="favorites-page">
    {groupsData ? <div className="favorites-mobile-group-control"><strong>즐겨찾기 그룹</strong><span><button disabled={accessDenied} aria-expanded={!accessDenied && mobileGroupOpen} aria-haspopup="dialog" onClick={() => setMobileGroupOpen(true)} type="button">{selectedGroupLabel}</button><button aria-label="즐겨찾기 그룹 설정" disabled={!canManage} onClick={() => { setGroupEditMode(false); setEditing(true) }} type="button">설정</button></span></div> : null}
    {!accessDenied && groupsData ? <MobileFavoriteGroupPicker groups={groupsData} isOpen={mobileGroupOpen} selectedGroup={selectedGroup} unclassifiedCount={unclassifiedCount ?? null} onClose={() => setMobileGroupOpen(false)} onSelect={(groupId) => { selectGroup(groupId); setMobileGroupOpen(false) }}/> : null}
    {groupsData && canManage ? <FavoritesGroupManagementDialog editMode={groupEditMode} groups={groupsData} isOpen={editing && !creating} mutations={mutations} onAdd={openNewGroup} onBack={() => setGroupEditMode(false)} onChanged={refresh} onClose={closeGroupSettings} onDeleted={groupId => { if (selectedGroup === groupId || groupsData.find(group => group.id === groupId)?.children.some(child => child.id === selectedGroup)) selectGroup('all') }} onEdit={() => setGroupEditMode(true)} onSaved={() => setGroupEditMode(false)} unclassifiedCount={unclassifiedCount ?? null} /> : null}
    {canManage ? <NewFavoritesGroupDialog error={mutationMessage(createGroup.error) ?? undefined} groups={visualGroups} isOpen={creating} onAdd={(name, parentId) => createGroup.mutate({ name, parentId })} onClose={closeNewGroup} pending={createGroup.isPending} /> : null}
    <div className="favorites-layout">
    <section aria-label="즐겨찾기 RCPC 목록" className="favorites-results" id="favorites-results">
      <div className="favorites-mobile-sort-control"><button aria-expanded={!accessDenied && mobileSortOpen} aria-haspopup="dialog" disabled={accessDenied} onClick={() => setMobileSortOpen(true)} type="button">정렬: {mobileSortLabels[filters.sort ?? 'serverStatus'] ?? '서버 상태'} <span aria-hidden="true">↕</span></button></div>
      <header className="favorites-results__toolbar"><label><Checkbox aria-label="전체 RCPC 선택" checked={allSelected} indeterminate={partiallySelected} disabled={selectableItems.length === 0} onChange={event => setSelectedRentals(new Set(event.target.checked ? selectableItems.map(item => item.rentalId) : []))}/>모두선택</label><nav className="rcpc-list-bulk-actions"><FavoritesManageOnly allowed={canManage}><button type="button" disabled={assignment.isPending || selectedRentals.size === 0} onClick={openAssignment}>그룹 변경</button></FavoritesManageOnly><InquiryAction key={`${api.organizationId}:${accessDenied}`} appearance="text" disabled={inquiryTargets.length === 0} fixedTarget initialIds={inquiryTargets.map(item => item.pcAssetId)} />{canExtend ? inquiryTargets.length ? <RcpcExtensionCheckout key={inquiryTargets.map(item => item.rentalId).join(',')} api={api} rentalIds={inquiryTargets.map(item => item.rentalId)} displayTargets={inquiryTargets.map(extensionTarget)} triggerLabel="기간연장"/> : <button type="button" disabled>기간연장</button> : null}</nav></header>
      <div className="favorites-results__filters"><label>서버 위치<select disabled={accessDenied} value={accessDenied ? '' : filters.region ?? ''} onChange={event => updateFilters({ region: event.target.value || undefined, serverRoomId: undefined })}><option value="">전체</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label><label>서버실<select disabled={accessDenied} value={accessDenied ? '' : filters.serverRoomId ?? ''} onChange={event => updateFilters({ serverRoomId: event.target.value ? Number(event.target.value) : undefined })}><option value="">전체</option>{rooms.map(item => <option key={item.id} value={item.id}>{item.name ?? String(item.id)}</option>)}</select></label></div>
      {canManage ? <FavoritesSettingsDialog error={assignment.error?.message} groups={visualGroups} isOpen={assigning} onClose={closeAssignment} onNewGroup={openNewGroup} onSave={(id) => assignment.mutate(id === 'unclassified' ? null : Number(id))} pending={assignment.isPending} /> : null}
      {rowsData ? <>
      <p className="rcpc-list-count">총 <b>{rowsData.totalElements}</b>개 상품</p>
      <RcpcDashboardTable api={api} canEditAlias={owner} canExtend={canExtend} className="favorites-table" items={rowsData.items} selected={visibleSelection} onSelectedChange={setSelectedRentals} sortConfig={{ key: filters.sort ?? 'serverStatus', direction: filters.sortDirection ?? 'asc' }} onSort={sort => updateFilters({ sort: sort.key, sortDirection: sort.direction })} emptyMessage="즐겨찾기로 등록된 RCPC가 없습니다." mutations={canManage ? mutations : undefined} mobileVariant="favorites" onAliasSaved={() => rows.refetch()}/>
      {rowsData.totalPages > 1 ? <Pagination currentPage={rowsData.page + 1} totalPages={rowsData.totalPages} onPageChange={(nextPage) => { setPage(nextPage - 1); setSelectedRentals(new Set()) }}/> : null}
      </> : null}
    </section>
    </div></div>
    <MyPageMobileFilterSheet items={mobileSortItems} onClose={() => setMobileSortOpen(false)} onSelect={label => { const sort = mobileSortByLabel[label]; if (sort) updateFilters({ sort, sortDirection: sort === 'favoriteEdited' ? 'desc' : 'asc' }) }} open={!accessDenied && mobileSortOpen}/>
  </MyPageLayout>
}

function FavoritesGroupToolbar({ canManage, groups, onSelect, onSettings, selectedGroup, selectedGroupLabel, unclassifiedCount }: { canManage: boolean; groups: readonly SavedRcpcGroup[]; onSelect: (groupId: GroupSelection) => void; onSettings: () => void; selectedGroup: GroupSelection; selectedGroupLabel: string; unclassifiedCount: number | null }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set())
  const toolbarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !toolbarRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const choose = (groupId: GroupSelection) => {
    onSelect(groupId)
    setOpen(false)
  }
  const toggle = (groupId: number) => setCollapsed(current => {
    const next = new Set(current)
    if (next.has(groupId)) next.delete(groupId)
    else next.add(groupId)
    return next
  })
  const totalCount = groups.reduce((total, group) => total + groupFavoriteCount(group), unclassifiedCount ?? 0)

  return <div className="favorites-group-toolbar" ref={toolbarRef}>
    <h1>즐겨찾기 그룹</h1>
    <div className="favorites-group-toolbar__picker">
      <button aria-controls="favorites-group-menu" aria-expanded={open} aria-haspopup="true" className="favorites-group-toolbar__trigger" onClick={() => setOpen(current => !current)} type="button">{selectedGroupLabel}<img alt="" src={groupUnfoldIcon} /></button>
      {open ? <div aria-label="즐겨찾기 그룹 선택" className="favorites-group-menu" id="favorites-group-menu">
        <button aria-pressed={selectedGroup === 'all'} className="favorites-group-menu__root" onClick={() => choose('all')} type="button"><span>전체 ({totalCount})</span>{selectedGroup === 'all' ? <img alt="" className="favorites-group-menu__check" src={groupCheckIcon} /> : null}</button>
        {groups.map(group => <section className="favorites-group-menu__section" key={group.id}>
          <div className="favorites-group-menu__parent">
            <button aria-pressed={selectedGroup === group.id} onClick={() => choose(group.id)} type="button"><span>{group.name} ({groupFavoriteCount(group)})</span>{selectedGroup === group.id ? <img alt="" className="favorites-group-menu__check" src={groupCheckIcon} /> : null}</button>
            {group.children.length ? <button aria-label={`${group.name} 하위 그룹 ${collapsed.has(group.id) ? '펼치기' : '접기'}`} aria-expanded={!collapsed.has(group.id)} className={`favorites-group-menu__expand${collapsed.has(group.id) ? ' is-collapsed' : ''}`} onClick={() => toggle(group.id)} type="button"><img alt="" src={groupChevronUpIcon} /></button> : null}
          </div>
          {!collapsed.has(group.id) && group.children.length ? <div className="favorites-group-menu__children">{group.children.map(child => <button aria-pressed={selectedGroup === child.id} key={child.id} onClick={() => choose(child.id)} type="button"><span>{child.name} ({child.rcpcCount})</span>{selectedGroup === child.id ? <img alt="" className="favorites-group-menu__check" src={groupCheckIcon} /> : null}</button>)}</div> : null}
        </section>)}
        <button aria-pressed={selectedGroup === 'unclassified'} className="favorites-group-menu__root" onClick={() => choose('unclassified')} type="button"><span>미분류 ({unclassifiedCount ?? '-'})</span>{selectedGroup === 'unclassified' ? <img alt="" className="favorites-group-menu__check" src={groupCheckIcon} /> : null}</button>
      </div> : null}
    </div>
    {canManage ? <button className="favorites-group-toolbar__settings" onClick={onSettings} type="button">그룹 설정<img alt="" src={groupSettingsIcon} /></button> : null}
  </div>
}

function MobileFavoriteGroupPicker({ groups, isOpen, onClose, onSelect, selectedGroup, unclassifiedCount }: { groups: readonly SavedRcpcGroup[]; isOpen: boolean; onClose: () => void; onSelect: (groupId: GroupSelection) => void; selectedGroup: GroupSelection; unclassifiedCount: number | null }) {
  if (!isOpen) return null
  return <div className="favorites-mobile-picker-layer" role="presentation" onClick={onClose}>
    <section aria-label="즐겨찾기 그룹 선택" aria-modal="true" className="favorites-mobile-picker" role="dialog" onClick={event => event.stopPropagation()}>
      <span className="favorites-mobile-picker__handle" aria-hidden="true"/>
      <div className="favorites-mobile-picker__list">
        <section><button className={selectedGroup === 'all' ? 'is-selected' : undefined} onClick={() => onSelect('all')} type="button">전체<b>{groups.reduce((total, group) => total + groupFavoriteCount(group), unclassifiedCount ?? 0)}</b></button></section>
        {groups.map(group => <section key={group.id}><button className={selectedGroup === group.id ? 'is-selected' : undefined} onClick={() => onSelect(group.id)} type="button">{group.name}<b>{groupFavoriteCount(group)}</b></button>{group.children.length ? <div>{group.children.map(child => <button className={selectedGroup === child.id ? 'is-selected' : undefined} key={child.id} onClick={() => onSelect(child.id)} type="button">└ {child.name} ({child.rcpcCount})</button>)}</div> : null}</section>)}
        <section><button className={selectedGroup === 'unclassified' ? 'is-selected' : undefined} onClick={() => onSelect('unclassified')} type="button">미분류<b>{unclassifiedCount ?? '-'}</b></button></section>
      </div>
    </section>
  </div>
}

function FavoritesGroupManagementDialog({ editMode, groups, isOpen, mutations, onAdd, onBack, onChanged, onClose, onDeleted, onEdit, onSaved, unclassifiedCount }: {
  editMode: boolean
  groups: readonly SavedRcpcGroup[]
  isOpen: boolean
  mutations: RcpcMutations
  onAdd: () => void
  onBack: () => void
  onChanged: () => Promise<void>
  onClose: () => void
  onDeleted: (groupId: number) => void
  onEdit: () => void
  onSaved: () => void
  unclassifiedCount: number | null
}) {
  return <DialogLayer backdropClassName="modal-backdrop" dialogClassName="favorites-group-management" isOpen={isOpen} onClose={onClose} showTitle={false} title={editMode ? '그룹 편집' : '그룹 설정'}>
    <header className="favorites-group-management__header">
      {editMode ? <button aria-label="그룹 설정으로 돌아가기" onClick={onBack} type="button"><img alt="" src={backIcon}/></button> : null}
      <h2>{editMode ? '그룹 편집' : '그룹 설정'}</h2>
      <button aria-label="닫기" className="favorites-group-management__close" onClick={onClose} type="button"><img alt="" src={closeIcon}/></button>
    </header>
    <div className="favorites-group-management__list">
      {editMode ? <LiveGroupManager groups={groups} mutations={mutations} onChanged={onChanged} onDeleted={onDeleted} onSaved={onSaved} unclassifiedCount={unclassifiedCount}/>
        : <>
          {groups.map(group => <section className="favorites-group-management__section" key={group.id}>
            <div className="favorites-group-management__root"><strong>{group.name}</strong><b>{group.rcpcCount}</b></div>
            {group.children.map(child => <div className="favorites-group-management__child" key={child.id}><span>{child.name}</span><span>{child.rcpcCount}</span></div>)}
          </section>)}
          <div className="favorites-group-management__root"><strong>미분류</strong><b>{unclassifiedCount ?? '-'}</b></div>
        </>}
    </div>
    <p className="favorites-group-management__hint">즐겨찾기 그룹을 추가·수정·삭제할 수 있습니다. 삭제된 그룹의 RCPC는 미분류로 이동하며, 그룹은 복구할 수 없습니다.</p>
    {!editMode ? <footer className="favorites-group-management__actions"><button onClick={onEdit} type="button">편집</button><button onClick={onAdd} type="button">추가</button></footer> : null}
  </DialogLayer>
}

function LiveGroupManager({ groups, mutations, onChanged, onDeleted, onSaved, unclassifiedCount }: { groups: readonly SavedRcpcGroup[]; mutations: RcpcMutations; onChanged: () => Promise<void>; onDeleted: (groupId: number) => void; onSaved: () => void; unclassifiedCount: number | null }) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const baseGroups = flattenGroups(groups)
  const [drafts, setDrafts] = useState(() => baseGroups.map(group => ({ ...group })))
  useEffect(() => setDrafts(flattenGroups(groups).map(group => ({ ...group }))), [groups])
  const allGroups = drafts
  const changed = allGroups.filter(group => {
    const original = baseGroups.find(candidate => candidate.id === group.id)
    return !original || original.name !== group.name.trim() || original.displayOrder !== group.displayOrder
  })
  const moveGroup = (sourceId: number, targetId: number) => {
    setDrafts(current => {
      const source = current.find(group => group.id === sourceId)
      const target = current.find(group => group.id === targetId)
      if (!source || !target || source.id === target.id || source.parentGroupId !== target.parentGroupId) return current
      const siblings = current.filter(group => group.parentGroupId === source.parentGroupId)
      const from = siblings.findIndex(group => group.id === sourceId)
      const to = siblings.findIndex(group => group.id === targetId)
      const reordered = [...siblings]
      reordered.splice(to, 0, reordered.splice(from, 1)[0])
      return current.map(group => {
        const order = reordered.findIndex(sibling => sibling.id === group.id)
        return order < 0 ? group : { ...group, displayOrder: order }
      })
    })
  }
  const moveByKeyboard = (groupId: number, direction: number) => {
    const group = allGroups.find(candidate => candidate.id === groupId)
    if (!group) return
    const siblings = allGroups.filter(candidate => candidate.parentGroupId === group.parentGroupId).sort((left, right) => left.displayOrder - right.displayOrder)
    const index = siblings.findIndex(candidate => candidate.id === groupId)
    const target = siblings[index + direction]
    if (target) moveGroup(groupId, target.id)
  }
  const save = useMutation({ mutationFn: async () => {
    if (allGroups.some(group => group.name.trim().length < 1 || group.name.trim().length > 30)) throw new Error('그룹명은 1~30자로 입력해 주세요.')
    const results = await Promise.allSettled(changed.map(group => mutations.updateGroup(group.id, {
      name: group.name.trim(),
      displayOrder: group.displayOrder,
    })))
    if (results.some(result => result.status === 'rejected')) throw new Error('일부 그룹 설정을 저장하지 못했습니다. 목록을 새로 확인해 주세요.')
  }, onSuccess: async () => { await onChanged(); onSaved() } })
  const roots = [...allGroups.filter(group => group.parentGroupId === null)].sort((left, right) => left.displayOrder - right.displayOrder)
  return <form className="favorites-group-editor" id="favorite-groups-editor" onSubmit={(event) => { event.preventDefault(); if (!save.isPending) save.mutate() }}>
    {roots.flatMap(root => [root, ...allGroups.filter(group => group.parentGroupId === root.id).sort((left, right) => left.displayOrder - right.displayOrder)]).map(group => <LiveEditableGroupRow
      editing={editingId === group.id}
      group={group}
      key={group.id}
      mutations={mutations}
      onChanged={onChanged}
      onDeleted={onDeleted}
      onDragEnd={() => setDraggingId(null)}
      onDragStart={() => setDraggingId(group.id)}
      onDrop={() => { if (draggingId !== null) moveGroup(draggingId, group.id); setDraggingId(null) }}
      onEdit={() => setEditingId(group.id)}
      onMove={direction => moveByKeyboard(group.id, direction)}
      onNameChange={name => setDrafts(current => current.map(candidate => candidate.id === group.id ? { ...candidate, name } : candidate))}
      onStopEdit={() => setEditingId(null)}
      pending={save.isPending}
    />)}
    <div className="favorites-group-editor__unclassified"><span>미분류</span><small>{unclassifiedCount ?? '-'}</small></div>
    {save.error ? <p role="alert">{save.error.message}</p> : null}
    {changed.length ? <div className="favorites-group-editor__actions"><button disabled={save.isPending} type="submit">{save.isPending ? '저장 중' : '설정 저장'}</button></div> : null}
  </form>
}

function LiveEditableGroupRow({ editing, group, mutations, onChanged, onDeleted, onDragEnd, onDragStart, onDrop, onEdit, onMove, onNameChange, onStopEdit, pending }: { editing: boolean; group: SavedRcpcGroup; mutations: RcpcMutations; onChanged: () => Promise<void>; onDeleted: (groupId: number) => void; onDragEnd: () => void; onDragStart: () => void; onDrop: () => void; onEdit: () => void; onMove: (direction: number) => void; onNameChange: (name: string) => void; onStopEdit: () => void; pending: boolean }) {
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const remove = useMutation({ mutationFn: () => mutations.deleteGroup(group.id), onSuccess: async () => { onDeleted(group.id); await onChanged() } })
  return <div className={group.parentGroupId === null ? 'favorites-group-editor__row' : 'favorites-group-editor__row is-child'} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onDrop() }}>
    {editing ? <input aria-label={`${group.name} 그룹명`} autoFocus maxLength={30} onBlur={onStopEdit} onChange={event => onNameChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onStopEdit() } }} value={group.name}/>
      : <button className="favorites-group-editor__name" type="button" onDoubleClick={onEdit} onKeyDown={event => { if (event.key === 'Enter' || event.key === 'F2') onEdit() }}>{group.parentGroupId === null ? group.name : `└ ${group.name} ${group.rcpcCount}`}</button>}
    <small className="favorites-group-editor__count">{group.parentGroupId === null ? group.rcpcCount : null}</small>
    <button aria-label={`${group.name} 삭제`} className="favorites-group-editor__delete" disabled={remove.isPending || pending} onClick={() => setRemoveConfirmOpen(true)} type="button"><img alt="" src={deleteIcon}/></button>
    <button aria-label={`${group.name} 순서 변경`} className="favorites-group-editor__drag" draggable onDragEnd={onDragEnd} onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(group.id)); onDragStart() }} onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onMove(event.key === 'ArrowUp' ? -1 : 1) } }} type="button"><img alt="" src={dragIcon}/></button>
    <Modal isOpen={removeConfirmOpen} title="즐겨찾기 그룹을 삭제하시겠습니까?" closeLabel="취소" confirmLabel={remove.isPending ? '삭제 중…' : '삭제'} confirmDisabled={remove.isPending} onClose={() => { if (!remove.isPending) setRemoveConfirmOpen(false) }} onConfirm={() => remove.mutate()}><p>{group.parentGroupId ? `${group.name} 그룹을 삭제하고 RCPC를 상위 그룹으로 이동합니다.` : `${group.name}과 하위 그룹을 삭제하고 RCPC를 미분류로 이동합니다.`}</p></Modal>
    {mutationMessage(remove.error) ? <p role="alert">{mutationMessage(remove.error)}</p> : null}
  </div>
}




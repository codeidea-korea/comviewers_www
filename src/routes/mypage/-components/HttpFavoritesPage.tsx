import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { createCustomerRcpcMutations, SavedRcpcGroup } from '@/api/customerRcpcMutations'
import { ApiClientError } from '@/api/httpClient'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Pagination } from '@/components/ui/PaginationControl'
import { MyPageLayout } from '../MypageComponentsView'
import { AccountQueryState } from './AccountQueryState'
import { RcpcExtensionCheckout } from './RcpcExtensionCheckout'
import type { MyRcpcQuery } from '@/api/myRcpc'
import { Modal } from '@/components/ui/ModalControl'
import { FavoritesSettingsDialog, NewFavoritesGroupDialog, type FavoriteGroupOption } from './modals/FavoritesGroupDialogs'
import { endedRental, extensionBlocked, loadAuthorizedRcpcs } from './rcpcPresentation'
import { extensionTarget, HttpRcpcTable } from './HttpRcpcTable'
import { useSession } from '@/app/session/SessionProvider'
import { canManageFavorites, FavoritesManageOnly } from './favoritesAccess'

type RcpcMutations = ReturnType<typeof createCustomerRcpcMutations>
type GroupSelection = 'all' | 'unclassified' | number

const groupQueryKey = (organizationId: string) => ['my-rcpc-groups', organizationId] as const

function flattenGroups(groups: readonly SavedRcpcGroup[]): SavedRcpcGroup[] {
  return groups.flatMap((group) => [group, ...group.children])
}

function mutationMessage(error: Error | null): string | null {
  if (!error) return null
  if (error instanceof ApiClientError && error.code === 'RC002') return '그룹 단계 또는 생성 한도를 확인해 주세요. 상위 그룹은 최대 10개, 각 하위 그룹은 최대 20개, 전체는 최대 100개입니다.'
  if (error instanceof ApiClientError && error.code === 'RC001') return '즐겨찾기 상태가 변경되었습니다. 목록을 새로 확인해 주세요.'
  return error.message
}

export function HttpFavoritesPage({ api, mutations, settings = false }: { api: MyRcpcReadServices; mutations: RcpcMutations; settings?: boolean }) {
  const session = useSession()
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<GroupSelection>('all')
  const [selectedRentals, setSelectedRentals] = useState<ReadonlySet<number>>(() => new Set())
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<MyRcpcQuery>({ size: 20, sort: 'favoriteEdited' })
  const [creating, setCreating] = useState(false), [editing, setEditing] = useState(false), [assigning, setAssigning] = useState(false)
  const [mobileGroupOpen, setMobileGroupOpen] = useState(false)
  const available = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'favorite-options'], queryFn: ({ signal }) => loadAuthorizedRcpcs(api, signal) })
  const locations = [...new Set((available.data ?? []).map(item => item.serverRoomRegion).filter((value): value is string => !!value))].sort()
  const rooms = (available.data ?? []).filter(item => !filters.region || item.serverRoomRegion === filters.region).filter((item, index, all) => item.serverRoomId && all.findIndex(candidate => candidate.serverRoomId === item.serverRoomId) === index)
  const updateFilters = (next: MyRcpcQuery) => { setFilters(previous => ({ ...previous, ...next })); setPage(0); setSelectedRentals(new Set()) }
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
  const allGroups = flattenGroups(groups.data ?? [])
  const unclassifiedCount = available.data ? available.data.filter(item => item.preference.favorite && !item.preference.groupId).length : undefined
  const visualGroups: FavoriteGroupOption[] = [
    { id: 'unclassified', label: '미분류', parentId: null, count: unclassifiedCount },
    ...allGroups.map((group) => ({
      id: String(group.id),
      label: group.name,
      parentId: group.parentGroupId === null ? null : String(group.parentGroupId),
      count: group.parentGroupId === null ? group.rcpcCount + group.children.reduce((total, child) => total + child.rcpcCount, 0) : group.rcpcCount,
    })),
  ]
  const inquiryTargets = (rows.data?.items ?? []).filter(item => selectedRentals.has(item.rentalId) && !endedRental(item.rentalStatus)).slice(0, 20)
  const selectableItems = (rows.data?.items ?? []).filter(item => !extensionBlocked(item))
  const allSelected = selectableItems.length > 0 && selectableItems.every(item => selectedRentals.has(item.rentalId))
  const partiallySelected = selectedRentals.size > 0 && !allSelected
  const customerSession = session.status === 'authenticated' ? session.customerSession : null
  const canManage = canManageFavorites(customerSession?.memberRole)
  const owner = customerSession?.memberRole === 'owner'
  const canExtend = owner && customerSession?.commerceAvailable === true
  const selectedGroupLabel = selectedGroup === 'all'
    ? '전체'
    : selectedGroup === 'unclassified'
      ? '미분류'
      : allGroups.find(group => group.id === selectedGroup)?.name ?? '전체'
  useEffect(() => {
    setEditing(canManage && settings)
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

  return <MyPageLayout title="즐겨찾기">
    <AccountQueryState pending={groups.isPending || rows.isPending} error={groups.error ?? rows.error} retry={() => { void groups.refetch(); void rows.refetch() }} />
    {available.error ? <p role="alert">서버 위치·미분류 수량을 조회하지 못했습니다. <button type="button" onClick={() => void available.refetch()}>다시 시도</button></p> : null}
    <div className="favorites-page favorites-page--live">
    {groups.data && canManage && editing ? <section className="favorites-mobile-settings">
      <div className="favorites-mobile-settings__actions"><button form="favorite-groups-editor" type="submit">저장</button><button type="button" onClick={() => setCreating(true)}>추가</button></div>
      <div className="favorites-mobile-settings__tree">
        {groups.data.map(group => <section key={group.id}><strong>{group.name}<small>{group.rcpcCount + group.children.reduce((total, child) => total + child.rcpcCount, 0)}</small></strong>{group.children.map(child => <span className={selectedGroup === child.id ? 'is-active' : undefined} key={child.id}>{child.name}<small>{child.rcpcCount}</small></span>)}</section>)}
        <section><strong>미분류<small>{unclassifiedCount ?? '-'}</small></strong></section>
      </div>
      <p>즐겨찾기 그룹을 추가·수정·삭제할 수 있습니다. 삭제된 그룹에 있던 RCPC는 미분류로 이동합니다.</p>
    </section> : groups.data ? <div className="favorites-mobile-group-control"><strong>즐겨찾기 그룹</strong><span><button aria-expanded={mobileGroupOpen} aria-haspopup="dialog" onClick={() => setMobileGroupOpen(true)} type="button">{selectedGroupLabel}</button><button aria-label="즐겨찾기 그룹 설정" disabled={!canManage} onClick={() => setEditing(true)} type="button">설정</button></span></div> : null}
    {groups.data ? <MobileFavoriteGroupPicker groups={groups.data} isOpen={mobileGroupOpen} selectedGroup={selectedGroup} unclassifiedCount={unclassifiedCount ?? null} onClose={() => setMobileGroupOpen(false)} onSelect={(groupId) => { setSelectedGroup(groupId); setPage(0); setSelectedRentals(new Set()); setMobileGroupOpen(false) }}/> : null}
    {canManage ? <NewFavoritesGroupDialog error={mutationMessage(createGroup.error) ?? undefined} groups={visualGroups} isOpen={creating} onAdd={(name, parentId) => createGroup.mutate({ name, parentId })} onClose={() => { if (!createGroup.isPending) setCreating(false) }} pending={createGroup.isPending} /> : null}
    <div className="favorites-layout favorites-layout--live">
    {groups.data ? <aside className="favorites-groups favorites-live-groups">
      <div><strong>그룹</strong><FavoritesManageOnly allowed={canManage}><span>{editing
        ? <button form="favorite-groups-editor" type="submit">저장</button>
        : <Link onClick={() => setEditing(true)} to="/mypage/favorites/settings">편집</Link>}<button type="button" onClick={() => setCreating(true)}>추가</button></span></FavoritesManageOnly></div>
      <section aria-label="즐겨찾기 그룹 선택" className="favorites-groups__tree">
        {canManage && editing ? <LiveGroupManager groups={groups.data} mutations={mutations} onDeleted={(groupId) => { if (selectedGroup === groupId || groups.data?.find(group => group.id === groupId)?.children.some(child => child.id === selectedGroup)) setSelectedGroup('all') }} onChanged={refresh} onSaved={() => setEditing(false)} unclassifiedCount={unclassifiedCount ?? null}/>
          : <>{groups.data.map((group) => <div key={group.id}>
              <button aria-pressed={selectedGroup === group.id} onClick={() => { setSelectedGroup(group.id); setPage(0); setSelectedRentals(new Set()) }} type="button">{group.name} ({group.rcpcCount + group.children.reduce((total, child) => total + child.rcpcCount, 0)})</button>
              {group.children.map((child) => <button aria-pressed={selectedGroup === child.id} key={child.id} onClick={() => { setSelectedGroup(child.id); setPage(0); setSelectedRentals(new Set()) }} type="button">└ {child.name} ({child.rcpcCount})</button>)}
            </div>)}
            <button type="button" aria-pressed={selectedGroup === 'unclassified'} onClick={() => { setSelectedGroup('unclassified'); setPage(0); setSelectedRentals(new Set()) }}>미분류 ({available.data ? available.data.filter(item => item.preference.favorite && !item.preference.groupId).length : '-'})</button></>}
      </section>
    </aside> : null}
    {rows.data ? <section aria-label="즐겨찾기 RCPC 목록" className="favorites-results favorites-live-results" id="favorites-results">
      <header className="favorites-results__toolbar"><label><input aria-label="전체 RCPC 선택" type="checkbox" checked={allSelected} ref={element => { if (element) element.indeterminate = partiallySelected }} disabled={selectableItems.length === 0} onChange={event => setSelectedRentals(new Set(event.target.checked ? selectableItems.map(item => item.rentalId) : []))}/>모두선택</label><nav className="rcpc-list-bulk-actions"><FavoritesManageOnly allowed={canManage}><button type="button" disabled={assignment.isPending || selectedRentals.size === 0} onClick={() => setAssigning(true)}>그룹 변경</button></FavoritesManageOnly><Link aria-disabled={inquiryTargets.length === 0} className={inquiryTargets.length === 0 ? 'is-disabled' : ''} to={inquiryTargets.length ? `/mypage/inquiries?pcAssetIds=${inquiryTargets.map(item => item.pcAssetId).join(',')}` : '#'}>문의</Link>{canExtend ? inquiryTargets.length ? <RcpcExtensionCheckout key={inquiryTargets.map(item => item.rentalId).join(',')} api={api} rentalIds={inquiryTargets.map(item => item.rentalId)} displayTargets={inquiryTargets.map(extensionTarget)} triggerLabel="기간연장"/> : <button type="button" disabled>기간연장</button> : null}</nav></header>
      <div className="favorites-live-filters"><label>서버 위치<select value={filters.region ?? ''} onChange={event => updateFilters({ region: event.target.value || undefined, serverRoomId: undefined })}><option value="">전체</option>{locations.map(value => <option key={value}>{value}</option>)}</select></label><label>서버실<select value={filters.serverRoomId ?? ''} onChange={event => updateFilters({ serverRoomId: event.target.value ? Number(event.target.value) : undefined })}><option value="">전체</option>{rooms.map(item => <option key={item.serverRoomId} value={item.serverRoomId!}>{item.serverRoomName}</option>)}</select></label></div>
      {canManage ? <FavoritesSettingsDialog error={assignment.error?.message} groups={visualGroups} isOpen={assigning} onClose={() => { if (!assignment.isPending) setAssigning(false) }} onNewGroup={() => { setAssigning(false); setCreating(true) }} onSave={(id) => assignment.mutate(id === 'unclassified' ? null : Number(id))} pending={assignment.isPending} /> : null}
      {canManage && mutationMessage(assignment.error) ? <p role="alert">{mutationMessage(assignment.error)}</p> : null}
      <p className="rcpc-list-count">총 <b>{rows.data.totalElements}</b>개 상품</p>
      <HttpRcpcTable api={api} canEditAlias={owner} canExtend={canExtend} className="favorites-table" items={rows.data.items} selected={selectedRentals} onSelectedChange={setSelectedRentals} sort={filters.sort} onSort={sort => updateFilters({ sort })} emptyMessage="즐겨찾기로 등록된 RCPC가 없습니다." mutations={canManage ? mutations : undefined} mobileVariant="favorites"/>
      {rows.data.totalPages > 1 ? <Pagination currentPage={rows.data.page + 1} totalPages={rows.data.totalPages} onPageChange={(nextPage) => { setPage(nextPage - 1); setSelectedRentals(new Set()) }}/> : null}
    </section> : null}
    </div></div>
  </MyPageLayout>
}

function MobileFavoriteGroupPicker({ groups, isOpen, onClose, onSelect, selectedGroup, unclassifiedCount }: { groups: readonly SavedRcpcGroup[]; isOpen: boolean; onClose: () => void; onSelect: (groupId: GroupSelection) => void; selectedGroup: GroupSelection; unclassifiedCount: number | null }) {
  if (!isOpen) return null
  return <div className="favorites-mobile-picker-layer" role="presentation" onClick={onClose}>
    <section aria-label="즐겨찾기 그룹 선택" aria-modal="true" className="favorites-mobile-picker" role="dialog" onClick={event => event.stopPropagation()}>
      <span className="favorites-mobile-picker__handle" aria-hidden="true"/>
      <div className="favorites-mobile-picker__list">
        <section><button className={selectedGroup === 'all' ? 'is-selected' : undefined} onClick={() => onSelect('all')} type="button">전체<b>{groups.reduce((total, group) => total + group.rcpcCount + group.children.reduce((childTotal, child) => childTotal + child.rcpcCount, 0), unclassifiedCount ?? 0)}</b></button></section>
        {groups.map(group => <section key={group.id}><button className={selectedGroup === group.id ? 'is-selected' : undefined} onClick={() => onSelect(group.id)} type="button">{group.name}<b>{group.rcpcCount + group.children.reduce((total, child) => total + child.rcpcCount, 0)}</b></button>{group.children.length ? <div>{group.children.map(child => <button className={selectedGroup === child.id ? 'is-selected' : undefined} key={child.id} onClick={() => onSelect(child.id)} type="button">└ {child.name} ({child.rcpcCount})</button>)}</div> : null}</section>)}
        <section><button className={selectedGroup === 'unclassified' ? 'is-selected' : undefined} onClick={() => onSelect('unclassified')} type="button">미분류<b>{unclassifiedCount ?? '-'}</b></button></section>
      </div>
    </section>
  </div>
}

function LiveGroupManager({ groups, mutations, onChanged, onDeleted, onSaved, unclassifiedCount }: { groups: readonly SavedRcpcGroup[]; mutations: RcpcMutations; onChanged: () => Promise<void>; onDeleted: (groupId: number) => void; onSaved: () => void; unclassifiedCount: number | null }) {
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const baseGroups = flattenGroups(groups)
  const [drafts, setDrafts] = useState(() => baseGroups.map(group => ({ ...group })))
  useEffect(() => setDrafts(flattenGroups(groups).map(group => ({ ...group }))), [groups])
  const allGroups = drafts
  const stage = ({ sourceId, targetId }: { sourceId: number; targetId: number }) => {
    const source = allGroups.find((group) => group.id === sourceId)
    const target = allGroups.find((group) => group.id === targetId)
    if (!source || !target || source.parentGroupId !== target.parentGroupId) return
    const siblings = allGroups.filter((group) => group.parentGroupId === source.parentGroupId)
    const withoutSource = siblings.filter((group) => group.id !== sourceId)
    const targetIndex = withoutSource.findIndex((group) => group.id === targetId)
    const ordered = [...withoutSource.slice(0, targetIndex), source, ...withoutSource.slice(targetIndex)]
    let position = 0
    setDrafts(allGroups.map(group => group.parentGroupId === source.parentGroupId ? ordered[position++] : group))
  }
  const save = useMutation({ mutationFn: async () => {
    if (allGroups.some(group => group.name.trim().length < 1 || group.name.trim().length > 30)) throw new Error('그룹명은 1~30자로 입력해 주세요.')
    const changed = allGroups.filter(group => {
      const original = baseGroups.find(candidate => candidate.id === group.id)
      const displayOrder = allGroups.filter(candidate => candidate.parentGroupId === group.parentGroupId).findIndex(candidate => candidate.id === group.id)
      return !original || original.name !== group.name.trim() || original.displayOrder !== displayOrder
    })
    const results = await Promise.allSettled(changed.map(group => mutations.updateGroup(group.id, {
      name: group.name.trim(),
      displayOrder: allGroups.filter(candidate => candidate.parentGroupId === group.parentGroupId).findIndex(candidate => candidate.id === group.id),
    })))
    if (results.some(result => result.status === 'rejected')) throw new Error('일부 그룹 설정을 저장하지 못했습니다. 목록을 새로 확인해 주세요.')
  }, onSuccess: async () => { await onChanged(); onSaved() } })
  const roots = allGroups.filter(group => group.parentGroupId === null)
  return <form className="favorites-group-editor" id="favorite-groups-editor" onSubmit={(event) => { event.preventDefault(); if (!save.isPending) save.mutate() }}>
    {roots.flatMap(root => [root, ...allGroups.filter(group => group.parentGroupId === root.id)]).map(group => <LiveEditableGroupRow
      editing={editingId === group.id}
      group={group}
      key={group.id}
      mutations={mutations}
      onChanged={onChanged}
      onDeleted={onDeleted}
      onDragEnd={() => setDraggedId(null)}
      onDragStart={() => setDraggedId(group.id)}
      onDrop={() => { if (draggedId !== null && draggedId !== group.id && !save.isPending) stage({ sourceId: draggedId, targetId: group.id }); setDraggedId(null) }}
      onEdit={() => setEditingId(group.id)}
      onNameChange={name => setDrafts(current => current.map(candidate => candidate.id === group.id ? { ...candidate, name } : candidate))}
      onStopEdit={() => setEditingId(null)}
      pending={save.isPending}
    />)}
    <div className="favorites-group-editor__unclassified"><span>미분류</span><small>{unclassifiedCount ?? '-'}</small></div>
    <p>즐겨찾기 그룹을 추가·수정·삭제할 수 있습니다. 삭제된 그룹에 있던 RCPC는 미분류로 이동하며, 그룹은 복구할 수 없습니다.</p>
    {save.error ? <p role="alert">{save.error.message}</p> : null}
  </form>
}

function LiveEditableGroupRow({ editing, group, mutations, onChanged, onDeleted, onDragEnd, onDragStart, onDrop, onEdit, onNameChange, onStopEdit, pending }: { editing: boolean; group: SavedRcpcGroup; mutations: RcpcMutations; onChanged: () => Promise<void>; onDeleted: (groupId: number) => void; onDragEnd: () => void; onDragStart: () => void; onDrop: () => void; onEdit: () => void; onNameChange: (name: string) => void; onStopEdit: () => void; pending: boolean }) {
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const remove = useMutation({ mutationFn: () => mutations.deleteGroup(group.id), onSuccess: async () => { onDeleted(group.id); await onChanged() } })
  return <div className={group.parentGroupId === null ? 'favorites-group-editor__row' : 'favorites-group-editor__row is-child'} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onDrop() }}>
    {editing ? <input aria-label={`${group.name} 그룹명`} autoFocus maxLength={30} onBlur={onStopEdit} onChange={event => onNameChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onStopEdit() } }} value={group.name}/>
      : <button className="favorites-group-editor__name" type="button" onDoubleClick={onEdit} onKeyDown={event => { if (event.key === 'Enter' || event.key === 'F2') onEdit() }}>{group.parentGroupId === null ? group.name : `└ ${group.name}`}</button>}
    <button aria-label={`${group.name} 삭제`} className="favorites-group-editor__delete" disabled={remove.isPending || pending} onClick={() => setRemoveConfirmOpen(true)} type="button">×</button>
    <button aria-label={`${group.name} 순서 이동`} className="favorites-group-editor__drag" draggable={!pending} disabled={pending} onDragEnd={onDragEnd} onDragStart={onDragStart} type="button">⠿</button>
    <Modal isOpen={removeConfirmOpen} title="즐겨찾기 그룹을 삭제하시겠습니까?" closeLabel="취소" confirmLabel={remove.isPending ? '삭제 중…' : '삭제'} confirmDisabled={remove.isPending} onClose={() => { if (!remove.isPending) setRemoveConfirmOpen(false) }} onConfirm={() => remove.mutate()}><p>{group.parentGroupId ? `${group.name} 그룹을 삭제하고 RCPC를 상위 그룹으로 이동합니다.` : `${group.name}과 하위 그룹을 삭제하고 RCPC를 미분류로 이동합니다.`}</p></Modal>
    {mutationMessage(remove.error) ? <p role="alert">{mutationMessage(remove.error)}</p> : null}
  </div>
}




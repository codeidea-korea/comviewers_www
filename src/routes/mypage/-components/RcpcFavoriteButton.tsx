import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MyRcpcItem } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import starEmpty from '@/assets/figma/review-star-empty.svg'
import starFilled from '@/assets/figma/review-star-filled.svg'
import { FavoritesSettingsDialog, NewFavoritesGroupDialog, type FavoriteGroupOption } from './modals/FavoritesGroupDialogs'
import { favoriteUngroupedCountQuery } from './favoritesAccess'

export function RcpcFavoriteButton({ api, mutations, item, compact = false }: { api: MyRcpcReadServices; mutations: ReturnType<typeof createCustomerRcpcMutations>; item: MyRcpcItem; compact?: boolean }) {
  const [open, setOpen] = useState(false), [creating, setCreating] = useState(false)
  const cache = useQueryClient()
  const groups = useQuery({ queryKey: ['my-rcpc-groups', api.organizationId], queryFn: ({ signal }) => mutations.groups(signal), enabled: open })
  const unclassified = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'favorite-unclassified-count'], queryFn: ({ signal }) => api.list(favoriteUngroupedCountQuery, signal), enabled: open })
  const visualGroups: FavoriteGroupOption[] = [
    { id: 'unclassified', label: '미분류', parentId: null, count: unclassified.data?.totalElements },
    ...(groups.data ?? []).flatMap(root => [
      { id: String(root.id), label: root.name, parentId: null, count: root.rcpcCount + root.children.reduce((total, child) => total + child.rcpcCount, 0) },
      ...root.children.map(child => ({ id: String(child.id), label: child.name, parentId: String(root.id), count: child.rcpcCount })),
    ]),
  ]
  const save = useMutation({ mutationFn: (groupId: number | null) => mutations.favorite(item.rentalId, !item.preference.favorite, !item.preference.favorite ? groupId : null), onSuccess: async () => {
    setOpen(false); await Promise.all([cache.invalidateQueries({ queryKey: ['my-rcpcs', api.organizationId] }), cache.invalidateQueries({ queryKey: ['my-rcpc-groups', api.organizationId] })])
  } })
  const createGroup = useMutation({ mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) => mutations.createGroup({ name, parentGroupId: parentId ? Number(parentId) : null }), onSuccess: async () => { await groups.refetch(); setCreating(false); setOpen(true) } })
  const label = item.preference.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'
  return <><button aria-label={label} className={compact ? 'rcpc-live-favorite' : undefined} type="button" disabled={save.isPending} onClick={() => { save.reset(); if (item.preference.favorite) { save.mutate(null); return } setCreating(false); setOpen(true) }}>{compact ? <img alt="" src={item.preference.favorite ? starFilled : starEmpty}/> : label}</button>
    {!open && save.error ? <p role="alert">{save.error.message}</p> : null}
    <FavoritesSettingsDialog error={groups.error || unclassified.error ? '그룹을 조회하지 못했습니다.' : save.error?.message} groups={visualGroups} isOpen={open} onClose={() => { if (!save.isPending) setOpen(false) }} onNewGroup={() => { setOpen(false); setCreating(true) }} onSave={(id) => save.mutate(id === 'unclassified' ? null : Number(id))} pending={save.isPending || groups.isPending || unclassified.isPending} />
    <NewFavoritesGroupDialog error={createGroup.error?.message} groups={visualGroups} isOpen={creating} onAdd={(name, parentId) => createGroup.mutate({ name, parentId })} onClose={() => { if (!createGroup.isPending) { setCreating(false); setOpen(true) } }} pending={createGroup.isPending} />
  </>
}

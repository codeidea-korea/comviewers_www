import type { SavedRcpcGroup } from '@/api/customerRcpcMutations'

export function orderFavoriteGroups(groups: readonly SavedRcpcGroup[]): SavedRcpcGroup[] {
  return [...groups]
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id - right.id)
    .map(group => ({ ...group, children: orderFavoriteGroups(group.children) }))
}

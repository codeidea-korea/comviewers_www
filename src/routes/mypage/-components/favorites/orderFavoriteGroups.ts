import type { SavedRcpcGroup } from '@/api/customerRcpcMutations'

export function orderFavoriteGroups(groups: readonly SavedRcpcGroup[]): SavedRcpcGroup[] {
  // Group IDs are assigned sequentially when groups are created.
  return [...groups]
    .sort((left, right) => left.id - right.id)
    .map(group => ({ ...group, children: orderFavoriteGroups(group.children) }))
}

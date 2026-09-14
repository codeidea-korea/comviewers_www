import type { FavoriteGroup } from '@/domain/myAccount/services';
import { FavoritesManageOnly } from './favoritesAccess'

interface FavoriteGroupWithCount extends FavoriteGroup { count?: number }

export function FavoritesGroups({ canManage = true, groups, onEditGroups, onNewGroup, selected, setSelected }: { canManage?: boolean; groups: readonly FavoriteGroupWithCount[]; onEditGroups: () => void; onNewGroup: () => void; selected: string; setSelected: (id: string) => void }) {
  const count = (group: FavoriteGroupWithCount) => group.count === undefined ? '' : ` ${group.count}`
  return <aside className="favorites-groups"><div><strong>그룹</strong><FavoritesManageOnly allowed={canManage}><span><button onClick={onEditGroups} type="button">편집</button><button onClick={onNewGroup} type="button">추가</button></span></FavoritesManageOnly></div><div aria-label="즐겨찾기 그룹 선택" className="favorites-groups__tree" role="group">{groups.filter((group) => group.parentId === null).map((group) => <section key={group.id}><button aria-pressed={selected === group.id} className={selected === group.id ? 'is-active' : ''} onClick={() => setSelected(group.id)} type="button"><strong>{group.label}</strong>{count(group)}</button>{groups.filter((child) => child.parentId === group.id).map((child) => <button aria-pressed={selected === child.id} className={selected === child.id ? 'is-active' : ''} key={child.id} onClick={() => setSelected(child.id)} type="button">└ {child.label}{count(child)}</button>)}</section>)}</div></aside>
}

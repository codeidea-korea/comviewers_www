import type { FavoriteGroup } from '@/domain/myAccount/services'
import { useEffect, useState } from 'react'
import { DialogActions } from '../../../../components/ui/DialogActionsControl'
import { PopupLayer } from '../../../../components/ui/PopupLayerControl'
import { NativeSelect } from '../../../../components/ui/SelectControl'

export interface FavoriteGroupOption extends FavoriteGroup {
  count?: number
}

function optionLabel(group: FavoriteGroupOption) {
  const hierarchy = group.parentId === null || group.id === 'unclassified' ? '' : '└ '
  return `${hierarchy}${group.label}${group.count === undefined ? '' : ` (${group.count})`}`
}

export function FavoritesSettingsDialog({ error, groups, isOpen, onClose, onNewGroup, onSave, pending = false }: { error?: string; groups: readonly FavoriteGroupOption[]; isOpen: boolean; onClose: () => void; onNewGroup: () => void; onSave: (id: string) => void; pending?: boolean }) {
  const [selectedGroup, setSelectedGroup] = useState('unclassified')
  useEffect(() => { if (isOpen) setSelectedGroup('unclassified') }, [isOpen])
  return (
    <PopupLayer
      className="favorites-modal-layer"
      dialogClassName="favorites-group-dialog favorites-group-dialog--settings"
      isOpen={isOpen}
      onClose={onClose}
      title="즐겨찾기 설정"
    >
      <label>즐겨찾기 그룹<NativeSelect disabled={pending} onChange={(event) => setSelectedGroup(event.target.value)} value={selectedGroup}>{groups.map((group) => <option key={group.id} value={group.id}>{optionLabel(group)}</option>)}</NativeSelect></label>
      <button className="favorites-group-dialog__new" disabled={pending} onClick={onNewGroup} type="button">＋ 새 그룹 만들기</button>
      {error ? <p role="alert">{error}</p> : null}
      <DialogActions><button disabled={pending} onClick={onClose} type="button">취소</button><button disabled={pending} onClick={() => onSave(selectedGroup)} type="button">{pending ? '변경 중…' : '완료'}</button></DialogActions>
    </PopupLayer>
  )
}

export function NewFavoritesGroupDialog({ error, groups, initialName = '', isOpen, onAdd, onClose, pending = false }: { error?: string; groups: readonly FavoriteGroup[]; initialName?: string; isOpen: boolean; onAdd: (name: string, parentId: string | null) => void; onClose: () => void; pending?: boolean }) {
  const [name, setName] = useState(initialName)
  const [parentGroup, setParentGroup] = useState('')
  const isTooLong = name.length > 30
  const canAdd = name.trim().length > 0 && !isTooLong
  useEffect(() => { if (isOpen) { setName(initialName); setParentGroup('') } }, [initialName, isOpen])

  return (
    <PopupLayer
      className="favorites-modal-layer"
      dialogClassName={`favorites-group-dialog ${name ? 'favorites-group-dialog--filled' : 'favorites-group-dialog--empty'}`}
      isOpen={isOpen}
      onClose={onClose}
      title="새 즐겨찾기 그룹"
    >
      <label>상위그룹<NativeSelect disabled={pending} onChange={(event) => setParentGroup(event.target.value)} value={parentGroup}><option value="">없음</option>{groups.filter((group) => group.id !== 'unclassified' && group.parentId === null).map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</NativeSelect><small>* 상위그룹을 선택하지 않으면 이 그룹이 상위그룹으로 추가됩니다.</small></label>
      <label>
        그룹명
        <input disabled={pending} maxLength={31} onChange={(event) => setName(event.target.value)} placeholder="그룹명을 입력해 주세요." value={name} />
        {isTooLong ? <small className="is-error">* 그룹명은 최대 30자까지 입력할 수 있습니다.</small> : null}
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <DialogActions>
        <button disabled={pending} onClick={onClose} type="button">취소</button>
        <button disabled={!canAdd || pending} onClick={() => onAdd(name.trim(), parentGroup || null)} type="button">{pending ? '추가 중…' : '추가'}</button>
      </DialogActions>
    </PopupLayer>
  )
}

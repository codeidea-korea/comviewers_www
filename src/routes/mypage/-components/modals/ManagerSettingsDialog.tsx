import type { AccountManager } from '@/domain/myAccount/managerServices'
import { ManagerSurface as PopupLayer } from './ManagerSurface'
import closeIcon from '@/assets/figma/inquiry-modal-close.svg'

export function ManagerSettingsDialog({ managers, onClose, onEdit }: {
  managers: readonly AccountManager[]
  onClose: () => void
  onEdit: (id: string) => void
}) {
  return <PopupLayer className="manager-preview" dialogClassName="manager-modal manager-settings-dialog" isOpen onClose={onClose} showTitle={false} title="담당자 설정">
    <header><h2>담당자 설정</h2><button aria-label="닫기" onClick={onClose} type="button"><img alt="" src={closeIcon}/></button></header>
    <div className="manager-settings-dialog__list">
      {managers.map(manager => <button key={manager.id} onClick={() => onEdit(manager.id)} type="button"><strong>{manager.name} ({manager.assignedRcpcIds.length})</strong><span>{manager.loginId}</span></button>)}
      {!managers.length ? <p>등록된 담당자가 없습니다.</p> : null}
    </div>
  </PopupLayer>
}

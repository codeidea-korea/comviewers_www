import { isActiveManager } from '@/domain/myAccount/managerServices'
import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/ModalControl'
import { PopupLayer } from '@/components/ui/PopupLayerControl'
import { DialogActions } from '@/components/ui/DialogActionsControl'
import { ApiClientError } from '@/api/httpClient'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { ManagerCatalog } from './-components/ManagerCatalog'
import { ManagerEditorForm } from './-components/modals/ManagerEditorForm'
import { useManagers } from './-components/hooks/useManagers'

type ManagerDialog = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string } | { kind: 'assign' | 'unassign'; ids: string[] } | { kind: 'unavailable'; action: 'assign' | 'unassign' }
function ManagersContent() {
  const account = useManagers()
  const [dialog, setDialog] = useState<ManagerDialog>({ kind: 'closed' })
  const [openMenuRow, setOpenMenuRow] = useState<string | null>(null)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const { message: notice, setMessage: setNotice, toastKey } = useToastMessage()
  const [error, setError] = useState('')
  const confirming = useRef(false)
  const pending = account.save.isPending || account.assign.isPending || account.remove.isPending
  const managers = (account.data?.managers ?? []).filter(isActiveManager)
  const target = dialog.kind === 'edit' || dialog.kind === 'delete' ? managers.find((item) => item.id === dialog.id) : undefined
  const assignmentUnavailable = (ids: readonly string[]) => ids.some((id) => account.data?.rcpcs.find((item) => item.id === id)?.assignable === false)
  const assignmentUnavailableMessage = '이용 기간이 끝났거나 배정할 수 없는 RCPC가 포함되어 있습니다.'
  const close = () => { if (!pending) { setDialog({ kind: 'closed' }); setError('') } }
  function showAssignmentUnavailable(action: 'assign' | 'unassign') {
    setError('')
    setSelectedManagerId('')
    setOpenMenuRow(null)
    setDialog({ kind: 'unavailable', action })
  }
  function open(next: ManagerDialog) {
    if (pending) return
    if ((next.kind === 'assign' || next.kind === 'unassign') && assignmentUnavailable(next.ids)) {
      showAssignmentUnavailable(next.kind)
      return
    }
    setError('')
    setSelectedManagerId('')
    setOpenMenuRow(null)
    setDialog(next)
  }
  async function confirm() {
    if (pending || confirming.current) return
    if ((dialog.kind === 'assign' || dialog.kind === 'unassign') && assignmentUnavailable(dialog.ids)) {
      showAssignmentUnavailable(dialog.kind)
      return
    }
    const assignmentAction = dialog.kind === 'assign' || dialog.kind === 'unassign' ? dialog.kind : null
    confirming.current = true
    try {
      if (dialog.kind === 'delete') await account.remove.mutateAsync(dialog.id)
      else if (dialog.kind === 'assign' || dialog.kind === 'unassign') await account.assign.mutateAsync({ managerId: dialog.kind === 'assign' ? selectedManagerId : null, rcpcIds: dialog.ids })
      else return
      setNotice(dialog.kind === 'delete' ? '담당자를 삭제했습니다.' : dialog.kind === 'assign' ? '담당자를 배정했습니다.' : '선택한 RCPC의 담당자 배정을 해제했습니다.')
      setDialog({ kind: 'closed' })
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.code === 'C001' && assignmentAction) showAssignmentUnavailable(assignmentAction)
      else setError(cause instanceof Error ? cause.message : '변경하지 못했습니다.')
    } finally { confirming.current = false }
  }
  const assignmentTitle = dialog.kind === 'assign' && dialog.ids.some(id => {
    const rcpc = account.data?.rcpcs.find(item => item.id === id)
    return managers.some(manager => manager.assignedRcpcIds.includes(id) || (rcpc ? manager.assignedRcpcIds.includes(rcpc.rcpcId) : false))
  }) ? '담당자 변경' : '담당자 설정'
  return <>
    <ManagerCatalog onCreate={() => open({ kind: 'create' })} onEdit={(id) => open({ kind: 'edit', id })} onAssign={(ids) => open({ kind: 'assign', ids })} onUnassign={(ids) => open({ kind: 'unassign', ids })} onCloseMenu={() => setOpenMenuRow(null)} openMenuRow={openMenuRow} onToggleMenu={(id) => setOpenMenuRow((current) => current === id ? null : id)} />
    <Toast message={notice} toastKey={toastKey} />
    {(dialog.kind === 'create' || dialog.kind === 'edit') && <PopupLayer isOpen className="manager-preview manager-preview--create" dialogClassName="manager-modal manager-modal--register" onClose={close} showTitle={false} title={dialog.kind === 'create' ? '담당자 등록' : '담당자 수정'}>
      {dialog.kind === 'edit' && !target ? <p role="alert">담당자를 찾을 수 없습니다.</p> : <ManagerEditorForm key={target?.id ?? 'new'} manager={target} pending={pending} checkLogin={account.checkLogin} onClose={close} onDelete={target ? () => open({ kind: 'delete', id: target.id }) : undefined} onSave={async (draft) => { await account.save.mutateAsync({ id: target?.id, draft }); setNotice('담당자 정보를 저장했습니다.'); setDialog({ kind: 'closed' }) }} />}
    </PopupLayer>}
    {dialog.kind === 'assign' && <PopupLayer isOpen className="manager-preview manager-preview--edit" dialogClassName="manager-modal manager-modal--change" onClose={close} title={assignmentTitle} showTitle={false}>
      <h2>{assignmentTitle}</h2><strong>담당자 목록</strong><div>{managers.map((item) => <label className={selectedManagerId === item.id ? 'is-selected' : ''} key={item.id}><input type="radio" name="assignment-manager" value={item.id} checked={selectedManagerId === item.id} disabled={pending} onChange={() => setSelectedManagerId(item.id)} /><span><b>{item.name} ({item.assignedRcpcIds.length})</b><small>{item.loginId}</small></span></label>)}</div>
      {!managers.length && <p>등록된 담당자가 없습니다.</p>}{error && <p className="manager-modal__action-error" role="alert">{error}</p>}<DialogActions><button type="button" disabled={pending} onClick={close}>취소</button><button type="button" disabled={pending || !selectedManagerId || !dialog.ids.length} onClick={() => void confirm()}>완료</button></DialogActions>
    </PopupLayer>}
    <Modal isOpen={dialog.kind === 'unassign'} className="manager-confirm-modal" title="담당자 지정을 해제하시겠습니까?" closeLabel="취소" confirmLabel="해제하기" confirmDisabled={pending} onClose={close} onConfirm={() => void confirm()}>{error && <p role="alert">{error}</p>}</Modal>
    <Modal isOpen={dialog.kind === 'unavailable'} className="manager-confirm-modal" title={dialog.kind === 'unavailable' && dialog.action === 'unassign' ? '담당자 지정을 해제할 수 없습니다.' : '담당자를 설정할 수 없습니다.'} closeLabel="확인" closeVariant="primary" onClose={close}><p>{assignmentUnavailableMessage}</p></Modal>
    <Modal isOpen={dialog.kind === 'delete'} className="manager-confirm-modal" title="담당자를 삭제하시겠습니까?" closeLabel="취소" confirmLabel="삭제하기" confirmDisabled={pending || !target} onClose={close} onConfirm={() => void confirm()}>{error && <p role="alert">{error}</p>}</Modal>
  </>
}

export function ManagersPage() {
  return <ManagersContent/>
}

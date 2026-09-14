import { isActiveManager } from '@/domain/myAccount/managerServices'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Modal } from '@/components/ui/ModalControl'
import { PopupLayer } from '@/components/ui/PopupLayerControl'
import { DialogActions } from '@/components/ui/DialogActionsControl'
import { usePublishingPopupPreview } from '@/lib/usePublishingPopupPreview'
import { ManagerCatalog } from './-components/ManagerCatalog'
import { ManagerEditorForm } from './-components/modals/ManagerEditorForm'
import { useManagers } from './-components/hooks/useManagers'

type ManagerDialog = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string } | { kind: 'assign' | 'unassign'; ids: string[] }
function LocalManagersPage() {
  const account = useManagers()
  const location = useLocation()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<ManagerDialog>({ kind: 'closed' })
  const [openMenuRow, setOpenMenuRow] = useState<string | null>(null)
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const confirming = useRef(false)
  const pending = account.save.isPending || account.assign.isPending || account.remove.isPending
  const managers = (account.data?.managers ?? []).filter(isActiveManager)
  const target = dialog.kind === 'edit' || dialog.kind === 'delete' ? managers.find((item) => item.id === dialog.id) : undefined
  const close = () => { if (!pending) { setDialog({ kind: 'closed' }); setError('') } }
  function open(next: ManagerDialog) { if (pending) return; setError(''); setSelectedManagerId(''); setOpenMenuRow(null); setDialog(next) }
  useEffect(() => {
    if (location.state?.publishingPopup !== 'manager-create') return
    setDialog({ kind: 'create' })
    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])
  usePublishingPopupPreview({
    '담당자 등록': () => open({ kind: 'create' }),
    '담당자 변경': () => open({ kind: 'assign', ids: account.data?.rcpcs.slice(0, 1).map((item) => item.id) ?? [] }),
    '담당자를 삭제하시겠습니까?': () => managers[0] ? open({ kind: 'delete', id: managers[0].id }) : false,
  })
  async function confirm() {
    if (pending || confirming.current) return
    confirming.current = true
    try {
      if (dialog.kind === 'delete') await account.remove.mutateAsync(dialog.id)
      else if (dialog.kind === 'assign' || dialog.kind === 'unassign') await account.assign.mutateAsync({ managerId: dialog.kind === 'assign' ? selectedManagerId : null, rcpcIds: dialog.ids })
      else return
      setNotice(dialog.kind === 'delete' ? '담당자를 삭제했습니다.' : dialog.kind === 'assign' ? '담당자를 배정했습니다.' : '선택한 RCPC의 담당자 배정을 해제했습니다.')
      setDialog({ kind: 'closed' })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '변경하지 못했습니다.') } finally { confirming.current = false }
  }
  const assignmentTitle = dialog.kind === 'assign' && dialog.ids.some(id => {
    const rcpc = account.data?.rcpcs.find(item => item.id === id)
    return managers.some(manager => manager.assignedRcpcIds.includes(id) || (rcpc ? manager.assignedRcpcIds.includes(rcpc.rcpcId) : false))
  }) ? '담당자 변경' : '담당자 설정'
  return <>
    <ManagerCatalog notice={notice} onCreate={() => open({ kind: 'create' })} onEdit={(id) => open({ kind: 'edit', id })} onAssign={(ids) => open({ kind: 'assign', ids })} onUnassign={(ids) => open({ kind: 'unassign', ids })} openMenuRow={openMenuRow} onToggleMenu={(id) => setOpenMenuRow((current) => current === id ? null : id)} />
    {(dialog.kind === 'create' || dialog.kind === 'edit') && <PopupLayer isOpen className="manager-preview manager-preview--create" dialogClassName="manager-modal manager-modal--register" onClose={close} showTitle={false} title={dialog.kind === 'create' ? '담당자 등록' : '담당자 수정'}>
      {dialog.kind === 'edit' && !target ? <p role="alert">담당자를 찾을 수 없습니다.</p> : <ManagerEditorForm key={target?.id ?? 'new'} manager={target} pending={pending} checkLogin={account.checkLogin} onClose={close} onDelete={target ? () => open({ kind: 'delete', id: target.id }) : undefined} onSave={async (draft) => { await account.save.mutateAsync({ id: target?.id, draft }); setNotice('담당자 정보를 저장했습니다.'); setDialog({ kind: 'closed' }) }} />}
    </PopupLayer>}
    {dialog.kind === 'assign' && <PopupLayer isOpen className="manager-preview manager-preview--edit" dialogClassName="manager-modal manager-modal--change" onClose={close} title={assignmentTitle} showTitle={false}>
      <h2>{assignmentTitle}</h2><strong>담당자 목록</strong><div>{managers.map((item) => <label className={selectedManagerId === item.id ? 'is-selected' : ''} key={item.id}><input type="radio" name="assignment-manager" value={item.id} checked={selectedManagerId === item.id} disabled={pending} onChange={() => setSelectedManagerId(item.id)} /><span><b>{item.assignedRcpcIds.length} {item.name}</b><small>{item.loginId}</small></span></label>)}</div>
      {!managers.length && <p>등록된 담당자가 없습니다.</p>}{error && <p role="alert">{error}</p>}<DialogActions><button type="button" disabled={pending} onClick={close}>취소</button><button type="button" disabled={pending || !selectedManagerId || !dialog.ids.length} onClick={() => void confirm()}>완료</button></DialogActions>
    </PopupLayer>}
    <Modal isOpen={dialog.kind === 'unassign'} title="담당자 지정을 해제하시겠습니까?" closeLabel="취소" confirmLabel="해제하기" confirmDisabled={pending} onClose={close} onConfirm={() => void confirm()}>{error && <p role="alert">{error}</p>}</Modal>
    <Modal isOpen={dialog.kind === 'delete'} title="담당자를 삭제하시겠습니까?" closeLabel="취소" confirmLabel="삭제하기" confirmDisabled={pending || !target} onClose={close} onConfirm={() => void confirm()}>{error && <p role="alert">{error}</p>}</Modal>
  </>
}

export function ManagersPage() {
  return <LocalManagersPage/>
}

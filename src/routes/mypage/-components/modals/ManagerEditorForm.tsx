import { useRef, useState, type FormEvent } from 'react'
import { managerInputSchema, type AccountManager, type ManagerInput } from '@/domain/myAccount/managerServices'
import { DialogActions } from '@/components/ui/DialogActionsControl'
import { ManagerField } from './ManagerForms'
import { Button } from '@/components/ui/ButtonControl'
export function ManagerEditorForm({ manager, pending, onSave, onClose, onDelete, checkLogin }: {
  manager?: AccountManager; pending: boolean; onSave: (draft: ManagerInput) => Promise<void>; onClose: () => void; onDelete?: () => void; checkLogin: (loginId: string) => Promise<boolean>
}) {
  const [draft, setDraft] = useState({ name: manager?.name ?? '', loginId: manager?.loginId ?? '', password: '', memo: manager?.memo ?? '' })
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ name: false, loginId: false, password: false, memo: false })
  const [loginError, setLoginError] = useState('')
  const [checkedId, setCheckedId] = useState('')
  const [checking, setChecking] = useState(false)
  const revision = useRef(0)
  const saving = useRef(false)
  async function check() {
    setTouched(current => ({ ...current, loginId: true }))
    const parsed = managerInputSchema.shape.loginId.safeParse(draft.loginId)
    if (!parsed.success) { setLoginError(parsed.error.issues[0].message); return }
    const expected = revision.current; setChecking(true)
    try { const available = await checkLogin(parsed.data); if (expected === revision.current) { setCheckedId(available ? parsed.data : ''); setLoginError(available ? '' : '이미 사용 중인 아이디입니다.') } }
    catch { if (expected === revision.current) setLoginError('아이디를 확인하지 못했습니다.') }
    finally { setChecking(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current || pending) return
    setTouched({ name: true, loginId: true, password: true, memo: true })
    if (!manager && checkedId !== draft.loginId.trim()) { setLoginError('아이디 중복확인을 먼저 완료해 주세요.'); return }
    const parsed = managerInputSchema.safeParse({ ...draft, password: draft.password || undefined })
    if (!parsed.success) return
    saving.current = true
    try { await onSave(parsed.data) } catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.') } finally { saving.current = false }
  }
  const nameResult = managerInputSchema.shape.name.safeParse(draft.name)
  const loginIdResult = managerInputSchema.shape.loginId.safeParse(draft.loginId)
  const passwordResult = managerInputSchema.shape.password.safeParse(draft.password || undefined)
  const nameFieldError = touched.name && !nameResult.success ? nameResult.error.issues[0]?.message : undefined
  const loginIdFieldError = loginError || (touched.loginId && !loginIdResult.success ? loginIdResult.error.issues[0]?.message : undefined)
  const passwordFieldError = touched.password
    ? !manager && !draft.password ? '비밀번호를 입력해 주세요.' : !passwordResult.success ? passwordResult.error.issues[0]?.message : undefined
    : undefined
  return <form autoComplete="off" onSubmit={(event) => void submit(event)}><h2>{manager ? '담당자 정보' : '담당자 등록'}</h2>
    <fieldset disabled={pending} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <ManagerField autoComplete="off" error={nameFieldError} name="manager-display-name" label="담당자명" value={draft.name} onChange={(event) => { setTouched(current => ({ ...current, name: true })); setDraft((current) => ({ ...current, name: event.target.value })) }} />
      {manager ? <label className="manager-modal__field">아이디<input aria-label="아이디" autoComplete="off" name="manager-login-id" readOnly value={draft.loginId} /></label> : <ManagerField autoComplete="off" error={loginIdFieldError} name="manager-login-id" label="아이디" action={checking ? '확인 중' : checkedId && checkedId === draft.loginId.trim() ? '중복 없음' : '중복확인'} onAction={() => { if (!checking) void check() }} value={draft.loginId} onChange={(event) => { revision.current += 1; setCheckedId(''); setLoginError(''); setTouched(current => ({ ...current, loginId: true })); setDraft((current) => ({ ...current, loginId: event.target.value })) }} />}
      <ManagerField autoComplete="new-password" error={passwordFieldError} name="manager-new-password" label={manager ? '새 비밀번호' : '비밀번호'} showRequired={!manager} type="password" help={manager ? '변경할 때만 입력해 주세요.' : undefined} value={draft.password} onChange={(event) => { setTouched(current => ({ ...current, password: true })); setDraft((current) => ({ ...current, password: event.target.value })) }} />
      <label className="manager-modal__memo"><span>담당자 메모</span><textarea aria-label="담당자 메모" maxLength={500} placeholder="부서, 역할 등 관리용 메모" value={draft.memo} onChange={(event) => setDraft((current) => ({ ...current, memo: event.target.value }))} /></label>
      {error && <p role="alert">{error}</p>}
      {manager && onDelete ? <Button className="manager-modal__delete" size="large" variant="secondary" onClick={onDelete}>담당자 삭제</Button> : null}
      <DialogActions><Button size="large" variant="secondary" onClick={onClose}>{manager ? '닫기' : '취소'}</Button><Button disabled={pending} size="large" type="submit">{pending ? '저장 중' : manager ? '수정' : '담당자 등록'}</Button></DialogActions>
    </fieldset>
  </form>
}

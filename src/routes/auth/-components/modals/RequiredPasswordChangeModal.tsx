import { useRef, useState } from 'react'
import { useAuthentication } from '@/app/session/AuthProvider'
import { ApiClientError } from '@/api/httpClient'
import { Modal } from '@/components/ui/ModalControl'
import { PasswordField } from '../../AuthComponentsView'
import { passwordSchema } from '../profileValidation'

type Props = {
  username: string
  currentPassword: string
  onClose: () => void
  onComplete: () => void
}

export function RequiredPasswordChangeModal({ username, currentPassword, onClose, onComplete }: Props) {
  const auth = useAuthentication()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [touched, setTouched] = useState(false)
  const [confirmationTouched, setConfirmationTouched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const parsed = passwordSchema.safeParse(password)
  const passwordError = !parsed.success ? parsed.error.issues[0]?.message
    : password === currentPassword ? '임시 비밀번호와 다른 비밀번호를 입력해 주세요.' : undefined
  const confirmationError = !confirmation ? '비밀번호 확인을 입력해 주세요.'
    : password !== confirmation ? '비밀번호가 일치하지 않습니다.' : undefined

  async function submit() {
    if (locked.current) return
    setTouched(true); setConfirmationTouched(true)
    if (passwordError || confirmationError) return
    locked.current = true; setBusy(true); setError('')
    try {
      await auth.changeRequiredPassword({ username, currentPassword, newPassword: password })
      setPassword(''); setConfirmation('')
      onComplete()
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.code === 'A006') {
        setError('임시 비밀번호와 다른 비밀번호를 입력해 주세요. 8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해야 합니다.')
      } else if (failure instanceof ApiClientError && (failure.status === 401 || failure.code === 'A001')) {
        setError('로그인 정보를 다시 확인해야 합니다. 팝업을 닫고 다시 로그인해 주세요.')
      } else if (failure instanceof ApiClientError && ['network', 'contract'].includes(failure.kind)) {
        setError('변경 결과를 확인하지 못했습니다. 팝업을 닫고 새 비밀번호로 로그인을 시도해 주세요.')
      } else setError(failure instanceof Error ? failure.message : '비밀번호를 변경하지 못했습니다.')
    } finally { locked.current = false; setBusy(false) }
  }

  return <Modal className="modal--wide modal--password-reset modal--required-password-change" isOpen title="비밀번호 재설정"
    closeLabel="취소" onClose={() => { if (!locked.current) { setPassword(''); setConfirmation(''); onClose() } }}
    confirmLabel={busy ? '변경 중…' : '변경 후 로그인'} confirmDisabled={busy} onConfirm={() => { void submit() }}>
    <p>관리자가 생성한 계정입니다. 최초 로그인 시 사용할 비밀번호를 새로 설정해 주세요.</p>
    <form className="popup-form popup-form--stacked" noValidate onSubmit={event => { event.preventDefault(); void submit() }}
      onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault() }}>
      <PasswordField autoComplete="new-password" label="새 비밀번호" maxLength={16} required disabled={busy}
        helperText="8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해 주세요."
        error={touched ? passwordError : undefined} value={password}
        onChange={event => { setTouched(true); setPassword(event.target.value); setError('') }} />
      <PasswordField autoComplete="new-password" label="비밀번호 확인" maxLength={16} required disabled={busy}
        error={confirmationTouched ? confirmationError : undefined} value={confirmation}
        onChange={event => { setConfirmationTouched(true); setConfirmation(event.target.value); setError('') }} />
      <button type="submit" hidden disabled={busy}>변경 후 로그인</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  </Modal>
}

import type { ChangeEventHandler,ReactNode } from 'react'
import { TextField } from '../../../../components/ui/TextFieldControl'

export function ManagerField({ action, autoComplete = 'off', help, label, name, onAction = () => {}, onChange, onTrailingAction = () => {}, placeholder, showRequired=true, trailingIcon, type='text', value }: { action?: string; autoComplete?: string; help?: string; label: ReactNode; name?: string; onAction?: () => void; onChange?: ChangeEventHandler<HTMLInputElement>; onTrailingAction?: () => void; placeholder?: string; showRequired?: boolean; trailingIcon?: string; type?: string; value?: string }) {
  const passwordVisible = type !== 'password'
  return <TextField appearance="underline" autoComplete={autoComplete} className="manager-modal__field" helperText={help?.replace(/^\*\s*/, '')} label={<>{showRequired ? <b>*</b> : null}{label}</>} labelAction={action ? <button onClick={onAction} type="button">{action}</button> : null} name={name} onChange={onChange} placeholder={placeholder} trailingContent={trailingIcon ? <button aria-label={passwordVisible ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={passwordVisible} className="manager-modal__field-icon-button" onClick={onTrailingAction} type="button"><img alt="" src={trailingIcon} /></button> : null} type={type} value={value} />
}

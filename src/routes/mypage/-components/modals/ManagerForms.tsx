import { useUiTranslation } from '@/i18n/uiTranslation'
import type { ChangeEventHandler,ReactNode } from 'react'
import { TextField } from '../../../../components/ui/TextFieldControl'

export function ManagerField({ action, autoComplete = 'off', disabled = false, error, help, label, name, onAction = () => {}, onChange, onTrailingAction = () => {}, placeholder, showRequired=true, trailingIcon, type='text', value }: { action?: string; autoComplete?: string; disabled?: boolean; error?: string; help?: string; label: ReactNode; name?: string; onAction?: () => void; onChange?: ChangeEventHandler<HTMLInputElement>; onTrailingAction?: () => void; placeholder?: string; showRequired?: boolean; trailingIcon?: string; type?: string; value?: string }) {
  const { uiText } = useUiTranslation()
  const passwordVisible = type !== 'password'
  return <TextField appearance="underline" autoComplete={autoComplete} className={`manager-modal__field${action ? ' manager-modal__field--with-action' : ''}`} disabled={disabled} error={uiText(error)} helperText={uiText(help?.replace(/^\*\s*/, ''))} label={<>{showRequired ? <b>*</b> : null}{typeof label === "string" ? uiText(label) : label}</>} labelAction={action ? <button className="manager-modal__check-id" onClick={onAction} type="button">{uiText(action)}</button> : undefined} name={name} onChange={onChange} placeholder={uiText(placeholder)} trailingContent={trailingIcon ? <button aria-label={passwordVisible ? uiText("비밀번호 숨기기") : uiText("비밀번호 보기")} aria-pressed={passwordVisible} className="manager-modal__field-icon-button" onClick={onTrailingAction} type="button"><img alt="" src={trailingIcon} /></button> : null} type={type} value={value} />
}

import { useUiTranslation } from '@/i18n/uiTranslation'
import { NativeSelect } from '@/components/ui/SelectControl'
import { Button } from '@/components/ui/ButtonControl'
import type { ColocationServerRoom } from '@/domain/colocation/draftRepository'
import { messengerOptionLabel, messengerOptions } from '@/lib/formOptions'
import closeIcon from '@/assets/figma/product-list-close.svg'
import addIcon from '@/assets/figma/icon-add.svg'
import { colocationRoomFieldName } from './colocationInput'
import './colocation-server-rooms.css'

type Room = ColocationServerRoom & { id: string }
interface Props {
  rooms: readonly Room[]
  pending: boolean
  validationIssue: { field: string; message: string } | null
  onAdd: () => void
  onRemove: (id: string) => void
  onChange: (id: string, field: keyof ColocationServerRoom, value: string) => void
}

export function ColocationServerRooms({ rooms, pending, validationIssue, onAdd, onRemove, onChange }: Props) {
  const { uiText, t } = useUiTranslation()
  return (
    <fieldset className="colocation-server-rooms" disabled={pending}>
      <legend>{uiText("서버실 정보")}</legend>
      <div className="colocation-server-rooms__list">
        {rooms.map((room, index) => {
          const name = (field: keyof ColocationServerRoom) => colocationRoomFieldName(room.id, index, field)
          const issue = (field: keyof ColocationServerRoom) => validationIssue?.field === name(field) ? validationIssue.message : undefined
          const roomNameId = `colocation-room-${room.id}-name`
          const messengerId = `colocation-room-${room.id}-messenger`
          const roomNameIssue = issue('requestedServerRoomName')
          const messengerIssue = issue('messengerType') ?? issue('messengerId')
          return (
            <div className="colocation-grid colocation-server-room" key={room.id}>
              <label className={roomNameIssue ? 'has-error' : undefined} htmlFor={roomNameId}>
                <span><b>*</b>{uiText("서버실명")}</span>
                <input aria-describedby={roomNameIssue ? `${roomNameId}-error` : undefined} aria-invalid={Boolean(roomNameIssue)} id={roomNameId} maxLength={150} name={name('requestedServerRoomName')} onChange={event => onChange(room.id, 'requestedServerRoomName', event.target.value)} placeholder={uiText("서버실명 입력")} required value={room.requestedServerRoomName} />
                {roomNameIssue ? <small className="colocation-field-error" id={`${roomNameId}-error`} role="alert">{uiText(roomNameIssue)}</small> : null}
              </label>
              <label className={messengerIssue ? 'has-error' : undefined} htmlFor={messengerId}>
                <span><b>*</b>{uiText("상담 메신저")}</span>
                <div className="messenger-control">
                  <NativeSelect aria-describedby={messengerIssue ? `${messengerId}-error` : undefined} aria-invalid={Boolean(issue('messengerType'))} aria-label={uiText("상담 메신저 선택")} id={messengerId} name={name('messengerType')} onChange={event => onChange(room.id, 'messengerType', event.target.value)} required value={room.messengerType}>
                    <option value="">{uiText("메신저 선택")}</option>
                    {messengerOptions.map(option => <option key={option} value={option}>{uiText(messengerOptionLabel(option))}</option>)}
                  </NativeSelect>
                  <input aria-describedby={messengerIssue ? `${messengerId}-error` : undefined} aria-invalid={Boolean(issue('messengerId'))} aria-label={uiText("상담 메신저 아이디")} maxLength={100} name={name('messengerId')} onChange={event => onChange(room.id, 'messengerId', event.target.value)} placeholder={uiText("ID 입력")} required value={room.messengerId} />
                </div>
                {messengerIssue ? <small className="colocation-field-error" id={`${messengerId}-error`} role="alert">{uiText(messengerIssue)}</small> : null}
              </label>
              {index > 0 ? <button aria-label={t('forms.removeRoom', { index: index + 1 })} className="colocation-server-room__remove" onClick={() => onRemove(room.id)} type="button"><img alt="" height={14} src={closeIcon} width={14} /></button> : null}
            </div>
          )
        })}
        <Button className="colocation-server-rooms__add" disabled={pending} onClick={onAdd} variant="secondary"><span>{uiText("서버실 추가")}</span><img alt="" src={addIcon} /></Button>
      </div>
    </fieldset>
  )
}

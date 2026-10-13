import { TextField } from '@/components/ui/TextFieldControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import { Button } from '@/components/ui/ButtonControl'
import type { ColocationServerRoom } from '@/domain/colocation/draftRepository'
import { messengerOptionLabel, messengerOptions } from '@/lib/formOptions'
import closeIcon from '@/assets/figma/product-list-close.svg'
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
  return (
    <fieldset className="colocation-server-rooms" disabled={pending}>
      <legend>서버실 정보</legend>
      <div className="colocation-server-rooms__list">
        {rooms.map((room, index) => {
          const name = (field: keyof ColocationServerRoom) => colocationRoomFieldName(room.id, index, field)
          const issue = (field: keyof ColocationServerRoom) => validationIssue?.field === name(field) ? validationIssue.message : undefined
          const roomNameId = `colocation-room-${room.id}-name`
          const messengerId = `colocation-room-${room.id}-messenger`
          const messengerIssue = issue('messengerType') ?? issue('messengerId')
          return (
            <div className="colocation-server-room" key={room.id}>
              <div className="colocation-server-room__row">
                <label className="colocation-server-room__label" htmlFor={roomNameId}><b>*</b>서버실명</label>
                <TextField appearance="box" aria-label="서버실명" error={issue('requestedServerRoomName')} id={roomNameId} maxLength={150} name={name('requestedServerRoomName')} onChange={event => onChange(room.id, 'requestedServerRoomName', event.target.value)} placeholder="서버실명 입력" required value={room.requestedServerRoomName} />
              </div>
              <div className="colocation-server-room__row colocation-server-room__row--messenger">
                <label className="colocation-server-room__label" htmlFor={messengerId}><b>*</b>상담 메신저</label>
                <div>
                  <div className="colocation-server-room__messenger">
                    <NativeSelect aria-describedby={messengerIssue ? `${messengerId}-error` : undefined} aria-invalid={Boolean(issue('messengerType'))} aria-label="상담 메신저 선택" id={messengerId} name={name('messengerType')} onChange={event => onChange(room.id, 'messengerType', event.target.value)} required value={room.messengerType}>
                      <option value="">메신저 선택</option>
                      {messengerOptions.map(option => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}
                    </NativeSelect>
                    <TextField appearance="box" aria-describedby={messengerIssue ? `${messengerId}-error` : undefined} aria-invalid={Boolean(issue('messengerId'))} aria-label="상담 메신저 아이디" maxLength={100} name={name('messengerId')} onChange={event => onChange(room.id, 'messengerId', event.target.value)} placeholder="ID 입력" required value={room.messengerId} />
                  </div>
                  {messengerIssue ? <small className="colocation-field-error" id={`${messengerId}-error`} role="alert">* {messengerIssue}</small> : null}
                </div>
              </div>
              {index > 0 ? <button aria-label={`${index + 1}번째 서버실 삭제`} className="colocation-server-room__remove" onClick={() => onRemove(room.id)} type="button"><img alt="" height={14} src={closeIcon} width={14} /></button> : null}
            </div>
          )
        })}
        <Button className="colocation-server-rooms__add" disabled={pending} onClick={onAdd} variant="secondary">+ 서버실 추가</Button>
      </div>
    </fieldset>
  )
}

import type { ReactNode, RefObject } from 'react'
import { useState } from 'react'
import { DialogActions } from '../ui/DialogActionsControl'
import { Modal } from '../ui/ModalControl'
import { PopupLayer } from '../ui/PopupLayerControl'

export interface RcpcDialogTarget {
  rcpcId: string | number
  location?: string
  os?: string
  cpu?: string
  ram?: string
  disk?: string
  gpu?: string
}

interface RcpcSurfaceProps {
  onClose: () => void
  rcpc: RcpcDialogTarget
  returnFocusRef?: RefObject<HTMLElement | null>
}

export interface RcpcExtensionSurfaceProps extends RcpcSurfaceProps {
  action?: ReactNode
  busy?: boolean
  dateValue?: string
  error?: string
  extensionMode: string
  itemCount?: number
  onDateChange?: (value: string) => void
  onModeChange: (mode: string) => void
  onPeriodChange?: (value: string) => void
  periodValue?: string
  rows?: readonly RcpcExtensionDisplayRow[]
  targets?: readonly RcpcDialogTarget[]
  totalAmount?: string
}

export interface RcpcExtensionDisplayRow {
  currentEnd: string
  key: string | number
  monthlyFee: string
  nextEnd: string
  payment: string
  period: string
  product: string
  warning?: boolean
}

export interface RcpcAliasSurfaceProps extends RcpcSurfaceProps {
  alias: string
  confirmDisabled?: boolean
  error?: string
  onAliasChange: (alias: string) => void
  onConfirm?: () => void
}

export interface RcpcSurfaceSwitchProps extends Omit<RcpcSurfaceProps, 'rcpc'> {
  activePopup?: string | null
  rcpc?: Partial<RcpcDialogTarget> | null
}

export interface RcpcRebootSurfaceProps extends Omit<RcpcSurfaceProps, 'rcpc'> {
  confirmDisabled?: boolean
  confirmLabel?: string
  isOpen: boolean
  rcpc?: Partial<RcpcDialogTarget> | null
  onConfirm?: () => void
}

const extensionHeaders = ['상품', '연장 기간', '현재 종료일', '연장 후 종료일', '월 렌탈비', '결제 예정금액']

export function RcpcExtensionSurface({ action, busy = false, dateValue = '', error, extensionMode, itemCount, onClose, onDateChange, onModeChange, onPeriodChange, periodValue = '30', rcpc, rows, targets, totalAmount = '견적 미조회', returnFocusRef }: RcpcExtensionSurfaceProps) {
  const products = targets?.length ? targets : [rcpc]
  const displayRows: readonly RcpcExtensionDisplayRow[] = rows?.length ? rows : products.map((target) => ({ key: target.rcpcId, product: String(target.rcpcId), period: '—', currentEnd: '—', nextEnd: '—', monthlyFee: '—', payment: '—' }))
  return (
    <PopupLayer className="rcpc-popup-layer rcpc-popup-layer--extension" dialogClassName="rcpc-extension-dialog" initialFocus="dialog" isOpen onClose={onClose} returnFocusRef={returnFocusRef} title="기간 연장">
      <div aria-busy={busy} className="rcpc-extension-dialog__scroll">
        <h3>선택 품목</h3>
        <div className="rcpc-extension-dialog__products">{products.map((target) => <article key={target.rcpcId}><strong>품번 {target.rcpcId}{target.location ? ` · ${target.location}` : ''}</strong><p>{[target.os, target.cpu, target.ram, target.disk, target.gpu].filter(Boolean).join(' / ') || '사양 정보가 없습니다.'}</p></article>)}</div>
        <h3>연장 방식 선택</h3>
        <div className="rcpc-extension-dialog__modes">
          <div className="rcpc-extension-dialog__mode-row"><label><input checked={extensionMode === 'period'} disabled={busy} name="extension-mode" onChange={() => onModeChange('period')} type="radio" /><span><strong>기간 선택</strong><small>선택한 기간 만큼 연장됩니다.</small></span></label><fieldset aria-label="연장 기간" disabled={busy}><legend className="sr-only">연장 기간</legend><div className="rcpc-extension-dialog__periods">{[['30', '1개월'], ['60', '2개월'], ['90', '3개월']].map(([value, label]) => <button aria-pressed={periodValue === value} key={value} onClick={() => { onModeChange('period'); onPeriodChange?.(value) }} type="button">{label}</button>)}</div></fieldset></div>
          <div className="rcpc-extension-dialog__mode-row"><label><input checked={extensionMode === 'date'} disabled={busy} name="extension-mode" onChange={() => onModeChange('date')} type="radio" /><span><strong>종료일 지정</strong><small>선택한 날짜로 모든 RCPC의 종료일을 통일합니다.</small></span></label><input aria-label="연장 종료일" disabled={busy} onChange={(event) => { onModeChange('date'); onDateChange?.(event.target.value) }} type="date" value={dateValue} /></div>
        </div>
        <p className="rcpc-extension-dialog__help">ㆍ선택한 방식에 따라 각 RCPC의 연장 기간이 계산됩니다.<br />ㆍ연장 시에는 렌탈비만 추가되며, 상품별 결제 예정금액은 다를 수 있습니다.</p>
        {busy ? <p role="status">연장 견적을 확인하고 있습니다.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        <div className="rcpc-extension-results-scroll" tabIndex={0}>
          <div className="rcpc-extension-results">
            <div className="rcpc-extension-results__header">{extensionHeaders.map((header) => <span key={header}>{header}</span>)}</div>
            {displayRows.map((row) => <div className={row.warning ? 'is-warning' : undefined} key={row.key}>{[row.product, row.period, row.currentEnd, row.nextEnd, row.monthlyFee, row.payment].map((value, index) => <span key={index}>{value}</span>)}</div>)}
          </div>
        </div>
        <div className="rcpc-extension-total"><small>총 결제 상품 <b>{itemCount ?? displayRows.length}개</b></small><strong>총 결제 금액 <b>{totalAmount}</b></strong></div>
      </div>
      <DialogActions><button onClick={onClose} type="button">취소</button>{action ?? <button disabled type="button">연장 결제하기</button>}</DialogActions>
    </PopupLayer>
  )
}

export function RcpcSpecSurface({ onClose, rcpc, returnFocusRef }: RcpcSurfaceProps) {
  return <PopupLayer className="rcpc-popup-layer rcpc-popup-layer--single" dialogClassName="rcpc-spec-dialog" isOpen onClose={onClose} returnFocusRef={returnFocusRef} title="PC 사양 보기"><dl><div><dt>서버실</dt><dd>{rcpc.location || '정보 없음'}</dd></div><div><dt>품번</dt><dd>{rcpc.rcpcId}</dd></div><div><dt>OS</dt><dd>{rcpc.os || '정보 없음'}</dd></div><div><dt>CPU</dt><dd>{rcpc.cpu || '정보 없음'}</dd></div><div><dt>RAM</dt><dd><mark>{rcpc.ram || '정보 없음'}</mark></dd></div><div><dt>DISK</dt><dd><mark>{rcpc.disk || '정보 없음'}</mark></dd></div><div><dt>GPU</dt><dd><mark>{rcpc.gpu || '정보 없음'}</mark></dd></div></dl><button onClick={onClose} type="button">닫기</button></PopupLayer>
}

export function RcpcAliasSurface({ alias, confirmDisabled = false, error, onAliasChange, onClose, onConfirm, rcpc, returnFocusRef }: RcpcAliasSurfaceProps) {
  return <PopupLayer className="rcpc-popup-layer rcpc-popup-layer--single" dialogClassName="rcpc-alias-dialog" isOpen onClose={onClose} returnFocusRef={returnFocusRef} title="RCPC 별명 설정"><strong>품번 {rcpc.rcpcId}</strong><input aria-label="RCPC 별명" disabled={confirmDisabled} maxLength={20} onChange={event => onAliasChange(event.target.value)} placeholder="RCPC 별명을 입력해 주세요." value={alias} /><small>* 입력하지 않고 저장하면 별명이 미설정됩니다.</small>{error ? <p role="alert">{error}</p> : null}<DialogActions><button disabled={confirmDisabled} onClick={onClose} type="button">취소</button><button disabled={confirmDisabled || !onConfirm} onClick={onConfirm} type="button">저장</button></DialogActions></PopupLayer>
}

export function RcpcSurfaceSwitch({ activePopup, onClose, rcpc, returnFocusRef }: RcpcSurfaceSwitchProps) {
  const [alias, setAlias] = useState('')
  const [extensionMode, setExtensionMode] = useState('period')
  if (!activePopup || !rcpc || rcpc.rcpcId === undefined) return null
  const target: RcpcDialogTarget = { ...rcpc, rcpcId: rcpc.rcpcId }
  if (activePopup === 'spec') return <RcpcSpecSurface onClose={onClose} rcpc={target} returnFocusRef={returnFocusRef} />
  if (activePopup === 'alias') return <RcpcAliasSurface alias={alias} onAliasChange={setAlias} onClose={onClose} rcpc={target} returnFocusRef={returnFocusRef} />
  if (activePopup !== 'extension') return null
  return <RcpcExtensionSurface extensionMode={extensionMode} onClose={onClose} onModeChange={setExtensionMode} rcpc={target} returnFocusRef={returnFocusRef} />
}

export function RcpcRebootSurface({ confirmDisabled = false, confirmLabel = '재부팅', isOpen, onClose, onConfirm = () => {}, rcpc, returnFocusRef }: RcpcRebootSurfaceProps) {
  return <Modal closeLabel="취소" confirmDisabled={confirmDisabled} confirmLabel={confirmLabel} isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} returnFocusRef={returnFocusRef} title="RCPC 를 재부팅하시겠습니까?"><div className="popup-copy"><strong>품번 {rcpc?.rcpcId}</strong><p>재부팅하면 현재 <u>실행 중인 프로그램이 종료</u>되며,<br />저장하지 않은 작업이 손실될 수 있습니다.</p><small>* 재부팅 명령 전송 후에는 취소할 수 없습니다.</small></div></Modal>
}

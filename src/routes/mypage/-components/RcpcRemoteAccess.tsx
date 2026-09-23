import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { useEffect, useRef, useState } from 'react'
import anydeskIcon from '@/assets/figma/icon-connect-anydesk.svg'
import teamviewerIcon from '@/assets/figma/icon-connect-teamviewer.svg'
import copyIcon from '@/assets/figma/icon-content-copy.svg'
import eyeIcon from '@/assets/figma/scrap-eye.svg'
import type { MyRcpcDetail, MyRcpcItem, RemoteAccessType } from '@/api/myRcpc'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { ApiClientError } from '@/api/httpClient'
import { TooltipText } from '@/components/ui/TooltipControl'

type Revealed = Awaited<ReturnType<MyRcpcReadServices['reveal']>>

type RemoteAccessItem = MyRcpcItem | MyRcpcDetail
type RemoteAction = 'reveal' | 'remote_id' | 'password'

function remoteAccessErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.kind === 'authentication') return '로그인 상태를 확인한 뒤 다시 시도해 주세요.'
    if (error.status === 403) return '원격정보가 등록되지 않았거나 조회 권한이 없습니다. 이용 기간과 접근 권한을 확인해 주세요.'
    if (error.status === 400 || error.status === 404 || error.status === 409) return '원격 접속정보를 확인할 수 없습니다. 장치의 등록 상태를 확인해 주세요.'
    if (error.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
    if (error.kind === 'network') return '서버에 연결하지 못했습니다. 네트워크 연결을 확인해 주세요.'
  }
  if (error instanceof Error && error.message === 'expired') return '이용 기간이 종료되어 접속정보를 조회할 수 없습니다.'
  if (error instanceof Error && error.message === 'unavailable') return '원격 비밀번호가 등록되지 않았습니다.'
  return '원격 접속정보 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.'
}

export function RcpcRemoteAccess({ api, item, compact = false, autoRevealId = false }: { api: MyRcpcReadServices; item: RemoteAccessItem; compact?: boolean; autoRevealId?: boolean }) {
  const anyDeskId = item.remoteSupport?.anyDeskMaskedId ?? null
  const teamViewerId = item.remoteSupport?.teamViewerMaskedId ?? null
  return <section className={compact ? 'rcpc-remote-access rcpc-remote-access--compact' : 'rcpc-remote-access'}>{!compact && <h3>원격 접속 정보</h3>}
    <RemoteProvider key={`${item.rentalId}:anydesk`} api={api} item={item} accessType="anydesk" maskedId={anyDeskId} passwordConfigured={item.remoteSupport?.anyDeskPasswordConfigured ?? false} compact={compact} autoRevealId={autoRevealId}/>
    <RemoteProvider key={`${item.rentalId}:teamviewer`} api={api} item={item} accessType="teamviewer" maskedId={teamViewerId} passwordConfigured={item.remoteSupport?.teamViewerPasswordConfigured ?? false} compact={compact} autoRevealId={autoRevealId}/>
  </section>
}

function RemoteProvider({ api, item, accessType, maskedId, passwordConfigured, compact, autoRevealId }: { api: MyRcpcReadServices; item: RemoteAccessItem; accessType: RemoteAccessType; maskedId: string | null; passwordConfigured: boolean; compact: boolean; autoRevealId: boolean }) {
  // Credentials never enter Query/mutation caches, storage, URLs, or logs.
  const [revealed, setRevealed] = useState<Revealed | null>(null)
  const [visibleId, setVisibleId] = useState<string | null>(null)
  const [busy, setBusy] = useState<Partial<Record<RemoteAction, boolean>>>({})
  const { message, setMessage, toastKey } = useToastMessage()
  const activeRequests = useRef<Partial<Record<RemoteAction, AbortController>>>({})
  useEffect(() => () => {
    Object.values(activeRequests.current).forEach(controller => controller?.abort())
    activeRequests.current = {}
  }, [])
  useEffect(() => {
    if (!compact || !autoRevealId || !maskedId) return
    let controller: AbortController | null = null
    let timer: number | null = null
    const hide = () => {
      controller?.abort()
      if (timer !== null) window.clearTimeout(timer)
      setVisibleId(null)
    }
    controller = new AbortController()
    const request = controller
    void api.identifier(item.rentalId, accessType, request.signal).then(result => {
      if (request.signal.aborted) return
      const visibleFor = Math.min(Date.parse(result.serviceEndsAt) - Date.now(), 30_000)
      if (visibleFor <= 0) return
      setVisibleId(result.remoteId)
      timer = window.setTimeout(() => setVisibleId(null), visibleFor)
    }).catch(() => { /* Keep the masked ID when disclosure is denied. */ })
    window.addEventListener('blur', hide)
    return () => {
      controller?.abort()
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('blur', hide)
    }
  }, [api, item.rentalId, accessType, maskedId, compact, autoRevealId])
  useEffect(() => {
    const hide = () => {
      Object.values(activeRequests.current).forEach(controller => controller?.abort())
      activeRequests.current = {}
      setRevealed(null)
      setBusy({})
    }
    window.addEventListener('blur', hide)
    const itemEnd = 'serviceEndsAt' in item ? item.serviceEndsAt : null
    const expiresAt = revealed?.serviceEndsAt ? Date.parse(revealed.serviceEndsAt) : itemEnd ? Date.parse(itemEnd) : Date.now() + 30_000
    const timeout = window.setTimeout(hide, Math.min(Math.max(expiresAt - Date.now(), 0), 2_147_483_647))
    return () => { window.clearTimeout(timeout); window.removeEventListener('blur', hide) }
  }, [item, revealed?.serviceEndsAt])
  const access = async (field?: 'remote_id' | 'password') => {
    const action: RemoteAction = field ?? 'reveal'
    if (activeRequests.current[action]) return
    const controller = new AbortController()
    activeRequests.current = { ...activeRequests.current, [action]: controller }
    setBusy(previous => ({ ...previous, [action]: true }))
    setMessage('')
    let copying = false
    try {
      if (field === 'remote_id') {
        const identifier = await api.identifier(item.rentalId, accessType, controller.signal)
        controller.signal.throwIfAborted()
        if (Date.parse(identifier.serviceEndsAt) <= Date.now()) throw new Error('expired')
        await api.copy(item.rentalId, accessType, field, controller.signal)
        controller.signal.throwIfAborted()
        copying = true
        await navigator.clipboard.writeText(identifier.remoteId)
        controller.signal.throwIfAborted()
        setMessage('ID가 복사되었습니다.')
        return
      }
      const value = await api.reveal(item.rentalId, accessType, controller.signal)
      controller.signal.throwIfAborted()
      if (Date.parse(value.serviceEndsAt) <= Date.now()) throw new Error('expired')
      if (field) {
        const text = value.password
        if (!text) throw new Error('unavailable')
        await api.copy(item.rentalId, accessType, field, controller.signal)
        controller.signal.throwIfAborted()
        copying = true
        await navigator.clipboard.writeText(text)
        controller.signal.throwIfAborted()
        setMessage('비밀번호가 복사되었습니다.')
      } else setRevealed(value)
    } catch (error) {
      if (!controller.signal.aborted) setMessage(copying ? '복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.' : remoteAccessErrorMessage(error))
    } finally {
      if (activeRequests.current[action] === controller) {
        activeRequests.current = { ...activeRequests.current, [action]: undefined }
        setBusy(previous => ({ ...previous, [action]: false }))
      }
    }
  }
  const providerName = accessType === 'anydesk' ? 'AnyDesk' : 'TeamViewer'
  const displayedId = revealed?.remoteId ?? visibleId ?? maskedId?.replace(/./g, '*') ?? '-'
  const displayedPassword = passwordConfigured ? revealed?.password ?? '********' : '미등록'
  const providerHeading = <h4 className="rcpc-remote-provider__heading"><img alt="" src={accessType === 'anydesk' ? anydeskIcon : teamviewerIcon}/>{providerName}</h4>
  if (!maskedId && !passwordConfigured) return <article className={compact ? 'rcpc-remote-provider--compact' : undefined}>{providerHeading}<p className="rcpc-remote-provider__empty">원격정보 없음</p></article>
  if (compact) return <article className="rcpc-remote-provider--compact">{providerHeading}
    <div className="rcpc-remote-provider__credentials">
      <div className="rcpc-remote-provider__line"><TooltipText text={`ID ${displayedId}`} tooltipText={displayedId} enabled={Boolean(revealed?.remoteId ?? visibleId)}/><button aria-label={`${providerName} ID 복사`} aria-busy={Boolean(busy.remote_id)} disabled={busy.remote_id || !maskedId} type="button" onClick={() => void access('remote_id')}><img alt="" src={copyIcon}/></button></div>
      <div className="rcpc-remote-provider__line"><TooltipText text={`PW ${displayedPassword}`} tooltipText={displayedPassword} enabled={passwordConfigured && Boolean(revealed?.password)}/><span className="rcpc-remote-provider__actions"><button aria-label={`${providerName} 비밀번호 ${revealed ? '숨기기' : '보기'}`} aria-pressed={Boolean(revealed)} aria-busy={Boolean(busy.reveal)} disabled={busy.reveal || !maskedId || !passwordConfigured} type="button" onClick={() => { if (revealed) setRevealed(null); else void access() }}><img alt="" src={eyeIcon}/></button><button aria-label={`${providerName} 비밀번호 복사`} aria-busy={Boolean(busy.password)} disabled={busy.password || !maskedId || !passwordConfigured} type="button" onClick={() => void access('password')}><img alt="" src={copyIcon}/></button></span></div>
    </div>
    {message ? <Toast message={message} toastKey={toastKey}/> : null}
  </article>
  return <article>{providerHeading}
    <p>ID: {maskedId ? displayedId : '등록되지 않음'}</p><p>비밀번호: {passwordConfigured ? revealed ? revealed.password ?? '등록되지 않음' : '••••••••' : '등록되지 않음'}</p>
    <button aria-busy={Boolean(busy.reveal)} disabled={busy.reveal || !maskedId || !passwordConfigured} type="button" onClick={() => { if (revealed) setRevealed(null); else void access() }}>{revealed ? '숨기기' : '보기'}</button>
    <button aria-busy={Boolean(busy.remote_id)} disabled={busy.remote_id || !maskedId} type="button" onClick={() => void access('remote_id')}>ID 복사</button>
    <button aria-busy={Boolean(busy.password)} disabled={busy.password || !maskedId || !passwordConfigured} type="button" onClick={() => void access('password')}>비밀번호 복사</button>
    {message ? <Toast message={message} toastKey={toastKey}/> : null}
  </article>
}

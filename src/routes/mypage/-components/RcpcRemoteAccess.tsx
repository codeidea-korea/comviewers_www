import { useEffect, useRef, useState } from 'react'
import anydeskIcon from '@/assets/figma/icon-connect-anydesk.svg'
import teamviewerIcon from '@/assets/figma/icon-connect-teamviewer.svg'
import copyIcon from '@/assets/figma/icon-content-copy.svg'
import eyeIcon from '@/assets/figma/scrap-eye.svg'
import type { MyRcpcDetail, MyRcpcItem, RemoteAccessType } from '@/api/myRcpc'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'

type Revealed = Awaited<ReturnType<MyRcpcReadServices['reveal']>>

type RemoteAccessItem = MyRcpcItem | MyRcpcDetail

export function RcpcRemoteAccess({ api, item, compact = false }: { api: MyRcpcReadServices; item: RemoteAccessItem; compact?: boolean }) {
  return <section className={compact ? 'rcpc-remote-access rcpc-remote-access--compact' : 'rcpc-remote-access'}>{!compact && <h3>원격 접속 정보</h3>}
    <RemoteProvider key={`${item.rentalId}:anydesk`} api={api} item={item} accessType="anydesk" maskedId={item.remoteSupport?.anyDeskMaskedId ?? null} compact={compact}/>
    {item.remoteSupport?.teamViewerMaskedId ? <RemoteProvider key={`${item.rentalId}:teamviewer`} api={api} item={item} accessType="teamviewer" maskedId={item.remoteSupport.teamViewerMaskedId} compact={compact}/> : null}
    {compact && !item.remoteSupport ? <span>등록되지 않음</span> : null}
  </section>
}

function RemoteProvider({ api, item, accessType, maskedId, compact }: { api: MyRcpcReadServices; item: RemoteAccessItem; accessType: RemoteAccessType; maskedId: string | null; compact: boolean }) {
  // Credentials never enter Query/mutation caches, storage, URLs, or logs.
  const [revealed, setRevealed] = useState<Revealed | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const activeRequest = useRef<AbortController | null>(null)
  useEffect(() => () => activeRequest.current?.abort(), [])
  useEffect(() => {
    const hide = () => { activeRequest.current?.abort(); setRevealed(null); setBusy(false) }
    window.addEventListener('blur', hide)
    const itemEnd = 'serviceEndsAt' in item ? item.serviceEndsAt : null
    const expiresAt = revealed?.serviceEndsAt ? Date.parse(revealed.serviceEndsAt) : itemEnd ? Date.parse(itemEnd) : Date.now() + 30_000
    const timeout = window.setTimeout(hide, Math.min(Math.max(expiresAt - Date.now(), 0), 2_147_483_647))
    return () => { window.clearTimeout(timeout); window.removeEventListener('blur', hide) }
  }, [item, revealed?.serviceEndsAt])
  const access = async (field?: 'remote_id' | 'password') => {
    if (busy) return
    const controller = new AbortController()
    activeRequest.current = controller
    setBusy(true); setMessage(''); setRevealed(null)
    try {
      const value = await api.reveal(item.rentalId, accessType, controller.signal)
      if (Date.parse(value.serviceEndsAt) <= Date.now()) throw new Error('expired')
      if (field) {
        const text = field === 'remote_id' ? value.remoteId : value.password
        if (!text) throw new Error('unavailable')
        await api.copy(item.rentalId, accessType, field, controller.signal)
        controller.signal.throwIfAborted()
        await navigator.clipboard.writeText(text)
        controller.signal.throwIfAborted()
        setMessage('복사되었습니다.')
      } else setRevealed(value)
    } catch {
      if (!controller.signal.aborted) setMessage('접속 정보를 처리하지 못했습니다. 이용 기간, 접근 권한과 클립보드 권한을 확인해 주세요.')
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }
  const providerName = accessType === 'anydesk' ? 'AnyDesk' : 'TeamViewer'
  if (compact) return <article className="rcpc-remote-provider--compact"><h4><img alt="" src={accessType === 'anydesk' ? anydeskIcon : teamviewerIcon}/>{providerName}</h4>
    <p><span>ID {revealed?.remoteId ?? maskedId ?? '-'}</span><button aria-label={`${providerName} ID 복사`} disabled={busy || !maskedId} type="button" onClick={() => void access('remote_id')}><img alt="" src={copyIcon}/></button></p>
    <p><span>PW {revealed?.password ?? '********'}</span><button aria-label={`${providerName} 비밀번호 ${revealed ? '숨기기' : '보기'}`} aria-pressed={Boolean(revealed)} disabled={busy || !maskedId} type="button" onClick={() => { if (revealed) setRevealed(null); else void access() }}><img alt="" src={eyeIcon}/></button><button aria-label={`${providerName} 비밀번호 복사`} disabled={busy || !maskedId} type="button" onClick={() => void access('password')}><img alt="" src={copyIcon}/></button></p>
    {message ? <p className="rcpc-copy-toast" role="status">{message}</p> : null}
  </article>
  return <article><h4>{providerName}</h4>
    <p>ID: {revealed?.remoteId ?? maskedId ?? '등록되지 않음'}</p><p>비밀번호: {revealed ? revealed.password ?? '등록되지 않음' : '••••••••'}</p>
    <button disabled={busy || !maskedId} type="button" onClick={() => { if (revealed) setRevealed(null); else void access() }}>{revealed ? '숨기기' : '보기'}</button>
    <button disabled={busy || !maskedId} type="button" onClick={() => void access('remote_id')}>ID 복사</button>
    <button disabled={busy || !maskedId} type="button" onClick={() => void access('password')}>비밀번호 복사</button>
    {message ? <p role="status">{message}</p> : null}
  </article>
}

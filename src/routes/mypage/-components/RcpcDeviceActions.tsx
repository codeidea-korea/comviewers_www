import { useUiTranslation } from '@/i18n/uiTranslation'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MyRcpcItem } from '@/api/myRcpc'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { RcpcRebootSurface } from '@/components/mypage/RcpcDialogsControl'
import webIcon from '@/assets/figma/icon-connect-web.svg'
import { Button } from '@/components/ui/ButtonControl'
import { ApiClientError } from '@/api/httpClient'
import { TooltipText } from '@/components/ui/TooltipControl'
import { rentalOperationalStatus, rentalServiceAccessible } from './rcpcPresentation'
import { useVisibleConnection } from './rcpc/useVisibleConnection'

function wanIpErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.kind === 'authentication') return "로그인 상태를 확인한 뒤 다시 시도해 주세요."
    if (error.status === 403) return "WAN IP를 조회할 수 없습니다. 이용 기간·장치 등록 상태·접근 권한을 확인해 주세요."
    if (error.status === 400 || error.status === 404) return "WAN IP 정보를 확인할 수 없습니다. 장치의 IP 등록 상태를 확인해 주세요."
    if (error.status === 429) return "요청이 많습니다. 잠시 후 다시 시도해 주세요."
    if (error.kind === 'network') return "서버에 연결하지 못했습니다. 네트워크 연결을 확인해 주세요."
  }
  return "WAN IP 조회에 실패했습니다. 잠시 후 다시 시도해 주세요."
}

export function RcpcReboot({ api, item }: { api: MyRcpcReadServices; item: MyRcpcItem }) {
  const { uiText } = useUiTranslation()
  const [open, setOpen] = useState(false)
  const key = useRef(crypto.randomUUID())
  const client = useQueryClient()
  const canRequest = rentalServiceAccessible(item) && item.serverStatus === 'running' && item.connectionStatus.toUpperCase() === 'ONLINE'
  const queryKey = ['my-rcpcs', api.organizationId, 'reboot', item.rentalId] as const
  const status = useQuery({ queryKey, enabled: canRequest, queryFn: ({ signal }) => api.rebootStatus(item.rentalId, signal),
    retry: false, refetchInterval: query => query.state.data?.pending ? 5000 : 30000 })
  const request = useMutation({ mutationFn: () => api.reboot(item.rentalId, key.current),
    onSuccess: async value => {
      client.setQueryData(queryKey, value)
      setOpen(false)
      key.current = crypto.randomUUID()
      await client.invalidateQueries({ queryKey: ['my-rcpcs', api.organizationId] })
    } })
  return <><span className="rcpc-reboot-control"><Button size="small" variant="secondary" disabled={!canRequest || !status.data?.available || status.data.pending || request.isPending} onClick={() => setOpen(true)}>{uiText("재부팅")}</Button>
    </span>
    <RcpcRebootSurface isOpen={open} rcpc={{ rcpcId: item.productNo }}
      confirmDisabled={!canRequest || request.isPending || !status.data?.available || status.data.pending} onClose={() => { if (!request.isPending) setOpen(false) }} onConfirm={() => { if (canRequest && status.data?.available && !status.data.pending && !request.isPending) request.mutate() }} />
    </>
}

export function RcpcWanIp({ api, item, compact = false, autoReveal = true }: { api: MyRcpcReadServices; item: MyRcpcItem; compact?: boolean; autoReveal?: boolean }) {
  const { uiText } = useUiTranslation()
  const { ref: connectionRef, visible } = useVisibleConnection()
  const [value, setValue] = useState<string | null>(null)
  const { message, setMessage, toastKey } = useToastMessage()
  const [pendingAction, setPendingAction] = useState<'reveal' | 'copy' | null>(null)
  const [autoPending, setAutoPending] = useState(false)
  const pending = pendingAction !== null || autoPending
  const [failed, setFailed] = useState(false)
  const sequence = useRef(0)
  const loaded = useRef(false)
  const automaticRetry = useRef({ used: false, after: 0 })
  const allowed = rentalServiceAccessible(item) && rentalOperationalStatus(item) === 'active'
  const registered = item.wanIpConfigured
  const available = allowed && registered !== false
  useEffect(() => {
    sequence.current += 1; setValue(null); setMessage(''); setPendingAction(null); setAutoPending(false); setFailed(false)
    loaded.current = false
    automaticRetry.current = { used: false, after: 0 }
    return () => { sequence.current += 1 }
  }, [api, item.rentalId, registered, available, setMessage])
  useEffect(() => {
    if (!autoReveal || !available || !visible || loaded.current) {
      setAutoPending(false)
      return
    }
    const controller = new AbortController()
    const token = sequence.current
    let timer: number | undefined
    const current = () => !controller.signal.aborted && token === sequence.current
    const load = async () => {
      if (!current()) return
      setAutoPending(true)
      try {
        const result = await api.wanIp(item.rentalId, 'reveal', controller.signal)
        if (current()) { loaded.current = true; setValue(result.wanIp); setFailed(false) }
      } catch (error) {
        if (!current()) return
        // Automatic display failures stay on the field, never as unsolicited toasts.
        setFailed(true)
        if (error instanceof ApiClientError && error.status === 429 && !automaticRetry.current.used) {
          const after = error.retryAfter
          const delay = after && /^\d+$/.test(after) ? Number(after) * 1000 : after ? Date.parse(after) - Date.now() : 60_000
          const wait = Math.max(Number.isFinite(delay) ? delay : 60_000, 1000)
          automaticRetry.current = { used: true, after: Date.now() + wait }
          if (wait <= 600_000) timer = window.setTimeout(() => { automaticRetry.current.after = 0; void load() }, wait)
        }
      } finally { if (current()) setAutoPending(false) }
    }
    const wait = Math.max(automaticRetry.current.after - Date.now(), 0)
    if (automaticRetry.current.after > 0 && wait <= 600_000) timer = window.setTimeout(() => { automaticRetry.current.after = 0; void load() }, wait)
    else if (!automaticRetry.current.used) void load()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [api, item.rentalId, registered, available, autoReveal, visible])
  async function act(action: 'reveal' | 'copy') {
    if (!available || pending) return
    const token = ++sequence.current
    setPendingAction(action); setMessage('')
    if (action === 'reveal') setFailed(false)
    let readSucceeded = false
    try {
      const result = await api.wanIp(item.rentalId, action)
      if (token !== sequence.current) return
      readSucceeded = true
      loaded.current = true; setValue(result.wanIp); setFailed(false)
      if (action === 'copy') { await navigator.clipboard.writeText(result.wanIp); if (token === sequence.current) setMessage("복사되었습니다.") }
    } catch (error) {
      if (token === sequence.current) {
        if (action === 'reveal') setFailed(!readSucceeded)
        setMessage(readSucceeded ? "복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요." : wanIpErrorMessage(error))
      }
    }
    finally { if (token === sequence.current) setPendingAction(null) }
  }
  const label = registered === false ? uiText("미등록") : !allowed ? uiText("이용 불가") : autoPending || pendingAction === 'reveal' ? uiText("확인 중…") : value ?? (failed ? uiText("조회 실패") : uiText("확인 전"))
  if (compact) return <div ref={connectionRef} className="rcpc-wan-ip rcpc-wan-ip--compact"><b><img alt="" src={webIcon}/>WAN IP</b><TooltipText text={label} enabled={available && !autoPending && pendingAction !== 'reveal' && Boolean(value)}/>{message ? <Toast message={uiText(message)} toastKey={toastKey}/> : null}</div>
  return <div ref={connectionRef}>WAN IP: <span>{label}</span> <button type="button" disabled={!available || pending} onClick={() => void act('copy')}>{uiText("복사")}</button><span role="status">{uiText(message)}</span></div>
}

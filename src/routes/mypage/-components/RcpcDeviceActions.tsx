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

function wanIpErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.kind === 'authentication') return '로그인 상태를 확인한 뒤 다시 시도해 주세요.'
    if (error.status === 403) return 'WAN IP를 조회할 수 없습니다. 이용 기간·장치 등록 상태·접근 권한을 확인해 주세요.'
    if (error.status === 400 || error.status === 404) return 'WAN IP 정보를 확인할 수 없습니다. 장치의 IP 등록 상태를 확인해 주세요.'
    if (error.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
    if (error.kind === 'network') return '서버에 연결하지 못했습니다. 네트워크 연결을 확인해 주세요.'
  }
  return 'WAN IP 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.'
}

export function RcpcReboot({ api, item }: { api: MyRcpcReadServices; item: MyRcpcItem }) {
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
  return <><span className="rcpc-reboot-control"><Button size="small" variant="secondary" disabled={!canRequest || !status.data?.available || status.data.pending || request.isPending} onClick={() => setOpen(true)}>재부팅</Button>
    </span>
    <RcpcRebootSurface isOpen={open} rcpc={{ rcpcId: item.productNo }}
      confirmDisabled={!canRequest || request.isPending || !status.data?.available || status.data.pending} onClose={() => { if (!request.isPending) setOpen(false) }} onConfirm={() => { if (canRequest && status.data?.available && !status.data.pending && !request.isPending) request.mutate() }} />
    </>
}

export function RcpcWanIp({ api, item, compact = false, autoReveal = true }: { api: MyRcpcReadServices; item: MyRcpcItem; compact?: boolean; autoReveal?: boolean }) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(!compact)
  const [value, setValue] = useState<string | null>(null)
  const { message, setMessage, toastKey } = useToastMessage()
  const [pendingAction, setPendingAction] = useState<'reveal' | 'copy' | null>(null)
  const pending = pendingAction !== null
  const [failed, setFailed] = useState(false)
  const sequence = useRef(0)
  const allowed = rentalServiceAccessible(item) && rentalOperationalStatus(item) === 'active'
  const registered = item.wanIpConfigured
  const available = allowed && registered !== false
  useEffect(() => {
    if (!compact || visible) return
    const element = elementRef.current
    if (!element) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '100px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [compact, visible])
  useEffect(() => {
    sequence.current += 1; setValue(null); setMessage(''); setPendingAction(null); setFailed(false)
    return () => { sequence.current += 1 }
  }, [api.organizationId, item.rentalId, registered, available, setMessage])
  useEffect(() => {
    if (!autoReveal || !available || !visible) return
    const controller = new AbortController()
    const token = ++sequence.current
    setPendingAction('reveal')
    void api.wanIp(item.rentalId, 'reveal', controller.signal).then(result => {
      if (!controller.signal.aborted && token === sequence.current) { setValue(result.wanIp); setFailed(false) }
    }).catch(error => {
      if (!controller.signal.aborted && token === sequence.current) { setFailed(true); setMessage(wanIpErrorMessage(error)) }
    }).finally(() => {
      if (!controller.signal.aborted && token === sequence.current) setPendingAction(null)
    })
    return () => { controller.abort(); sequence.current += 1 }
  }, [api, item.rentalId, registered, available, autoReveal, visible, setMessage])
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
      if (action === 'copy') { await navigator.clipboard.writeText(result.wanIp); if (token === sequence.current) setMessage('복사되었습니다.') }
      else setValue(result.wanIp)
    } catch (error) {
      if (token === sequence.current) {
        if (action === 'reveal') setFailed(!readSucceeded)
        setMessage(readSucceeded ? '복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.' : wanIpErrorMessage(error))
      }
    }
    finally { if (token === sequence.current) setPendingAction(null) }
  }
  const label = registered === false ? '미등록' : !allowed ? '이용 불가' : pendingAction === 'reveal' ? '확인 중…' : value ?? (failed ? '조회 실패' : '확인 전')
  if (compact) return <div className="rcpc-wan-ip rcpc-wan-ip--compact" ref={elementRef}><b><img alt="" src={webIcon}/>WAN IP</b><TooltipText text={label} enabled={available && pendingAction !== 'reveal' && Boolean(value)}/>{message ? <Toast message={message} toastKey={toastKey}/> : null}</div>
  return <div>WAN IP: <span>{label}</span> <button type="button" disabled={!available || pending} onClick={() => void act('copy')}>복사</button><span role="status">{message}</span></div>
}

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MyRcpcItem } from '@/api/myRcpc'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { RcpcRebootSurface } from '@/components/mypage/RcpcDialogsControl'
import copyIcon from '@/assets/figma/icon-content-copy.svg'
import eyeIcon from '@/assets/figma/scrap-eye.svg'
import webIcon from '@/assets/figma/icon-connect-web.svg'
import { Button } from '@/components/ui/ButtonControl'

export function RcpcReboot({ api, item }: { api: MyRcpcReadServices; item: MyRcpcItem }) {
  const [open, setOpen] = useState(false)
  const key = useRef(crypto.randomUUID())
  const client = useQueryClient()
  const canRequest = item.serverStatus === 'running'
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
  return <><Button size="small" variant="secondary" disabled={!canRequest || !status.data?.available || status.data.pending || request.isPending} onClick={() => setOpen(true)}>재부팅</Button>
    {status.data?.pending && <span role="status">명령 접수 · 장치 재통신 대기 중</span>}
    {status.data?.status === 'communication_resumed' && <span role="status">장치 통신 재개 확인</span>}
    {(status.data?.status === 'failed' || status.data?.status === 'expired') && <span role="status">이전 요청 실패 또는 기한 만료</span>}
    {status.error && <span>재부팅 권한 또는 상태를 확인할 수 없습니다.</span>}
    <RcpcRebootSurface isOpen={open} rcpc={{ rcpcId: item.productNo }} confirmLabel={request.isPending ? '요청 중…' : '재부팅'}
      confirmDisabled={request.isPending || !status.data?.available} onClose={() => { if (!request.isPending) setOpen(false) }} onConfirm={() => request.mutate()} />
    {request.error && <span role="alert">재부팅을 요청하지 못했습니다. 다시 시도해 주세요.</span>}</>
}

export function RcpcWanIp({ api, item, compact = false }: { api: MyRcpcReadServices; item: MyRcpcItem; compact?: boolean }) {
  const [value, setValue] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const sequence = useRef(0)
  useEffect(() => {
    const clear = () => { sequence.current += 1; setValue(null); setMessage(''); setPending(false) }
    window.addEventListener('blur', clear)
    return () => { sequence.current += 1; window.removeEventListener('blur', clear) }
  }, [api.organizationId, item.rentalId])
  useEffect(() => { if (value === null) return; const timer = window.setTimeout(() => setValue(null), 30000); return () => window.clearTimeout(timer) }, [value])
  async function act(action: 'reveal' | 'copy') {
    const token = ++sequence.current
    setPending(true); setMessage('')
    try {
      const result = await api.wanIp(item.rentalId, action)
      if (token !== sequence.current) return
      if (action === 'copy') { await navigator.clipboard.writeText(result.wanIp); if (token === sequence.current) setMessage('복사되었습니다.') }
      else setValue(result.wanIp)
    } catch (error) { if (token === sequence.current) setMessage(error instanceof Error ? error.message : 'IP 정보를 확인할 수 없습니다.') }
    finally { if (token === sequence.current) setPending(false) }
  }
  const allowed = ['running', 'needs_attention'].includes(item.serverStatus) && ['active', 'expiring'].includes(item.rentalStatus)
  if (compact) return <div className="rcpc-wan-ip--compact"><b><img alt="" src={webIcon}/>WAN IP</b><span>{value ?? '********'}</span><button aria-label={`WAN IP ${value ? '숨기기' : '보기'}`} aria-pressed={Boolean(value)} type="button" disabled={!allowed || pending} onClick={() => value ? setValue(null) : void act('reveal')}><img alt="" src={eyeIcon}/></button><button aria-label="WAN IP 복사" type="button" disabled={!allowed || pending} onClick={() => void act('copy')}><img alt="" src={copyIcon}/></button>{message ? <span className="rcpc-copy-toast" role="status">{message}</span> : null}</div>
  return <div>WAN IP: <span>{value ?? '••••••••'}</span> <button type="button" disabled={!allowed || pending} onClick={() => value ? setValue(null) : void act('reveal')}>{value ? '숨기기' : '표시'}</button> <button type="button" disabled={!allowed || pending} onClick={() => void act('copy')}>복사</button><span role="status">{message}</span></div>
}

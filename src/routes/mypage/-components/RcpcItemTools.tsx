import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MyRcpcItem } from '@/api/myRcpc'
import type { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { useSession } from '@/app/session/SessionProvider'
import { RcpcAliasSurface, RcpcSpecSurface } from '@/components/mypage/RcpcDialogsControl'
import { Modal } from '@/components/ui/ModalControl'
import editIcon from '@/assets/figma/scrap-edit.svg'
import { AccountQueryState } from './AccountQueryState'

export function RcpcAliasButton({ api, item, mutations, compact = false }: { api: MyRcpcReadServices; item: MyRcpcItem; mutations?: ReturnType<typeof createCustomerRcpcMutations>; compact?: boolean }) {
  const session = useSession()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [alias, setAlias] = useState(item.preference.alias ?? '')
  const canEdit = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner' && Boolean(mutations)
  const save = useMutation({ mutationFn: () => {
    if (!mutations || !canEdit) throw new Error('별명 수정 권한이 없습니다.')
    return mutations.preference(String(item.rentalId), { alias: alias.length ? alias : null, favorite: item.preference.favorite })
  }, onSuccess: async () => { setOpen(false); await client.invalidateQueries({ queryKey: ['my-rcpcs', api.organizationId] }) } })
  const label = item.preference.alias ? '별명 수정' : '별명 설정'
  return <>{canEdit && <button aria-label={`${item.productNo} RCPC ${label}`} className={compact ? `rcpc-live-alias${item.preference.alias ? ' is-edit' : ' is-empty'}` : undefined} type="button" onClick={() => { setAlias(item.preference.alias ?? ''); setOpen(true); save.reset() }}>{compact ? item.preference.alias ? <img alt="" src={editIcon}/> : '+ 별명 설정' : label}</button>}
    {open ? <RcpcAliasSurface alias={alias} confirmDisabled={save.isPending} error={save.error ? '별명을 저장하지 못했습니다. 다시 시도해 주세요.' : undefined}
      onAliasChange={setAlias} onClose={() => { if (!save.isPending) setOpen(false) }} onConfirm={() => save.mutate()} rcpc={{ rcpcId: item.productNo }} /> : null}</>
}

export function RcpcSpecButton({ api, item, compact = false }: { api: MyRcpcReadServices; item: MyRcpcItem; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const detail = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'spec', item.rentalId], enabled: open,
    queryFn: ({ signal }) => api.detail(item.rentalId, signal) })
  const spec = detail.data?.pcSpec
  return <><button className={compact ? 'rcpc-live-spec' : undefined} type="button" onClick={() => setOpen(true)}>{compact ? <><u>사양보기</u><span aria-hidden="true"> ›</span></> : '사양보기'}</button>{open ? detail.isPending || detail.error || !spec ? <Modal isOpen onClose={() => setOpen(false)} title="PC 사양 보기"><AccountQueryState pending={detail.isPending} error={detail.error} retry={detail.refetch} />{!detail.isPending && !detail.error && !spec ? <p>등록된 사양 정보가 없습니다.</p> : null}</Modal> : <RcpcSpecSurface onClose={() => setOpen(false)} rcpc={{ rcpcId: item.productNo, location: detail.data?.serverRoomName ?? '-', os: [spec.osName, spec.osVersion].filter(Boolean).join(' '), cpu: [spec.cpuModel, spec.cpuCores == null ? null : `${spec.cpuCores}코어`, spec.cpuThreads == null ? null : `${spec.cpuThreads}스레드`].filter(Boolean).join(' · '), ram: [spec.ramGb == null ? null : `${spec.ramGb}GB`, spec.ramType].filter(Boolean).join(' '), disk: [`SSD ${spec.ssdGb ?? '-'}GB`, `HDD ${spec.hddGb ?? '-'}GB`].join(' / '), gpu: [spec.gpuModel, spec.gpuVramGb == null ? null : `${spec.gpuVramGb}GB`].filter(Boolean).join(' · ') }} /> : null}</>
}

export function RcpcPeriodLabel({ item }: { item: MyRcpcItem }) {
  if (item.serverStatus === 'ended' || item.serverStatus === 'format_waiting') return <>이용종료 · {item.serviceEndExclusiveDate ?? '-'}</>
  if (item.serverStatus === 'extension_waiting') return <>연장대기 · {item.serviceEndExclusiveDate ?? '-'}</>
  if (!item.serviceEndExclusiveDate) return <>-</>
  const date = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]))
  const today = `${date.year}-${date.month}-${date.day}`
  const days = Math.max(0, Math.round((Date.parse(`${item.serviceEndExclusiveDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000))
  return <>{item.serviceEndExclusiveDate} · {days}일 남음</>
}

import { useUiTranslation } from '@/i18n/uiTranslation'
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
import { rentalEndDate, rentalPeriodText } from './rcpcPresentation'

export function RcpcAliasButton({ api, item, mutations, compact = false, onAliasSaved }: { api: MyRcpcReadServices; item: MyRcpcItem; mutations?: ReturnType<typeof createCustomerRcpcMutations>; compact?: boolean; onAliasSaved?: () => void | Promise<unknown> }) {
  const { uiText } = useUiTranslation()
  const session = useSession()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [alias, setAlias] = useState(item.preference.alias ?? '')
  const canEdit = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner' && Boolean(mutations)
  const save = useMutation({ mutationFn: () => {
    if (!mutations || !canEdit) throw new Error("별명 수정 권한이 없습니다.")
    return mutations.preference(String(item.rentalId), { alias: alias.length ? alias : null, favorite: item.preference.favorite })
  }, onSuccess: async () => {
    setOpen(false)
    if (onAliasSaved) {
      await onAliasSaved()
      return
    }
    await client.invalidateQueries({ queryKey: ['my-rcpcs', api.organizationId] })
  } })
  const label = item.preference.alias ? uiText("별명 수정") : uiText("별명 설정")
  return <>{canEdit && <button aria-label={`${item.productNo} RCPC ${label}`} className={compact ? 'mypage-home-rcpc__edit' : undefined} type="button" onClick={() => { setAlias(item.preference.alias ?? ''); setOpen(true); save.reset() }}>{compact ? <img alt="" src={editIcon}/> : label}</button>}
    {open ? <RcpcAliasSurface alias={alias} confirmDisabled={save.isPending} error={save.error?.message}
      onAliasChange={setAlias} onClose={() => { if (!save.isPending) setOpen(false) }} onConfirm={() => save.mutate()} rcpc={{ rcpcId: item.productNo }} /> : null}</>
}

export function RcpcSpecButton({ api, item, compact = false }: { api: MyRcpcReadServices; item: MyRcpcItem; compact?: boolean }) {
  const { uiText, t } = useUiTranslation()
  const [open, setOpen] = useState(false)
  const detail = useQuery({ queryKey: ['my-rcpcs', api.organizationId, 'spec', item.rentalId], enabled: open,
    queryFn: ({ signal }) => api.detail(item.rentalId, signal) })
  const spec = detail.data?.pcSpec
  return <><button className={compact ? 'mypage-home-rcpc__spec-action' : undefined} type="button" onClick={() => setOpen(true)}>{compact ? <u>{uiText("사양보기")}</u> : uiText("사양보기")}</button>{open ? detail.isPending || detail.error || !spec ? <Modal isOpen onClose={() => setOpen(false)} title={uiText("PC 사양 보기")}><AccountQueryState pending={detail.isPending} error={detail.error} retry={detail.refetch} />{!detail.isPending && !detail.error && !spec ? <p>{uiText("등록된 사양 정보가 없습니다.")}</p> : null}</Modal> : <RcpcSpecSurface onClose={() => setOpen(false)} rcpc={{ rcpcId: item.productNo, location: detail.data?.serverRoomName ?? '-', os: [spec.osName, spec.osVersion].filter(Boolean).join(' '), cpu: [spec.cpuModel, spec.cpuThreads == null ? null : t("mypageRcpc.ui071", { v0: spec.cpuThreads })].filter(Boolean).join(' · '), cpuCores: spec.cpuCores, ram: [spec.ramGb == null ? null : `${spec.ramGb}GB`, spec.ramType].filter(Boolean).join(' '), disk: [`SSD ${spec.ssdGb ?? '-'}GB`, `HDD ${spec.hddGb ?? '-'}GB`].join(' / '), gpu: [spec.gpuModel, spec.gpuVramGb == null ? null : `${spec.gpuVramGb}GB`].filter(Boolean).join(' · ') }} /> : null}</>
}

export function RcpcPeriodLabel({ item }: { item: MyRcpcItem }) {
  useUiTranslation()
  const endDate = rentalEndDate(item) ?? '-'
  return endDate === '-' ? <>-</> : <>{endDate} · {rentalPeriodText(item)}</>
}

export function RcpcTablePeriod({ item, inlineEndDate = false }: { item: MyRcpcItem; inlineEndDate?: boolean }) {
  const { uiText } = useUiTranslation()
  const endDate = rentalEndDate(item)
  if (!endDate) return <span>-</span>

  const endParts = item.serviceEndsAt ? Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(item.serviceEndsAt)).map(part => [part.type, part.value])) : null
  const displayDate = endParts ? `${endParts.year}-${endParts.month}-${endParts.day}` : endDate
  const displayTime = endParts ? `${endParts.hour}:${endParts.minute}:${endParts.second}` : null
  return <>
    <strong>{rentalPeriodText(item)}</strong>
    <small>{displayDate}{displayTime ? <>{inlineEndDate ? ' ' : <br/>}{displayTime} {uiText("까지")}</> : null}</small>
  </>
}

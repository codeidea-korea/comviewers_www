import { useUiTranslation } from '@/i18n/uiTranslation'
import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { ApiClientError } from '@/api/httpClient'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { AccountQueryState } from './AccountQueryState'
import { loadAuthorizedRcpcs } from './rcpcPresentation'
import { sortInquiryChoices } from './inquiryChoice'
import { ProductChoiceContent } from './modals/InquiryProductChoice'
import { bulkInquiryServerRoomNotice, hasSameInquiryServerRoom } from './inquiryServerRoomScope'
import { useMobileInquiryViewport } from './inquiries/inquiryViewport'
import { serverPresenceQueryOptions } from '@/lib/serverPresenceQueryOptions'
import { invalidateInquiryQueries } from '@/lib/inquiryQueryCache'

export function InquiryTargetAddition(props: { api: InquiryReadServices; requestId: number; existingIds: readonly number[]; total: number; closed: boolean; pickerOpen?: boolean; onClosePicker?: () => void; showTrigger?: boolean; embedded?: boolean; closeRequestRef?: RefObject<(() => void) | null>; onOutcome?: (message: string, values: Readonly<Record<string, string | number>>) => void }) {
  const { myAccount } = useServices()
  return myAccount.rcpcApi ? <TargetPicker {...props} rcpcApi={myAccount.rcpcApi}/> : null
}

function TargetPicker({ api, rcpcApi, requestId, existingIds, total, closed, pickerOpen, onClosePicker, showTrigger = true, embedded = false, closeRequestRef, onOutcome }: {
  api: InquiryReadServices; rcpcApi: MyRcpcReadServices; requestId: number; existingIds: readonly number[]; total: number; closed: boolean
  pickerOpen?: boolean; onClosePicker?: () => void; showTrigger?: boolean; embedded?: boolean; closeRequestRef?: RefObject<(() => void) | null>; onOutcome?: (message: string, values: Readonly<Record<string, string | number>>) => void
}) {
  const { uiText, t } = useUiTranslation()
  const client = useQueryClient()
  const [localOpen, setLocalOpen] = useState(false)
  const open = pickerOpen ?? localOpen
  const setOpen = (value: boolean) => { setLocalOpen(value); if (!value) onClosePicker?.() }
  const mobile = useMobileInquiryViewport()
  const [selected, setSelected] = useState<readonly number[]>([])
  const [businessNotice, setBusinessNotice] = useState('')
  const { message: outcome, setMessage: setOutcome, toastKey } = useToastMessage()
  const [outcomeValues, setOutcomeValues] = useState<Readonly<Record<string, string | number>>>({})
  const pending = useRef(false)
  const attempt = useRef<{ ids: readonly number[]; key: string } | null>(null)
  const options = useQuery({ ...serverPresenceQueryOptions, queryKey: ['my-rcpcs', rcpcApi.organizationId, 'inquiry-addition-options'],
    queryFn: ({ signal }) => loadAuthorizedRcpcs(rcpcApi, signal), enabled: open && !closed })
  const available = (options.data ?? []).filter((item) => !existingIds.includes(item.pcAssetId)
    && item.rentalStatus === 'active')
  const products = useMemo(() => sortInquiryChoices(available), [available])
  const save = useMutation({ mutationKey: ['operation-requests', api.organizationId, 'add-targets', requestId], mutationFn: async () => {
    if (!attempt.current) throw new Error("추가할 상품을 선택해 주세요.")
    return api.addTargets(requestId, attempt.current.ids, attempt.current.key)
  }, onSuccess: async (result) => {
    attempt.current = null; setSelected([]); setOpen(false)
    const message = "문의 상품 {value0}개를 추가했습니다. 총 {value1}개입니다."
    const values = { value0: result.addedPcAssetIds.length, value1: result.totalTargetCount }
    if (onOutcome) onOutcome(message, values)
    else { setOutcomeValues(values); setOutcome(message) }
    await invalidateInquiryQueries(client, api.organizationId)
  }, onError: (error) => {
    if (error instanceof ApiClientError && error.status !== undefined && [400, 403, 404, 409, 422].includes(error.status)) {
      attempt.current = null
      void options.refetch()
    }
  }, onSettled: () => { pending.current = false } })
  const submit = () => {
    if (pending.current || closed) return
    if (!attempt.current) {
      if (selected.some(id => !available.some(item => item.pcAssetId === id))) {
        setBusinessNotice("선택한 문의 대상 RCPC를 확인할 수 없습니다. 다시 확인해 주세요.")
        return
      }
      const ids = [...new Set(selected)].sort((a, b) => a - b)
      if (!ids.length) return
      const selectedTargets = products.filter(item => ids.includes(Number(item.rcpcId)))
      const existingTargets = sortInquiryChoices(options.data ?? []).filter(item => existingIds.includes(Number(item.rcpcId)))
      // The API also checks existing targets absent from this caller's RCPC options (including products).
      const knownTargets = existingIds.length === total && existingIds.every(id => existingTargets.some(item => Number(item.rcpcId) === id))
        ? [...existingTargets, ...selectedTargets] : selectedTargets
      if (!hasSameInquiryServerRoom(knownTargets)) { setBusinessNotice(bulkInquiryServerRoomNotice); return }
      setBusinessNotice('')
      attempt.current = { ids, key: `inquiry-targets:${crypto.randomUUID()}` }
    }
    pending.current = true; save.mutate()
  }
  const closePicker = () => { if (!pending.current) { attempt.current = null; setOpen(false) } }
  useLayoutEffect(() => {
    if (!closeRequestRef) return
    closeRequestRef.current = closePicker
    return () => { closeRequestRef.current = null }
  })
  if (closed) return null
  const picker = <ProductChoiceContent
        standalone={mobile}
        title={t("mypageSupport.template3", { value0: products.length })}
        variant="addition"
        busy={save.isPending}
        actionLabel={save.isPending ? uiText("추가 중…") : save.isError ? uiText("다시 확인") : uiText("추가하기")}
        allowEmpty={false}
        notice={<><AccountQueryState pending={options.isPending} error={options.error} retry={options.refetch}/>{options.data && !products.length ? <p>{uiText("추가할 수 있는 RCPC가 없습니다.")}</p> : null}{save.isError ? <p role="alert">{uiText(save.error instanceof Error ? save.error.message : uiText("처리 결과를 확인하지 못했습니다."))}</p> : null}</>}
        onClose={closePicker}
        selectionNotice={businessNotice}
        onNext={submit}
        onSelectedChange={(ids) => {
          attempt.current = null
          setBusinessNotice('')
          setSelected([...new Set(ids)])
        }}
        products={products}
        selectedIds={selected}
      />
  if (embedded && open) return <><Toast message={uiText(outcome, outcomeValues)} toastKey={toastKey}/>{picker}</>
  return <section aria-label={uiText("문의 상품 추가")}>
    <Toast message={uiText(outcome, outcomeValues)} toastKey={toastKey} />
    {showTrigger ? <button aria-label={uiText("문의 상품 추가")} type="button" disabled={save.isPending} onClick={() => setOpen(!open)}>{uiText("문의 상품 추가")}</button> : null}
    {open && !closed ? mobile ? <main className="inquiry-mobile-page inquiry-flow-page">{picker}</main> : <DialogLayer asChild backdropClassName="inquiry-preview-layer inquiry-preview-layer--select-product" isOpen onClose={closePicker} showTitle={false} title={uiText("문의 상품 추가")}>{picker}</DialogLayer> : null}
  </section>
}

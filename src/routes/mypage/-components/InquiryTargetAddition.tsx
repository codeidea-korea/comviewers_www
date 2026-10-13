import { useMemo, useRef, useState } from 'react'
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
import { bulkInquiryBusinessNotice, hasSameInquiryBusiness } from './inquiryBusinessScope'
import { useMobileInquiryViewport } from './inquiries/inquiryViewport'

export function InquiryTargetAddition(props: { api: InquiryReadServices; requestId: number; existingIds: readonly number[]; total: number; closed: boolean; pickerOpen?: boolean; onClosePicker?: () => void; showTrigger?: boolean }) {
  const { myAccount } = useServices()
  return myAccount.rcpcApi ? <TargetPicker {...props} rcpcApi={myAccount.rcpcApi}/> : null
}

function TargetPicker({ api, rcpcApi, requestId, existingIds, total, closed, pickerOpen, onClosePicker, showTrigger = true }: {
  api: InquiryReadServices; rcpcApi: MyRcpcReadServices; requestId: number; existingIds: readonly number[]; total: number; closed: boolean
  pickerOpen?: boolean; onClosePicker?: () => void; showTrigger?: boolean
}) {
  const client = useQueryClient()
  const chatKey = ['operation-requests', api.organizationId, 'chat', requestId] as const
  const [localOpen, setLocalOpen] = useState(false)
  const open = pickerOpen ?? localOpen
  const setOpen = (value: boolean) => { setLocalOpen(value); if (!value) onClosePicker?.() }
  const mobile = useMobileInquiryViewport()
  const [selected, setSelected] = useState<readonly number[]>([])
  const [businessNotice, setBusinessNotice] = useState('')
  const { message: outcome, setMessage: setOutcome, toastKey } = useToastMessage()
  const pending = useRef(false)
  const attempt = useRef<{ ids: readonly number[]; key: string } | null>(null)
  const options = useQuery({ queryKey: ['my-rcpcs', rcpcApi.organizationId, 'inquiry-addition-options'],
    queryFn: ({ signal }) => loadAuthorizedRcpcs(rcpcApi, signal), enabled: open && !closed })
  const available = (options.data ?? []).filter((item) => !existingIds.includes(item.pcAssetId)
    && item.rentalStatus === 'active')
  const products = useMemo(() => sortInquiryChoices(available), [available])
  const selectedIndexes = products.map((product, index) => selected.includes(Number(product.rcpcId)) ? index : -1).filter((index) => index >= 0)
  const save = useMutation({ mutationFn: async () => {
    if (!attempt.current) throw new Error('추가할 상품을 선택해 주세요.')
    return api.addTargets(requestId, attempt.current.ids, attempt.current.key)
  }, onSuccess: async (result) => {
    attempt.current = null; setSelected([]); setOpen(false)
    setOutcome(`문의 상품 ${result.addedPcAssetIds.length}개를 추가했습니다. 총 ${result.totalTargetCount}개입니다.`)
    await Promise.all([
      client.invalidateQueries({ queryKey: ['operation-requests', api.organizationId] }),
      client.invalidateQueries({ queryKey: chatKey, exact: true }),
    ])
  }, onError: (error) => {
    if (error instanceof ApiClientError && error.status !== undefined && [400, 403, 404, 409, 422].includes(error.status)) {
      attempt.current = null
      void options.refetch()
    }
  }, onSettled: () => { pending.current = false } })
  const submit = () => {
    if (pending.current || closed) return
    if (!attempt.current) {
      const ids = selected.filter((id) => available.some((item) => item.pcAssetId === id)).sort((a, b) => a - b)
      if (!ids.length || ids.length + total > 20) return
      const selectedTargets = available.filter(item => ids.includes(item.pcAssetId))
      const existingTargets = (options.data ?? []).filter(item => existingIds.includes(item.pcAssetId))
      // The API also checks existing targets absent from this caller's RCPC options (including products).
      const knownTargets = existingIds.length === total && existingIds.every(id => existingTargets.some(item => item.pcAssetId === id))
        ? [...existingTargets, ...selectedTargets] : selectedTargets
      if (!hasSameInquiryBusiness(knownTargets)) { setBusinessNotice(bulkInquiryBusinessNotice); return }
      setBusinessNotice('')
      attempt.current = { ids, key: `inquiry-targets:${crypto.randomUUID()}` }
    }
    pending.current = true; save.mutate()
  }
  if (closed) return null
  const picker = <ProductChoiceContent
        standalone={mobile}
        title={`문의 상품 추가 (${selectedIndexes.length})`}
        actionLabel={save.isPending ? '추가 중…' : save.isError ? '다시 확인' : '추가하기'}
        allowEmpty={false}
        maxSelection={Math.max(0, 20 - total)}
        notice={<><AccountQueryState pending={options.isPending} error={options.error} retry={options.refetch}/>{options.data && !products.length ? <p>추가할 수 있는 RCPC가 없습니다.</p> : null}{businessNotice ? <p role="alert">{businessNotice}</p> : null}{save.isError ? <p role="alert">{save.error instanceof Error ? save.error.message : '처리 결과를 확인하지 못했습니다.'}</p> : null}</>}
        onClose={() => { if (!save.isPending) { attempt.current = null; setOpen(false) } }}
        onNext={submit}
        onSelectedChange={(indexes) => { attempt.current = null; setBusinessNotice(''); setSelected(indexes.map((index) => Number(products[index]?.rcpcId)).filter(Number.isSafeInteger)) }}
        products={products} selectedIndexes={selectedIndexes}
      />
  return <section aria-label="문의 상품 추가">
    <Toast message={outcome} toastKey={toastKey} />
    {showTrigger ? <button aria-label="문의 상품 추가" type="button" disabled={total >= 20 || save.isPending} onClick={() => setOpen(!open)}>문의 상품 추가</button> : null}
    {open && !closed ? mobile ? <main className="inquiry-mobile-page inquiry-flow-page">{picker}</main> : <DialogLayer asChild backdropClassName="inquiry-preview-layer inquiry-preview-layer--select-product" isOpen onClose={() => { if (!save.isPending) { attempt.current = null; setOpen(false) } }} showTitle={false} title="문의 상품 추가">{picker}</DialogLayer> : null}
  </section>
}

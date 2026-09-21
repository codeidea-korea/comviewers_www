import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { useSession } from '@/app/session/SessionProvider'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { InquiryTypeChoicePopup, InquiryWriteContent, InquiryWritePopup, TypeChoiceContent } from '@/components/mypage/InquiryFlowContent'
import { ProductChoiceContent } from './modals/InquiryProductChoice'
import { sortInquiryChoices, type InquiryChoice } from './inquiryChoice'
import { loadAuthorizedRcpcs } from './rcpcPresentation'
import { inquiryTypes } from './InquiryPresentation'
import { LoadingState } from '@/components/ui/LoadingStateControl'

type Props = {
  api: InquiryReadServices
  rcpcApi: MyRcpcReadServices
  initialIds: readonly number[]
  initialProductNo: string
  onClose: () => void
  onCreated: (id: number) => Promise<void>
}

const requestCodes = ['as_request', 'setup_change', 'refund_cancel', 'inquiry'] as const

export function InquiryCreateDialog({ api, rcpcApi, initialIds, initialProductNo, onClose, onCreated }: Props) {
  const session = useSession()
  const [step, setStep] = useState<'product' | 'type' | 'write'>('product')
  const [selectedIds, setSelectedIds] = useState<readonly number[]>(initialIds)
  const [typeIndex, setTypeIndex] = useState<number | null>(null)
  const [typeNotice, setTypeNotice] = useState('')
  const [message, setMessage] = useState('')
  const submitting = useRef(false)
  const rcpcs = useQuery({
    queryKey: ['my-rcpcs', rcpcApi.organizationId, 'authorized-options'],
    queryFn: ({ signal }) => loadAuthorizedRcpcs(rcpcApi, signal),
  })
  const products = useMemo(() => sortInquiryChoices(rcpcs.data ?? [], initialProductNo), [initialProductNo, rcpcs.data])
  const selectedIndexes = products
    .map((product, index) => selectedIds.includes(Number(product.rcpcId)) ? index : -1)
    .filter((index) => index >= 0)
  const selectedProducts = selectedIndexes
    .map((index) => products[index])
    .filter((item): item is InquiryChoice => Boolean(item))
    .slice(0, 20)
  const codes = requestCodes
  const selectedCode = typeIndex === null ? undefined : codes[typeIndex]
  const create = useMutation({
    mutationFn: () => {
      if (!selectedCode || !message.trim()) throw new Error('문의 유형과 내용을 확인해 주세요.')
      return api.create({
        requestType: selectedCode,
        title: inquiryTypes[selectedCode],
        content: message,
        targetPcAssetIds: selectedProducts.map((item) => Number(item.rcpcId)),
      })
    },
    onSuccess: (result) => onCreated(result.operationRequestId),
    onSettled: () => { submitting.current = false },
  })
  const close = () => { if (!create.isPending) onClose() }

  if (step === 'product') return <DialogLayer asChild backdropClassName="inquiry-preview-layer inquiry-preview-layer--select-product" isOpen onClose={close} showTitle={false} title="상품 선택">
    <ProductChoiceContent
      allowEmpty
      notice={rcpcs.isPending
        ? <LoadingState className="route-loading--compact" label="문의 가능한 상품을 확인하고 있습니다." />
        : rcpcs.isError
          ? <p role="alert">문의 가능한 상품을 불러오지 못했습니다. <button onClick={() => void rcpcs.refetch()} type="button">다시 시도</button></p>
          : products.length === 0 ? <p>문의 가능한 RCPC가 없습니다.</p> : null}
      onClose={close}
      onEmpty={() => { setSelectedIds([]); setTypeIndex(null); setTypeNotice(''); setStep('type') }}
      onNext={() => { setTypeIndex(null); setTypeNotice(''); setStep('type') }}
      onSelectedChange={(indexes) => setSelectedIds(indexes.slice(0, 20)
        .map((index) => Number(products[index]?.rcpcId)).filter(Number.isSafeInteger))}
      products={products}
      selectedIndexes={selectedIndexes}
    />
  </DialogLayer>

  if (step === 'type') return <InquiryTypeChoicePopup backdropClassName="inquiry-preview-layer inquiry-preview-layer--select-type" onClose={close}>
    <TypeChoiceContent
      onBack={() => setStep('product')}
      onClose={close}
      notice={typeNotice}
      onNext={() => {
        if (!selectedCode) return
        if (selectedProducts.length === 0 && selectedCode !== 'inquiry') {
          setTypeNotice('선택한 문의 유형은 문의 상품을 선택해 주세요.')
          return
        }
        if (selectedCode === 'refund_cancel' && !(session.status === 'authenticated' && session.customerSession?.commerceAvailable)) {
          setTypeNotice('해지 신청 문의를 접수할 수 있는 권한이 없습니다.')
          return
        }
        setTypeNotice('')
        setStep('write')
      }}
      onSelectedChange={(index) => { setTypeIndex(index); setTypeNotice('') }}
      options={codes.map((code) => inquiryTypes[code])}
      selectedIndex={typeIndex}
    />
  </InquiryTypeChoicePopup>

  return <InquiryWritePopup backdropClassName="inquiry-preview-layer inquiry-preview-layer--write" onClose={close}>
    <InquiryWriteContent
      composer={{
        message,
        sentMessages: [],
        notice: create.error?.message ?? '',
        pending: create.isPending,
        onMessageChange: setMessage,
        onSend: () => {
          if (!create.isPending && !submitting.current && selectedCode && (selectedProducts.length > 0 || selectedCode === 'inquiry') && message.trim()) {
            submitting.current = true
            create.mutate()
          }
        },
      }}
      inquiryType={selectedCode ? inquiryTypes[selectedCode] : ''}
      onBack={() => setStep('type')}
      onClose={close}
      selectedRcpcs={selectedProducts}
      submitLabel="문의 접수"
    />
  </InquiryWritePopup>
}

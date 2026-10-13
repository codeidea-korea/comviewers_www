import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { useSession } from '@/app/session/SessionProvider'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { InquiryWriteContent, InquiryWritePopup, TypeChoiceContent } from '@/components/mypage/InquiryFlowContent'
import { ProductChoiceContent } from './modals/InquiryProductChoice'
import { sortInquiryChoices, type InquiryChoice } from './inquiryChoice'
import { loadAuthorizedRcpcs } from './rcpcPresentation'
import { inquiryTypes } from './InquiryPresentation'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { InquiryRefundApplicationDialog } from './InquiryRefundApplication'
import { bulkInquiryBusinessNotice, hasSameInquiryBusiness } from './inquiryBusinessScope'
import './inquiry-flow-qa.css'

type Props = {
  api: InquiryReadServices
  rcpcApi: MyRcpcReadServices
  initialIds: readonly number[]
  initialProductNo: string
  fixedTarget?: boolean
  standalone?: boolean
  onClose: () => void
  onCreated: (id: number) => Promise<void>
}

const requestCodes = ['as_request', 'setup_change', 'refund_cancel', 'inquiry'] as const

export function InquiryCreateDialog({ api, rcpcApi, initialIds, initialProductNo, fixedTarget = false, standalone = false, onClose, onCreated }: Props) {
  const session = useSession()
  const hasFixedTarget = fixedTarget && initialIds.length > 0 && initialIds.length <= 20
  const [step, setStep] = useState<'product' | 'type' | 'write' | 'refund'>(hasFixedTarget ? 'type' : 'product')
  const [refundRentalIds, setRefundRentalIds] = useState<number[]>([])
  const [selectedIds, setSelectedIds] = useState<readonly number[]>(initialIds)
  const [typeIndex, setTypeIndex] = useState<number | null>(null)
  const [typeNotice, setTypeNotice] = useState('')
  const [productNotice, setProductNotice] = useState('')
  const [message, setMessage] = useState('')
  const [addingProducts, setAddingProducts] = useState(false)
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
    .filter((item, index, items) => items.findIndex(candidate => candidate.rcpcId === item.rcpcId) === index)
    .slice(0, 20)
  const codes = requestCodes
  const selectedCode = typeIndex === null ? undefined : codes[typeIndex]
  const create = useMutation({
    mutationFn: () => {
      if (!selectedCode || selectedCode === 'refund_cancel' || !message.trim()) throw new Error('문의 유형과 내용을 확인해 주세요.')
      if (hasFixedTarget && !initialIds.every(id => selectedProducts.some(product => Number(product.rcpcId) === id))) throw new Error('문의 대상 RCPC를 확인할 수 없습니다.')
      if (!hasSameInquiryBusiness(selectedProducts)) throw new Error(bulkInquiryBusinessNotice)
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
  const closeProductPicker = () => { if (addingProducts) { setAddingProducts(false); setStep('write') } else close() }
  const showStep = (content: ReactNode, title: string, backdropClassName: string, onExit = close) => standalone
    ? <main className="inquiry-mobile-page inquiry-flow-page">{content}</main>
    : <DialogLayer asChild backdropClassName={backdropClassName} focusKey={step} isOpen onClose={onExit} showTitle={false} title={title}>{content}</DialogLayer>

  if (step === 'product') return showStep(
    <ProductChoiceContent
      standalone={standalone}
      allowEmpty={!hasFixedTarget}
      notice={<>{rcpcs.isPending
        ? <LoadingState className="route-loading--compact" label="문의 가능한 상품을 확인하고 있습니다." />
        : rcpcs.isError
          ? <p role="alert">문의 가능한 상품을 불러오지 못했습니다. <button onClick={() => void rcpcs.refetch()} type="button">다시 시도</button></p>
          : products.length === 0 ? <p>문의 가능한 RCPC가 없습니다.</p> : null}{productNotice ? <p role="alert">{productNotice}</p> : null}</>}
      onClose={closeProductPicker}
      onEmpty={() => { setSelectedIds([]); setProductNotice(''); if (addingProducts) { setAddingProducts(false); setStep('write') } else { setTypeIndex(null); setTypeNotice(''); setStep('type') } }}
      onNext={() => {
        if (!hasSameInquiryBusiness(selectedProducts)) { setProductNotice(bulkInquiryBusinessNotice); return }
        setProductNotice('')
        if (addingProducts) { setAddingProducts(false); setStep('write') } else { setTypeIndex(null); setTypeNotice(''); setStep('type') }
      }}
      onSelectedChange={(indexes) => { setProductNotice(''); setSelectedIds([...new Set([
        ...(hasFixedTarget ? initialIds : []),
        ...indexes.map((index) => Number(products[index]?.rcpcId)).filter(Number.isSafeInteger),
      ])].slice(0, 20)) }}
      products={products}
      selectedIndexes={selectedIndexes}
    />, '상품 선택', 'inquiry-preview-layer inquiry-preview-layer--select-product', closeProductPicker)

  if (step === 'type') return showStep(
    <TypeChoiceContent
      standalone={standalone}
      onBack={() => hasFixedTarget ? close() : setStep('product')}
      backLabel={hasFixedTarget ? '닫기' : '이전'}
      onClose={close}
      notice={typeNotice}
      onNext={() => {
        if (!selectedCode) return
        if (hasFixedTarget && selectedProducts.length !== initialIds.length) {
          setTypeNotice(rcpcs.isPending ? '문의 대상 RCPC를 확인하고 있습니다.' : '문의 대상 RCPC를 확인할 수 없습니다. 다시 시도해 주세요.')
          return
        }
        if (selectedProducts.length === 0 && selectedCode !== 'inquiry') {
          setTypeNotice('선택한 문의 유형은 문의 상품을 선택해 주세요.')
          return
        }
        if (!hasSameInquiryBusiness(selectedProducts)) {
          setTypeNotice(bulkInquiryBusinessNotice)
          return
        }
        if (selectedCode === 'refund_cancel' && !(session.status === 'authenticated' && session.customerSession?.commerceAvailable)) {
          setTypeNotice('해지 신청 문의를 접수할 수 있는 권한이 없습니다.')
          return
        }
        if (selectedCode === 'refund_cancel') {
          const targetIds = new Set(selectedProducts.map(item => Number(item.rcpcId)))
          const rentalIds = [...new Set((rcpcs.data ?? []).filter(item => targetIds.has(item.pcAssetId)).map(item => item.rentalId))]
          if (!rentalIds.length) {
            setTypeNotice('문의 대상 RCPC의 렌탈 정보를 확인할 수 없습니다. 상품을 다시 선택해 주세요.')
            return
          }
          setRefundRentalIds(rentalIds)
          setTypeNotice('')
          setStep('refund')
          return
        }
        setTypeNotice('')
        setStep('write')
      }}
      onSelectedChange={(index) => { setTypeIndex(index); setTypeNotice('') }}
      options={codes.map((code) => inquiryTypes[code])}
      selectedIndex={typeIndex}
    />, '문의 유형 선택', 'inquiry-preview-layer inquiry-preview-layer--select-type')

  if (step === 'refund') return <InquiryRefundApplicationDialog api={api} initialRentalIds={refundRentalIds} onClose={() => setStep('type')} onComplete={close} standalone={standalone} />

  const write = <InquiryWriteContent
      standalone={standalone}
      composer={{
        message,
        sentMessages: [],
        notice: create.error?.message ?? '',
        pending: create.isPending,
        onMessageChange: setMessage,
        onSend: () => {
          if (!create.isPending && !submitting.current && selectedCode && (!hasFixedTarget || initialIds.every(id => selectedProducts.some(product => Number(product.rcpcId) === id))) && (selectedProducts.length > 0 || selectedCode === 'inquiry') && message.trim()) {
            submitting.current = true
            create.mutate()
          }
        },
      }}
      inquiryType={selectedCode ? inquiryTypes[selectedCode] : ''}
      onBack={() => setStep('type')}
      onAddProducts={() => { setProductNotice(''); setAddingProducts(true); setStep('product') }}
      onClose={close}
      selectedRcpcs={selectedProducts}
      submitLabel={standalone ? '전송' : '문의 접수'}
    />
  return standalone ? <main className="inquiry-mobile-page">{write}</main> : <InquiryWritePopup backdropClassName="inquiry-preview-layer inquiry-preview-layer--write" onClose={close}>{write}</InquiryWritePopup>
}

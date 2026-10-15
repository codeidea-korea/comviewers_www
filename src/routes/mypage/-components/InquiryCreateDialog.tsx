import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { InquiryReadServices, MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { useSession } from '@/app/session/SessionProvider'
import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { InquiryWriteContent, InquiryWritePopup, TypeChoiceContent } from '@/components/mypage/InquiryFlowContent'
import { ProductChoiceContent } from './modals/InquiryProductChoice'
import { sortInquiryChoices } from './inquiryChoice'
import { NativeSelect } from '@/components/ui/SelectControl'
import { loadAuthorizedRcpcs } from './rcpcPresentation'
import { inquiryTypes } from './InquiryPresentation'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { InquiryRefundApplicationDialog } from './InquiryRefundApplication'
import { bulkInquiryServerRoomNotice, hasSameInquiryServerRoom } from './inquiryServerRoomScope'
import { serverPresenceQueryOptions } from '@/lib/serverPresenceQueryOptions'
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
  const hasFixedTarget = fixedTarget
  const fixedIds = [...new Set(initialIds)]
  const [step, setStep] = useState<'product' | 'type' | 'write' | 'refund'>(hasFixedTarget ? 'type' : 'product')
  const [refundRentalIds, setRefundRentalIds] = useState<number[]>([])
  const [selectedIds, setSelectedIds] = useState<readonly number[]>(fixedIds)
  const [serverRoomId, setServerRoomId] = useState<number | null>(null)
  const [typeIndex, setTypeIndex] = useState<number | null>(null)
  const [typeNotice, setTypeNotice] = useState('')
  const [productNotice, setProductNotice] = useState('')
  const [message, setMessage] = useState('')
  const [addingProducts, setAddingProducts] = useState(false)
  const [additionalIds, setAdditionalIds] = useState<readonly number[]>([])
  const submitting = useRef(false)
  const rcpcs = useQuery({
    ...serverPresenceQueryOptions,
    queryKey: ['my-rcpcs', rcpcApi.organizationId, 'authorized-options'],
    queryFn: ({ signal }) => loadAuthorizedRcpcs(rcpcApi, signal),
  })
  const products = useMemo(() => sortInquiryChoices(rcpcs.data ?? [], initialProductNo), [initialProductNo, rcpcs.data])
  const serverRooms = products.flatMap(product => product.serverRoomId === null ? [] : [{ id: product.serverRoomId, name: product.location ?? '서버실 정보 없음' }])
    .filter((room, index, rooms) => rooms.findIndex(candidate => candidate.id === room.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
  const visibleProducts = hasFixedTarget || serverRoomId === null ? products : products.filter(product => product.serverRoomId === serverRoomId)
  const selectedProducts = selectedIds.flatMap(id => products.filter(product => Number(product.rcpcId) === id))
  const additionalProducts = visibleProducts.filter(product => !selectedIds.includes(Number(product.rcpcId))
    && rcpcs.data?.some(item => item.pcAssetId === Number(product.rcpcId) && item.rentalStatus === 'active'))
  const hasMissingTargets = selectedProducts.length !== selectedIds.length
  const invalidFixedTarget = hasFixedTarget && (!fixedIds.length || fixedIds.length > 20 || fixedIds.some(id => !Number.isSafeInteger(id) || id <= 0))
  const codes = requestCodes
  const selectedCode = typeIndex === null ? undefined : codes[typeIndex]
  const validateTargets = () => {
    if (invalidFixedTarget || hasMissingTargets || (hasFixedTarget && !fixedIds.every(id => selectedIds.includes(id)))) return '문의 대상 RCPC를 확인할 수 없습니다. 다시 시도해 주세요.'
    if (selectedIds.length > 20) return '최대 20대까지 선택할 수 있습니다. 선택한 상품을 줄여 주세요.'
    if (!hasFixedTarget && serverRoomId !== null && selectedProducts.some(product => product.serverRoomId !== serverRoomId)) return '선택한 서버실의 문의 상품을 다시 확인해 주세요.'
    if (!selectedIds.length && selectedCode !== 'inquiry') return '선택한 문의 유형은 문의 상품을 선택해 주세요.'
    return ''
  }
  const create = useMutation({
    mutationFn: () => {
      if (!selectedCode || selectedCode === 'refund_cancel' || !message.trim()) throw new Error('문의 유형과 내용을 확인해 주세요.')
      const targetNotice = validateTargets()
      if (targetNotice) throw new Error(targetNotice)
      if (!hasSameInquiryServerRoom(selectedProducts)) throw new Error(bulkInquiryServerRoomNotice)
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
  const closeProductPicker = () => {
    if (!addingProducts) { close(); return }
    setAddingProducts(false)
    setAdditionalIds([])
    setProductNotice('')
    setStep('write')
  }
  const showStep = (content: ReactNode, title: string, backdropClassName: string, onExit = close) => standalone
    ? <main className="inquiry-mobile-page inquiry-flow-page">{content}</main>
    : <DialogLayer asChild backdropClassName={backdropClassName} focusKey={step} isOpen onClose={onExit} showTitle={false} title={title}>{content}</DialogLayer>

  if (step === 'product' && addingProducts) return showStep(
    <ProductChoiceContent
      standalone={standalone}
      title={`문의 상품 추가 (${additionalProducts.length})`}
      variant="addition"
      actionLabel="추가하기"
      allowEmpty={false}
      maxSelection={Math.max(0, 20 - selectedIds.length)}
      notice={rcpcs.isPending
        ? <LoadingState className="route-loading--compact" label="문의 가능한 상품을 확인하고 있습니다." />
        : rcpcs.isError
          ? <p role="alert">문의 가능한 상품을 불러오지 못했습니다. <button onClick={() => void rcpcs.refetch()} type="button">다시 시도</button></p>
          : !additionalProducts.length ? <p>추가할 수 있는 RCPC가 없습니다.</p> : null}
      selectionNotice={productNotice}
      onClose={closeProductPicker}
      onNext={() => {
        const additions = additionalProducts.filter(product => additionalIds.includes(Number(product.rcpcId)))
        if (!additions.length || additions.length !== additionalIds.length || selectedIds.length + additions.length > 20) return
        if (!hasSameInquiryServerRoom([...selectedProducts, ...additions])) { setProductNotice(bulkInquiryServerRoomNotice); return }
        setSelectedIds([...new Set([...selectedIds, ...additionalIds])])
        closeProductPicker()
      }}
      onSelectedChange={ids => { setProductNotice(''); setAdditionalIds([...new Set(ids)]) }}
      products={additionalProducts}
      selectedIds={additionalIds}
    />, '문의 상품 추가', 'inquiry-preview-layer inquiry-detail-preview', closeProductPicker)

  if (step === 'product') return showStep(
    <ProductChoiceContent
      standalone={standalone}
      allowEmpty={!hasFixedTarget}
      lockedIds={hasFixedTarget ? fixedIds : []}
      filters={hasFixedTarget ? undefined : <label className="inquiry-product-choice__room"><span>서버실</span><NativeSelect aria-label="문의 상품 서버실" disabled={rcpcs.isPending || rcpcs.isError} value={serverRoomId ?? ''} onChange={event => {
          const id = event.target.value ? Number(event.target.value) : null
          if (id === serverRoomId || (id !== null && !serverRooms.some(room => room.id === id))) return
          setServerRoomId(id)
          setSelectedIds([])
          setTypeIndex(null)
          setProductNotice('')
          setTypeNotice('')
          create.reset()
        }}><option value="">전체 서버실</option>{serverRooms.map(room => <option key={room.id} value={String(room.id)}>{room.name}</option>)}</NativeSelect></label>}
      notice={<>{rcpcs.isPending
        ? <LoadingState className="route-loading--compact" label="문의 가능한 상품을 확인하고 있습니다." />
        : rcpcs.isError
          ? <p role="alert">문의 가능한 상품을 불러오지 못했습니다. <button onClick={() => void rcpcs.refetch()} type="button">다시 시도</button></p>
          : visibleProducts.length === 0 ? <p>문의 가능한 RCPC가 없습니다.</p> : null}</>}
      selectionNotice={productNotice}
      onClose={closeProductPicker}
      onEmpty={() => { setSelectedIds([]); setProductNotice(''); setAddingProducts(false); setTypeIndex(null); setTypeNotice(''); create.reset(); setStep('type') }}
      onNext={() => {
        if (hasMissingTargets || selectedIds.length > 20) return
        if (!hasSameInquiryServerRoom(selectedProducts)) { setProductNotice(bulkInquiryServerRoomNotice); return }
        setProductNotice('')
        setTypeIndex(null); setTypeNotice(''); setStep('type')
      }}
      onSelectedChange={(ids) => { setProductNotice(''); setSelectedIds([...new Set([
        ...(hasFixedTarget ? fixedIds : []), ...ids,
      ])]) }}
      products={visibleProducts}
      selectedIds={selectedIds}
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
        const targetNotice = validateTargets()
        if (targetNotice) {
          setTypeNotice(rcpcs.isPending ? '문의 대상 RCPC를 확인하고 있습니다.' : targetNotice)
          return
        }
        if (!hasSameInquiryServerRoom(selectedProducts)) {
          setTypeNotice(bulkInquiryServerRoomNotice)
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
          if (!create.isPending && !submitting.current && selectedCode && message.trim()) {
            submitting.current = true
            create.mutate()
          }
        },
      }}
      inquiryType={selectedCode ? inquiryTypes[selectedCode] : ''}
      onBack={() => setStep('type')}
      onAddProducts={() => { setProductNotice(''); setAdditionalIds([]); setAddingProducts(true); setStep('product') }}
      onClose={close}
      selectedRcpcs={selectedProducts}
      submitLabel={standalone ? '전송' : '문의 접수'}
    />
  return standalone ? <main className="inquiry-mobile-page">{write}</main> : <InquiryWritePopup backdropClassName="inquiry-preview-layer inquiry-preview-layer--write" onClose={close}>{write}</InquiryWritePopup>
}

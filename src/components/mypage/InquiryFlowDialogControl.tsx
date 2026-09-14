import { useInquiryDrafts } from '@/routes/mypage/-components/hooks/useAccountDrafts'
import { inquiryDraftSchema, type InquiryDraft } from '@/domain/myAccount/draftServices'
import type { InquiryFlowDialogProps, InquiryTarget, InquiryStep } from './inquiryFlowTypes'
import { useCallback, useRef, useState } from 'react'
import { Modal } from '../ui/ModalControl'
import { InquiryTypeChoicePopup, TypeChoiceContent, inquiryTypes } from './InquiryFlowContent'
import { InquiryWriteContent, InquiryWritePopup } from './InquiryFlowContent'

// A contextual entry already owns its PC selection; only type and writing remain.
export function useInquiryFlow() {
  const drafts = useInquiryDrafts()
  const busy = useRef(false)
  const [notice, setNotice] = useState('')
  const [step, setStep] = useState<InquiryStep>(null)
  const [rcpcs, setRcpcs] = useState<InquiryTarget[]>([])
  const [typeIndex, setTypeIndex] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const sentMessages: readonly string[] = []
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const close = useCallback(() => { if (!busy.current) setStep(null) }, [])
  const open = useCallback((selectedRcpcs: readonly InquiryTarget[], trigger?: HTMLElement | null, initialStep: string = 'select-type', selectedDraft?: InquiryDraft, allowEmptyGeneral = false) => {
    if (busy.current) return
    const targets = selectedRcpcs
      .filter((rcpc) => rcpc && rcpc.rcpcId !== undefined && rcpc.rcpcId !== null && String(rcpc.rcpcId).trim())
      .map((rcpc) => ({ ...rcpc }))
    returnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setRcpcs(targets)
    const ids = targets.map((target) => String(target.rcpcId)).sort()
    const saved = selectedDraft ?? [...(drafts.data ?? [])].reverse().find((draft) => !draft.inquiryId && [...draft.rcpcIds].sort().join('|') === ids.join('|'))
    setTypeIndex(saved ? inquiryTypes.indexOf(saved.type) : allowEmptyGeneral && targets.length === 0 ? inquiryTypes.indexOf('기타 문의') : initialStep === 'write' ? 1 : null)
    setMessage(saved?.message ?? '')
    setNotice('')
    setStep(targets.length ? initialStep === 'write' ? 'write' : 'select-type' : allowEmptyGeneral ? 'write' : 'selection-required')
  }, [drafts.data])
  const sendMessage = async () => {
    if (busy.current || typeIndex === null) return
    const ids = rcpcs.map((pc) => String(pc.rcpcId)).sort()
    const parsed = inquiryDraftSchema.safeParse({ key: `new:${typeIndex}:${ids.join(',')}`, inquiryId: null, type: inquiryTypes[typeIndex], rcpcIds: ids, message })
    if (!parsed.success) { setNotice(parsed.error.issues[0]?.message ?? '입력 내용을 확인해 주세요.'); return }
    busy.current = true
    try { await drafts.save.mutateAsync(parsed.data); setNotice('문의 초안을 저장했습니다.') }
    catch (error) { setNotice(error instanceof Error ? error.message : '초안 저장에 실패했습니다.') }
    finally { busy.current = false }
  }
  return {
    open,
    close,
    dialogProps: {
      step, rcpcs, typeIndex, returnFocusRef,
      onClose: close,
      onTypeChange: setTypeIndex,
      onNext: () => { if (typeIndex !== null && inquiryTypes[typeIndex]) setStep('write') },
      onBack: () => { if (!busy.current) setStep('select-type') },
      composer: { message, sentMessages, notice, pending: drafts.save.isPending, onMessageChange: setMessage, onSend: sendMessage },
    },
  }
}

export function InquiryFlowDialog({ step, rcpcs, typeIndex, onClose, onTypeChange, onNext, onBack, returnFocusRef, composer }: InquiryFlowDialogProps) {
  if (step === 'selection-required') {
    return <Modal closeLabel="확인" closeVariant="primary" isOpen onClose={onClose} returnFocusRef={returnFocusRef} title="RCPC 선택 안내"><p>먼저 RCPC를 선택해 주세요.</p></Modal>
  }
  if (step === 'select-type') {
    return <InquiryTypeChoicePopup backdropClassName="inquiry-preview-layer inquiry-preview-layer--select-type" onClose={onClose} returnFocusRef={returnFocusRef}><TypeChoiceContent backLabel="문의 취소" onBack={onClose} onClose={onClose} onNext={onNext} onSelectedChange={onTypeChange} selectedIndex={typeIndex} /></InquiryTypeChoicePopup>
  }
  if (step === 'write' && typeIndex !== null && inquiryTypes[typeIndex]) {
    return <InquiryWritePopup backdropClassName="inquiry-preview-layer inquiry-preview-layer--write" onClose={onClose} returnFocusRef={returnFocusRef}><InquiryWriteContent composer={composer} inquiryType={inquiryTypes[typeIndex]} onBack={onBack} onClose={onClose} selectedRcpcs={rcpcs} /></InquiryWritePopup>
  }
  return null
}

import { useState } from 'react'
import { Modal } from '@/components/ui/ModalControl'

// Mount only while access is denied, so simultaneous query failures share one notice.
export function AccountReadDeniedDialog({ resource }: { resource: string }) {
  const [open, setOpen] = useState(true)
  return <Modal closeLabel="확인" closeVariant="primary" isOpen={open} onClose={() => setOpen(false)} title="이용 권한 안내">
    <p>{resource} 조회 권한이 없습니다. 대표 관리자에게 권한을 요청해 주세요.</p>
  </Modal>
}

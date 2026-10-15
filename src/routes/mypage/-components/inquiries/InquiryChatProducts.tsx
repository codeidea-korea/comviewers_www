import type { ReactNode } from 'react'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { InquiryProductsPanel } from '@/components/mypage/InquiryProductsPanel'
import type { MyRcpcItem } from '@/api/myRcpc'
import { toInquiryChoice } from '../inquiryChoice'

type ChatTarget = Awaited<ReturnType<InquiryReadServices['chat']>>['operationRequest']['targets'][number]

export function InquiryChatProducts({ targets, status, standalone, onBack, onClose, onSelect, children, rcpcItems = [] }: {
  children?: ReactNode
  rcpcItems?: readonly MyRcpcItem[]
  targets: readonly ChatTarget[]
  status: string
  standalone: boolean
  onBack: () => void
  onClose: () => void
  onSelect: (productNo: string) => void
}) {
  const products = targets.map((target, index) => {
    const item = rcpcItems.find(item => item.pcAssetId === target.pcAssetId)
    const details = item ? toInquiryChoice(item) : undefined
    return {
      key: `${target.targetType ?? 'target'}:${target.pcAssetId ?? target.productId ?? index}`,
      productNo: target.productNo,
      alias: target.alias,
      location: target.serverRoomName,
      spec: details?.spec,
      orderDate: details?.orderDate,
      period: details?.period,
    }
  })
  return <InquiryProductsPanel products={products} status={status} standalone={standalone} onBack={onBack} onClose={onClose} onSelect={onSelect}>{children}</InquiryProductsPanel>
}

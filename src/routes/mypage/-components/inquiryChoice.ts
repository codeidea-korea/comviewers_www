import type { InquiryTarget } from '../../../components/mypage/inquiryFlowTypes'
import type { MyRcpcItem } from '@/api/myRcpc'
import { serverStatusLabels } from './rcpcPresentation'

export type InquiryChoice = InquiryTarget & {
  productNo: string
  productName: string
  state: string
  orderDate: string
  period: string
  spec: string
  statusRank: number
}

const statusRanks: Record<MyRcpcItem['serverStatus'], number> = {
  needs_attention: 0,
  format_waiting: 1,
  extension_waiting: 2,
  running: 3,
  ended: 4,
}

function formatSpec(item: MyRcpcItem): string {
  const spec = item.pcSpec
  if (!spec) return 'PC 사양 정보 없음'
  const storage = [spec.ssdGb === null ? '' : `SSD ${spec.ssdGb}GB`, spec.hddGb === null ? '' : `HDD ${spec.hddGb}GB`].filter(Boolean).join(' / ')
  return [
    [spec.osName, spec.osArchitecture].filter(Boolean).join(' '),
    [spec.cpuBrand, spec.cpuModel].filter(Boolean).join(' '),
    spec.ramGb === null ? '' : `RAM ${spec.ramGb}GB${spec.ramType ? ` ${spec.ramType}` : ''}`,
    storage,
    [spec.gpuBrand, spec.gpuModel].filter(Boolean).join(' '),
  ].filter(Boolean).join(' · ') || 'PC 사양 정보 없음'
}

export function toInquiryChoice(item: MyRcpcItem): InquiryChoice {
  return {
    selectionId: String(item.pcAssetId),
    rcpcId: item.pcAssetId,
    alias: item.preference.alias || '별명 미설정',
    productNo: item.productNo,
    productName: item.productTitle ?? '상품명 정보 없음',
    location: item.serverRoomName ?? '서버실 정보 없음',
    state: serverStatusLabels[item.serverStatus],
    orderDate: item.orderedAt?.slice(0, 10) ?? '-',
    period: item.serviceStartedAt || item.serviceEndExclusiveDate ? `${item.serviceStartedAt?.slice(0, 10) ?? '-'} ~ ${item.serviceEndExclusiveDate ?? '-'}` : '-',
    spec: formatSpec(item),
    statusRank: statusRanks[item.serverStatus],
  }
}

export function sortInquiryChoices(items: readonly MyRcpcItem[], initialProductNo = ''): InquiryChoice[] {
  return items.map(toInquiryChoice).sort((left, right) =>
    Number(right.productNo === initialProductNo) - Number(left.productNo === initialProductNo)
    || left.statusRank - right.statusRank
    || left.productNo.localeCompare(right.productNo, 'ko', { numeric: true }))
}

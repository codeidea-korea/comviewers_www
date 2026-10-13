import type { InquiryTarget } from '../../../components/mypage/inquiryFlowTypes'
import type { MyRcpcItem } from '@/api/myRcpc'
import { connectionLabels } from './rcpcPresentation'

export type InquiryChoice = InquiryTarget & {
  productNo: string
  productName: string
  state: string
  orderDate: string
  period: string
  spec: string
  statusRank: number
  serverRoomBusinessKey?: string | null
}

const statusRanks: Record<string, number> = {
  STALE: 0,
  OFFLINE: 1,
  NEVER_CONNECTED: 2,
  ONLINE: 3,
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
    serverRoomBusinessKey: item.serverRoomBusinessKey,
    state: connectionLabels[item.connectionStatus.toUpperCase()] ?? '미확인',
    orderDate: item.orderedAt?.slice(0, 10) ?? '-',
    period: item.serviceStartedAt || item.serviceEndExclusiveDate ? `${item.serviceStartedAt?.slice(0, 10) ?? '-'} ~ ${item.serviceEndExclusiveDate ?? '-'}` : '-',
    spec: formatSpec(item),
    statusRank: statusRanks[item.connectionStatus.toUpperCase()] ?? 4,
  }
}

export function sortInquiryChoices(items: readonly MyRcpcItem[], initialProductNo = ''): InquiryChoice[] {
  return items.map(toInquiryChoice).sort((left, right) =>
    Number(right.productNo === initialProductNo) - Number(left.productNo === initialProductNo)
    || left.statusRank - right.statusRank
    || left.productNo.localeCompare(right.productNo, 'ko', { numeric: true }))
}

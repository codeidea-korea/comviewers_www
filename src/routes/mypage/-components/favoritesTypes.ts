import type { InquiryTarget } from '@/components/mypage/inquiryFlowTypes'
import type { AccountRcpc } from '@/domain/myAccount/services'

export type TargetAction = (items: InquiryTarget[], trigger: HTMLButtonElement) => void

export type OpenRcpc = (type: string, item: AccountRcpc, trigger: HTMLButtonElement) => void

export const getFavoriteRcpc = (item: AccountRcpc): InquiryTarget => ({ alias: item.alias, location: `${item.company}/${item.center}`, rcpcId: item.rcpcId, selectionId: item.id })

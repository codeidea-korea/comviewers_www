import type { AccountRcpc } from '@/domain/myAccount/services';

export type RcpcView = AccountRcpc & { aliasUnset?: boolean }

export type InquiryTarget = { selectionId: string; rcpcId: string; alias: string; location: string }

export type OpenRcpc = (type: string, rcpc: RcpcView, trigger: HTMLButtonElement) => void

export const getInquiryRcpc = (rcpc: RcpcView, manager = false) => ({
  selectionId: rcpc.id,
  rcpcId: rcpc.rcpcId,
  alias: !manager && rcpc.aliasUnset ? rcpc.rcpcId : rcpc.alias,
  location: `${rcpc.company}/${rcpc.center}`,
})

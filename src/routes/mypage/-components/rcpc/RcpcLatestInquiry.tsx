import type { MyRcpcItem } from '@/api/myRcpc'
import { useUiTranslation } from '@/i18n/uiTranslation'
import { useServices } from '@/app/ServiceProvider'
import { customerStatusLabel, inquiryTypeLabel } from '../InquiryPresentation'
import { InquiryAction } from '../inquiries/InquiryAction'

export function RcpcLatestInquiry({ item }: { item: MyRcpcItem }) {
  const { uiText } = useUiTranslation()
  const { myAccount } = useServices()
  const inquiry = myAccount.inquiryApi ? item.latestInquiry : null
  if (!inquiry) return <span>-</span>
  return <InquiryAction appearance="text" className="rcpc-latest-inquiry__action" requestId={inquiry.operationRequestId}>
    {uiText(inquiryTypeLabel(inquiry.requestType))} · {uiText(customerStatusLabel(inquiry.customerVisibleStatus))}
  </InquiryAction>
}

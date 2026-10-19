import { useLocation, useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { Button } from '@/components/ui/ButtonControl'
import { useUiTranslation } from '@/i18n/uiTranslation'
import { managerScopedPath } from '../managerPortalPath'

/** Individual RCPC quick action searches existing inquiries; bulk creation uses InquiryAction. */
export function InquirySearchAction({ productNo, disabled = false }: { productNo: string; disabled?: boolean }) {
  const { myAccount } = useServices()
  const { uiText } = useUiTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  return <Button size="small" variant="secondary" disabled={disabled || !myAccount.inquiryApi || !productNo} onClick={() => {
    navigate(managerScopedPath(`/mypage/inquiries?productNo=${encodeURIComponent(productNo)}&exactProductNo=true`, location.pathname))
  }}>{uiText('문의')}</Button>
}

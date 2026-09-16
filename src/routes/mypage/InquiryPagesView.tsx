import { useServices } from '@/app/ServiceProvider'
import { MyPageLayout } from './MypageComponentsView'
import { InquiryDetailContent, InquiryListContent } from './-components/HttpInquiryPages'

function useInquiryServices() {
  const { myAccount } = useServices()
  if (!myAccount.inquiryApi || !myAccount.rcpcApi) return null
  return { api: myAccount.inquiryApi, rcpcApi: myAccount.rcpcApi }
}

export function InquiryListPage() {
  const services = useInquiryServices()
  if (!services) return <MyPageLayout title="문의 관리"><p role="alert">문의 기능을 불러오지 못했습니다.</p></MyPageLayout>
  return <InquiryListContent {...services} />
}

export function InquiryDetailPage() {
  const services = useInquiryServices()
  if (!services) return <MyPageLayout title="문의 상세"><p role="alert">문의 상세를 불러오지 못했습니다.</p></MyPageLayout>
  return <InquiryDetailContent {...services} />
}

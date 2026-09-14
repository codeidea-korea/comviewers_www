import { useServices } from '@/app/ServiceProvider'
import { HttpInquiryDetail, HttpInquiryList } from './-components/HttpInquiryPages'

function useInquiryServices() {
  const { myAccount } = useServices()
  if (!myAccount.inquiryApi || !myAccount.rcpcApi) {
    throw new Error('문의 API가 연결되지 않았습니다.')
  }
  return { api: myAccount.inquiryApi, rcpcApi: myAccount.rcpcApi }
}

export function InquiryListPage() {
  const services = useInquiryServices()
  return <HttpInquiryList {...services} />
}

export function InquiryDetailPage() {
  const services = useInquiryServices()
  return <HttpInquiryDetail {...services} />
}

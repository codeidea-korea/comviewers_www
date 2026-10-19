import { useUiTranslation } from '@/i18n/uiTranslation'
import { useServices } from '@/app/ServiceProvider'
import { MyPageLayout } from './MypageComponentsView'
import { InquiryDetailContent, InquiryListContent } from './-components/inquiries/InquiryPagesContent'
import { useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { InquiryCreateDialog } from './-components/InquiryCreateDialog'
import { managerScopedPath } from './-components/managerPortalPath'
import { invalidateInquiryQueries } from '@/lib/inquiryQueryCache'

const inquiryCreateState = z.object({ initialIds: z.array(z.number().int().positive().safe()).max(20).default([]), initialProductNo: z.string().max(16).default(''), fixedTarget: z.boolean().default(false) })

export function InquiryCreatePage() {
  const { uiText } = useUiTranslation()
  const services = useInquiryServices()
  const location = useLocation()
  const navigate = useNavigate()
  const client = useQueryClient()
  const parsed = inquiryCreateState.safeParse(location.state ?? {})
  const initial = parsed.success ? parsed.data : { initialIds: [], initialProductNo: '', fixedTarget: false }
  if (!services) return <MyPageLayout title={uiText("문의 작성")}><p role="alert">{uiText("문의 기능을 불러오지 못했습니다.")}</p></MyPageLayout>
  return <InquiryCreateDialog {...services} {...initial} standalone onClose={() => navigate(managerScopedPath('/mypage/inquiries', location.pathname))} onCreated={async id => {
    navigate(managerScopedPath(`/mypage/inquiries/${id}`, location.pathname), { replace: true })
    await invalidateInquiryQueries(client, services.api.organizationId)
  }}/>
}

function useInquiryServices() {
  const { myAccount } = useServices()
  if (!myAccount.inquiryApi || !myAccount.rcpcApi) return null
  return { api: myAccount.inquiryApi, rcpcApi: myAccount.rcpcApi }
}

export function InquiryListPage() {
  const { uiText } = useUiTranslation()
  const services = useInquiryServices()
  if (!services) return <MyPageLayout title={uiText("문의 관리")}><p role="alert">{uiText("문의 기능을 불러오지 못했습니다.")}</p></MyPageLayout>
  return <InquiryListContent {...services} />
}

export function InquiryDetailPage() {
  const { uiText } = useUiTranslation()
  const services = useInquiryServices()
  if (!services) return <MyPageLayout title={uiText("문의 상세")}><p role="alert">{uiText("문의 상세를 불러오지 못했습니다.")}</p></MyPageLayout>
  return <InquiryDetailContent {...services} />
}

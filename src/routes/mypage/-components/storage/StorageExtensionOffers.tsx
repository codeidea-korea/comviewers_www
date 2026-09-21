import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useSession } from '@/app/session/SessionProvider'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { accountMoney } from '../shared/AccountReadCommon'

export function StorageExtensionOffers({ api }: { api: MyRcpcReadServices }) {
  const session = useSession()
  const offers = useQuery({
    queryKey: ['my-rcpcs', api.organizationId, 'extension-offers'],
    queryFn: () => api.extensionCheckout.offers(),
    retry: false,
  })
  if (offers.isPending) return null
  if (offers.isError) return <p role="alert">기간 연장 제안을 불러오지 못했습니다. <button type="button" onClick={() => void offers.refetch()}>다시 시도</button></p>
  if (!offers.data.length) return null
  const canCheckout = session.status === 'authenticated' && session.customerSession?.memberRole === 'owner' && session.customerSession.commerceAvailable
  return <section className="storage-extension-offers" aria-label="기간 연장 결제 대기">
    <h2>기간 연장 결제 대기</h2>
    {offers.data.map(offer => <article key={offer.id}>
      <strong>품번 {offer.productNo} · {offer.title}</strong>
      <p>{offer.serverRoomName ?? '서버실 미등록'} · {offer.addedDays}일 연장 · {accountMoney(offer.quotedAmount)}</p>
      <p>현재 종료 {offer.previousEnd.replace('T', ' ')} · 연장 후 {offer.targetEnd.replace('T', ' ')}</p>
      {canCheckout ? <Link to="/mypage/extension-checkout" state={{
        selection: { rentalIds: [offer.rentalId], addedDays: offer.addedDays, pointAmount: 0 }, offerIds: [offer.id],
      }}>연장 주문서 작성</Link> : <p>대표관리자만 연장 주문을 진행할 수 있습니다.</p>}
    </article>)}
  </section>
}

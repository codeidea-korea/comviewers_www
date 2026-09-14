import type { ReactNode } from 'react'
import { AppShell } from '../../components/layout/AppShellView'
import { orderFixture } from '../../mocks/commerce'
import { CheckoutCompletePresentation, type CheckoutCompleteProduct } from './-components/CheckoutCompletePresentation'

const productSpec = 'Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores / DDR3 128G / SSD 120GB / NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB) '

export function CheckoutCompletePage() {
  const virtual = new URLSearchParams(window.location.search).get('publishingState') === 'virtual-account'
  const paymentRows: [string, ReactNode][] = [
    ['주문번호', orderFixture.orderNumber],
    ['주문일시', orderFixture.orderedAt],
    ['결제방식', virtual ? '가상계좌' : '카드결제'],
    ['결제금액', orderFixture.amount],
    ...(virtual ? ([
      ['입금자명', <strong>{orderFixture.depositor}</strong>],
      ['입금계좌', <strong>{orderFixture.account}</strong>],
      ['입금기한', <span className="complete-deadline"><strong>{orderFixture.dueAt}</strong><em>* 주문 후 30분 이내 미입금 시 자동 취소됩니다.</em></span>],
    ] satisfies [string, ReactNode][]) : []),
  ]
  const products: CheckoutCompleteProduct[] = Array.from({ length: virtual ? 1 : 2 }, (_, index) => ({
    key: `preview-${index}`,
    title: '게임용 RCPC',
    productNo: '89023',
    serverRoom: 'IRC코리아/메가서버실',
    spec: productSpec,
    specLabel: 'PC사양',
    availability: '바로 접속 가능',
    monthlyRentalFee: '29,000원',
    usagePeriod: virtual ? '입금 완료 즉시 ~ 30일' : '2026-07-01 17:23:59 ~ 2026-07-31 17:23:59',
  }))

  return (
    <AppShell className={`commerce-shell complete-page complete-page--api ${virtual ? 'complete-page--virtual' : 'complete-page--card'}`}>
      <div className="content-container commerce-page">
        <CheckoutCompletePresentation
          title={virtual ? '주문완료' : '결제완료'}
          products={products}
          paymentRows={paymentRows}
          contactRows={[["이름", "김컴뷰"], ["메신저ID", "텔레그램 / IDID"], ["핸드폰", virtual ? "010-1234-5678" : "-"], ["Email", "email@mydomain.com"]]}
          receiptRows={virtual ? [["신청 여부", "개인 소득공제용"], ["신청 정보", "010-1234-5678"]] : undefined}
          showRemoteInfo={!virtual}
        />
      </div>
    </AppShell>
  )
}

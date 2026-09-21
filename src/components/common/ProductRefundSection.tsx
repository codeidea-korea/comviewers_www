import { usePublicLegalDocuments } from '@/domain/legal/usePublicLegalDocuments'
import type { Product } from '@/domain/products/types'
import { LoadingState } from '@/components/ui/LoadingStateControl'

const scopeLabel: Record<NonNullable<Product['refundPolicy']>['scopeType'], string> = {
  product: '상품별 정책',
  server_room: '서버실 정책',
  global: '기본 정책',
}

function PolicyDocumentBlock({ kind, title }: { kind: 'refund' | 'point'; title: string }) {
  const query = usePublicLegalDocuments(kind)
  if (query.isPending) return <LoadingState className="route-loading--compact" label={`${title} 문서를 불러오는 중입니다.`} />
  if (query.isError) return <p role="alert">{title} 문서를 불러오지 못했습니다.</p>
  const document = query.data[0]
  if (!document) return <p role="status">발행된 {title} 문서가 없습니다.</p>
  return (
    <article>
      <h3>{document.title}</h3>
      <p>버전 {document.version} · 적용일 <time dateTime={document.effectiveDate}>{document.effectiveDate}</time></p>
      {document.paragraphs.map((paragraph, index) => <p key={index} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{paragraph}</p>)}
    </article>
  )
}

export function ProductRefundSection({ product }: { product?: Product }) {
  const policy = product?.refundPolicy ?? null
  return (
    <section id="refund">
      <h2>환불 규정</h2>
      <div className="refund-box">
        {product ? (
          policy ? (
            <article>
              <h3>이 상품의 적용 환불 정책</h3>
              <dl>
                <div><dt>적용 범위</dt><dd>{scopeLabel[policy.scopeType]}</dd></div>
                <div><dt>정책명</dt><dd>{policy.policyName}</dd></div>
                <div><dt>버전</dt><dd>{policy.version}</dd></div>
                <div><dt>적용 시작</dt><dd><time dateTime={policy.effectiveFrom}>{policy.effectiveFrom.slice(0, 10)}</time></dd></div>
                {policy.effectiveTo ? <div><dt>적용 종료</dt><dd><time dateTime={policy.effectiveTo}>{policy.effectiveTo.slice(0, 10)}</time></dd></div> : null}
              </dl>
            </article>
          ) : <p role="status">이 상품에 적용할 수 있는 발행 환불 정책이 없습니다. 주문 전 서버실 담당자에게 환불 기준을 확인해 주세요.</p>
        ) : null}
        <PolicyDocumentBlock kind="refund" title="취소·환불 정책" />
        <PolicyDocumentBlock kind="point" title="포인트 정책" />
      </div>
    </section>
  )
}

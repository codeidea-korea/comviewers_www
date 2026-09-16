import type { useHomeContent } from './hooks/useHomeContent'
import { ProductCard } from '../../../components/product/ProductCardView'
import { LoadingState } from '../../../components/ui/LoadingStateControl'
import { SectionHeading } from './HomeSectionHeading'

export function HomeRecommendedSection({ content, selectedOptionId, onOptionChange }: { content: ReturnType<typeof useHomeContent>; selectedOptionId: number | null; onOptionChange: (optionId: number | null) => void }) {
  const query = content.recommended
  const recommendedProducts = query.data?.items ?? []
  const productCounts = new Map(content.recommendedUseMetadata.data?.optionCounts.map(item => [item.optionId, item.productCount] as const) ?? [])
  const recommendedOptions = content.recommendedUseMetadata.data?.groups
    .filter(group => group.categoryCode === 'recommended_use')
    .flatMap(group => group.options)
    .filter(option => (productCounts.get(option.id) ?? 0) > 0) ?? []
  const productListHref = selectedOptionId === null ? '/products' : `/products?filterOptionId=${selectedOptionId}`
  return (
      <section className="home-section products-section">
        <div className="content-container">
          <SectionHeading description="원하는 작업 환경에 맞춰 최적의 RCPC를 선택하고 안정적으로 이용해보세요." link={productListHref}>추천 RCPC</SectionHeading>
          <div aria-label="추천 RCPC 카테고리" className="category-tabs" role="group">
            <button aria-pressed={selectedOptionId === null} onClick={() => onOptionChange(null)} type="button">전체</button>
            {recommendedOptions.map(option => <button aria-pressed={selectedOptionId === option.id} key={option.id} onClick={() => onOptionChange(option.id)} type="button">{option.label}</button>)}
          </div>
          {content.recommendedUseMetadata.isError ? <p className="home-recommended-filter-error" role="alert">추천용도 필터를 불러오지 못했습니다. <button onClick={() => void content.recommendedUseMetadata.refetch()} type="button">다시 시도</button></p> : null}
          <div className="home-product-grid">{query.isPending ? <LoadingState className="route-loading--compact" label="추천 상품을 불러오는 중입니다." /> : query.isError ? <div className="home-product-grid__state home-product-grid__state--error" role="alert"><p>추천 상품을 불러오지 못했습니다.</p><button onClick={() => void query.refetch()} type="button">다시 시도</button></div> : !recommendedProducts.length ? <p className="home-product-grid__state">조건에 맞는 추천 상품이 없습니다.</p> : null}{recommendedProducts.map((product) => <ProductCard image={product.image ?? undefined} key={product.id} product={product} />)}</div>
        </div>
      </section>
  )
}

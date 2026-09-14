import type { useHomeContent } from './hooks/useHomeContent'
import { ProductCard } from '../../../components/product/ProductCardView'
import { LoadingState } from '../../../components/ui/LoadingStateControl'
import { SectionHeading } from './HomeSectionHeading'

const recommendedCategories = ['전체', '게임용', '광고마케팅', '스트리밍']

export function HomeRecommendedSection({ query, category: selectedCategory, onCategoryChange }: { query: ReturnType<typeof useHomeContent>['recommended']; category: string; onCategoryChange: (category: string) => void }) {
  const recommendedProducts = query.data?.items ?? []
  const selectedPurpose = selectedCategory === '스트리밍' ? '방송·스트리밍용' : selectedCategory
  const productListHref = selectedCategory === '전체' ? '/products' : `/products?purpose=${encodeURIComponent(selectedPurpose)}`
  return (
      <section className="home-section products-section">
        <div className="content-container">
          <SectionHeading description="원하는 작업 환경에 맞춰 최적의 RCPC를 선택하고 안정적으로 이용해보세요." link={productListHref}>추천 RCPC</SectionHeading>
          <div aria-label="추천 RCPC 카테고리" className="category-tabs" role="group">{recommendedCategories.map((category) => <button aria-pressed={selectedCategory === category} key={category} onClick={() => onCategoryChange(category)} type="button">{category}</button>)}</div>
          <div className="home-product-grid">{query.isPending ? <LoadingState className="route-loading--compact" label="추천 상품을 불러오는 중입니다." /> : query.isError ? <p role="alert">추천 상품을 불러오지 못했습니다. <button type="button" onClick={() => void query.refetch()}>다시 시도</button></p> : !recommendedProducts.length ? <p>조건에 맞는 추천 상품이 없습니다.</p> : null}{recommendedProducts.map((product) => <ProductCard image={product.image ?? undefined} key={product.id} product={product} />)}</div>
        </div>
      </section>
  )
}

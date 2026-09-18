import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const source = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')

test('상품 drawer는 overlay에서 본문을 밀지 않고 모바일 header로 닫는다', () => {
  const page = source('src/routes/commerce/ProductListView.tsx')
  const filter = source('src/routes/commerce/-components/ProductFiltersView.tsx')
  const mobileStyles = source('src/styles/mobile-products.css')
  const commerceStyles = source('src/styles/commerce.css')

  assert.match(page, /products-body\$\{filterOpen && !filterDrawer/)
  assert.match(page, /products-layout\$\{filterOpen && !filterDrawer/)
  assert.match(page, /<DialogLayer[\s\S]*<ProductFilter[^>]*drawer facets=\{facets\} filterRef=\{filterRef\} mobile=\{mobileViewport\}/)
  assert.match(commerceStyles, /\.product-filter-drawer-layer \.product-filter--drawer \{[\s\S]*?box-sizing: border-box/)
  assert.match(filter, /product-filter-mobile-header/)
  assert.match(filter, /aria-label="상세 필터 닫기"/)
  assert.match(mobileStyles, /product-filter--drawer > \.product-filter__caption,[\s\S]*product-filter--drawer > \.product-filter__close \{ display: none; \}/)
})

test('상품 hero와 추천 상품 실패 상태는 단일 배경과 공통 상태 컨테이너를 사용한다', () => {
  const pagesStyles = source('src/styles/pages.css')
  const commerceStyles = source('src/styles/commerce.css')
  const responsiveStyles = source('src/styles/responsive.css')
  const homeSection = source('src/routes/home/-components/HomeRecommendedSection.tsx')

  assert.match(commerceStyles, /\.products-hero \{[^}]*background: #1d2143;[^}]*overflow: hidden;[^}]*position: relative;/)
  assert.match(commerceStyles, /\.products-hero::before \{[^}]*background: url\('\.\.\/assets\/figma\/products-hero\.png'\)[^}]*position: absolute;/)
  assert.match(responsiveStyles, /\.products-hero \{ height: 220px; \}/)
  assert.match(responsiveStyles, /\.products-hero::before \{ background-size: auto 100%; \}/)
  assert.match(homeSection, /home-product-grid__state--error/)
  assert.match(pagesStyles, /home-product-grid__state--error button:focus-visible \{ outline: 2px solid var\(--color-primary-500\)/)
  assert.match(commerceStyles, /product-results-state__retry:focus-visible \{ outline: 2px solid var\(--color-primary-500\)/)
  assert.doesNotMatch(`${pagesStyles}\n${commerceStyles}`, /outline:\s*2px solid var\(--color-primary\)/)
})

test('모바일 상품 목록은 콘텐츠 높이에 맞춰 pagination 뒤 빈 영역을 만들지 않는다', () => {
  const mobileStyles = source('src/styles/mobile-products.css')
  const responsiveStyles = source('src/styles/responsive.css')

  assert.doesNotMatch(
    mobileStyles,
    /(?:^|})\s*[^{}]*\.products-body[^{}]*\{[^{}]*\bmin-height\s*:\s*(?!0+(?:\.0+)?px\b)(?:\d+(?:\.\d+)?|\.\d+)px\b/i,
  )
  assert.match(responsiveStyles, /\.products-body,\s*\.products-body--filter-open \{ min-height: 0; \}/)
})

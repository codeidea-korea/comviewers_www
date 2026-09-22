import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('U15/U16 실제 상품 필터는 PDF 문구와 선택 태그 규칙을 따른다', async () => {
  const [list, filters, fallback, fallbackDetail] = await Promise.all([
    readFile(new URL('../src/routes/commerce/ProductListView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/commerce/-components/ProductCatalogFilterControls.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/commerce/-components/ProductListFilterControls.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/commerce/-components/ProductFiltersView.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(list, /<TranslatedText id="product\.comingSoon" \/>/)
  assert.match(await readFile(new URL('../src/i18n/translation-overrides.ts', import.meta.url), 'utf8'), /"key":"product\.comingSoon"[^\n]+"ko":"새로운 상품이 등록될 예정입니다\."/)
  assert.doesNotMatch(list, /조건에 맞는 상품이 없습니다\./)
  assert.match(filters, /categoryCode === 'network' \? '회선'/)
  assert.match(filters, /group\.options\.filter\(option => selectedOptions\.includes\(option\.id\)\)/)
  assert.match(filters, /selectedOptions\.filter\(id => !group\.options\.some\(option => option\.id === id\)\)/)
  assert.match(fallback, /강림3서버실/)
  assert.doesNotMatch(fallback, /강림2서버실/)
  assert.match(fallback, /KT일반\/공용회선/)
  assert.match(fallback, /VPN\/와이어가드/)
  assert.match(fallback, /purpose', label: '게임'/)
  assert.match(fallbackDetail, /id: 'os', label: 'Windows'/)
  assert.match(fallbackDetail, /label: '일반 사양', min: 30000, max: 70000, percent: 34\.2857142857/)
  assert.match(fallbackDetail, /label: '고사양', min: 80000, max: 150000, percent: 65/)
})

test('U17 장바구니 확인 팝업은 저장 완료 후 PDF 구성으로 열린다', async () => {
  const [list, detail, addToCart] = await Promise.all([
    readFile(new URL('../src/routes/commerce/ProductListView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/commerce/ProductDetailView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/commerce/-components/hooks/useAddToCart.ts', import.meta.url), 'utf8'),
  ])

  for (const source of [list, detail]) {
    assert.match(source, /cartAddition\.isSuccess \|\| cartAddition\.isError/)
  }
  assert.match(list, /titleTranslationKey=\{cartAddition\.isError \? 'cart\.addFailureTitle' : 'cart\.addSuccessTitle'\}/)
  assert.match(list, /<TranslatedText id="cart\.addedPrompt" \/>/)
  assert.match(list, /closeTranslationKey="cart\.continueShopping"/)
  assert.match(list, /confirmTranslationKey="cart\.goToCart"/)
  assert.match(detail, /title=\{cartAddition\.isError \? '장바구니 담기 실패' : '장바구니 담기 완료'\}/)
  assert.match(detail, /상품을 장바구니에 담았습니다\.<br \/>장바구니로 이동하시겠습니까\?/)
  assert.match(detail, /closeLabel="계속 쇼핑하기"/)
  assert.match(detail, /confirmLabel="장바구니 이동"/)
  assert.match(addToCart, /isError: mutation\.isError/)
})

test('U18 후기 목록은 PDF 필드만 표시하고 4건 이상일 때만 페이지를 나눈다', async () => {
  const reviews = await readFile(new URL('../src/routes/commerce/-components/ProductReviewSection.tsx', import.meta.url), 'utf8')

  assert.match(reviews, /reviewPageCount > 1 \? <Pagination/)
  assert.doesNotMatch(reviews, />수정됨</)
})

test('U22/U23 완료 화면은 PDF 밖 장식과 결제 결과 우회 링크를 표시하지 않는다', async () => {
  const [complete, payment, styles] = await Promise.all([
    readFile(new URL('../src/routes/commerce/-components/CheckoutCompletePresentation.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/commerce/CheckoutCompleteView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/commerce.css', import.meta.url), 'utf8'),
  ])

  assert.doesNotMatch(complete, /complete-check|>✓</)
  assert.doesNotMatch(complete, />결제 상태 확인</)
  assert.match(payment, /refetchInterval: query => query\.state\.data/)
  assert.match(styles, /\.complete-page--api \.commerce-page \{[^}]*height: auto;[^}]*\}/)
  assert.doesNotMatch(styles, /\.complete-page--api \.commerce-page \{[^}]*min-height:/)
})

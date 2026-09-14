import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

test('포인트·쿠폰 정책 링크는 독립 포인트 정책 문서로 이동한다', () => {
  const benefit = readFileSync(
    `${projectRoot}src/routes/mypage/-components/http/HttpBenefitPages.tsx`,
    'utf8',
  )
  const legal = readFileSync(`${projectRoot}src/routes/legal/LegalPage.tsx`, 'utf8')

  assert.equal(
    benefit.match(/to="\/terms\?section=point">포인트·쿠폰 정책/g)?.length,
    2,
  )
  assert.doesNotMatch(benefit, /to="\/terms\?section=refund">포인트·쿠폰 정책/)
  assert.match(legal, /params\.get\('section'\) === 'point' \? 'point'/)
  assert.match(legal, /<DocumentBody key=\{section\} kind=\{section\}/)
})

test('중도해지 환불 신청의 최종 버튼은 PDF 문구를 사용한다', () => {
  const refund = readFileSync(
    `${projectRoot}src/routes/mypage/-components/InquiryRefundApplication.tsx`,
    'utf8',
  )

  assert.match(refund, /: '환불 신청하기'/)
  assert.doesNotMatch(refund, /: '해지 신청하기'/)
})

test('환불 목록 진입은 후보 상품을 복수 선택하고 구매확정 포인트 회수를 별도로 표시한다', () => {
  const refund = readFileSync(
    `${projectRoot}src/routes/mypage/-components/InquiryRefundApplication.tsx`,
    'utf8',
  )

  assert.match(refund, /const selectFromCandidates = !initialRentalKey/)
  assert.match(refund, /<input type="checkbox" checked=\{checked\}/)
  assert.match(refund, /current\.length < 20 \? \[\.\.\.current, orderItemId\]/)
  assert.match(refund, /<th>프로모션 포인트 공제<\/th><th>구매확정 적립금 회수<\/th>/)
  assert.doesNotMatch(refund, /displayMoney\(item\.promotionalPointDeduction \+ item\.purchaseConfirmationPointReversal\)/)
})

test('신청 성공으로 행 상태가 바뀌어도 완료 팝업은 닫기 전까지 유지된다', () => {
  const refund = readFileSync(
    `${projectRoot}src/routes/mypage/-components/InquiryRefundApplication.tsx`,
    'utf8',
  )
  const actions = readFileSync(
    `${projectRoot}src/routes/mypage/-components/http/HttpOrderItemActions.tsx`,
    'utf8',
  )

  assert.match(refund, /triggerEnabled = true/)
  assert.match(refund, /!triggerEnabled && !open/)
  assert.match(actions, /triggerEnabled=\{active\}/)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { totalTraffic } from '../src/routes/mypage/-components/rcpcPresentation.ts'
import { extensionResultText } from '../src/routes/mypage/-components/rcpcExtensionPresentation.ts'

test('누적 트래픽은 다운로드와 업로드를 합산해 한 값으로 표시한다', () => {
  assert.equal(totalTraffic(150_000_000_000, 100_000_000_000), '250 GB')
  assert.equal(totalTraffic(null, 5_000_000_000), '5 GB')
  assert.equal(totalTraffic(null, null), '-')
})

test('91일 이상 연장 행은 PDF 경고 문구로 표시한다', () => {
  assert.equal(extensionResultText({ addedDays: 91, amount: null, eligible: false, reason: '서버 원문' }), '최대 3개월까지만 연장할 수 있습니다.')
  assert.equal(extensionResultText({ addedDays: 30, amount: 50_000, eligible: true, reason: null }), '50,000원')
})

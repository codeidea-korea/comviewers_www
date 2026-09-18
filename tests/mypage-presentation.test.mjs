import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import { totalTraffic } from '../src/routes/mypage/-components/rcpcPresentation.ts'
import { extensionResultText } from '../src/routes/mypage/-components/rcpcExtensionPresentation.ts'

const source = (path) => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8')

test('누적 트래픽은 다운로드와 업로드를 합산해 한 값으로 표시한다', () => {
  assert.equal(totalTraffic(150_000_000_000, 100_000_000_000), '250 GB')
  assert.equal(totalTraffic(null, 5_000_000_000), '5 GB')
  assert.equal(totalTraffic(null, null), '-')
})

test('91일 이상 연장 행은 PDF 경고 문구로 표시한다', () => {
  assert.equal(extensionResultText({ addedDays: 91, amount: null, eligible: false, reason: '서버 원문' }), '최대 3개월까지만 연장할 수 있습니다.')
  assert.equal(extensionResultText({ addedDays: 30, amount: 50_000, eligible: true, reason: null }), '50,000원')
})

test('모바일 RCPC 별명 수정 버튼은 긴 별명 클리핑 영역 밖에 유지되고 퍼블리싱 문구를 따른다', () => {
  const table = source('src/routes/mypage/-components/RcpcListSurface.tsx')
  const mobileCard = table.slice(table.indexOf('function MobileRcpcCard'), table.indexOf('function ', table.indexOf('function MobileRcpcCard') + 1))
  const tools = source('src/routes/mypage/-components/RcpcItemTools.tsx')
  const styles = source('src/styles/mobile-lists.css')

  assert.match(mobileCard, /<strong>[^\n]*<span>\{item\.preference\.alias \|\| item\.productNo\}<\/span><\/strong>\s*\{canEditAlias && mutations \? <RcpcAliasButton/)
  assert.match(tools, /aria-label=\{`\$\{item\.productNo\} RCPC \$\{label\}`\}/)
  assert.match(styles, /\.mobile-rcpc-card > header strong \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis/)
  assert.match(mobileCard, /<span className="mobile-rcpc-card__spec"><span>\{item\.productNo\} <\/span><RcpcSpecButton/)
  assert.match(mobileCard, /<dt>서버실<\/dt><dd>\{item\.serverRoomRegion \?\? '-'\} \/ \{item\.serverRoomName \?\? '-'\}<\/dd>/)
  assert.match(mobileCard, /<dt>트래픽 사용량<\/dt><dd>\{totalTraffic\(/)
})

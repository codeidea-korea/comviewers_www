import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { withSourceModules } from './helpers/withSourceModules.mjs'

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

test('mobile RCPC render puts alias editing outside the title and shows product number only when an alias exists', async () => withSourceModules(async load => {
  const { MobileRcpcCard } = await load('/src/routes/mypage/-components/RcpcListSurface.tsx')
  const { SessionProvider } = await load('/src/app/session/SessionProvider.tsx')
  const { ServiceProvider } = await load('/src/app/ServiceProvider.tsx')
  const snapshot = { status: 'authenticated', customerSession: { memberRole: 'owner' } }
  const store = { getSnapshot: () => snapshot, subscribe: () => () => {} }
  const client = new QueryClient()
  const render = alias => renderToStaticMarkup(createElement(QueryClientProvider, { client },
    createElement(SessionProvider, { store }, createElement(ServiceProvider, { services: { myAccount: {} } },
      createElement(MobileRcpcCard, { api: { organizationId: '7' }, canEditAlias: true, canExtend: false, mutations: {},
        onSelectedChange: () => {}, selected: false, selectionFull: false,
        item: { rentalId: 1, pcAssetId: 2, productNo: 'PC001', preference: { alias, favorite: false },
          serverStatus: 'ended', rentalStatus: 'terminated', serverRoomRegion: '서울', serverRoomName: '센터',
          trafficDownloadTotalBytes: 1000, trafficUploadTotalBytes: 2000, serviceEndExclusiveDate: null } })))))
  try {
    const withAlias = render('테스트 별명')
    const withoutAlias = render('')
    assert.match(withAlias, /<\/strong><button aria-label="PC001 RCPC 별명 수정"/)
    assert.match(withAlias, /class="mobile-rcpc-card__spec"><span>PC001 /)
    assert.match(withoutAlias, /<\/strong><button aria-label="PC001 RCPC 별명 설정"/)
    assert.doesNotMatch(withoutAlias, /class="mobile-rcpc-card__spec"><span>PC001 /)
    assert.match(withAlias, /서울 \/ 센터/)
    assert.match(withAlias, /트래픽 사용량/)
  } finally { client.clear() }
}))

test('[source contract] mobile title CSS declares truncation; this is not a layout measurement', () => {
  const styles = source('src/styles/mobile-lists.css')
  assert.match(styles, /\.mobile-rcpc-card > header strong \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis/)
})

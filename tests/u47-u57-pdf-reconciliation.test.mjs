import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { contentDateTime } from '../src/domain/storefront/contentDateTime.ts'
import { communityListReturnTo } from '../src/routes/community/communityNavigation.ts'
import { managerCatalogRowMatches } from '../src/routes/mypage/-components/managerCatalogSearch.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = relativePath => readFileSync(`${root}${relativePath}`, 'utf8')

test('U47 담당자 검색은 이름, RCPC 품번, 별명만 사용한다', () => {
  const row = { rcpc: 'RCPC-1001', alias: '개발 서버', managerNames: ['가나다'] }
  assert.equal(managerCatalogRowMatches(row, '가나다'), true)
  assert.equal(managerCatalogRowMatches(row, 'RCPC-1001'), true)
  assert.equal(managerCatalogRowMatches(row, '개발 서버'), true)
  assert.equal(managerCatalogRowMatches(row, 'qa_manager_login'), false)
})

test('U54/U57 작성일시는 API 시각을 분 단위까지 보존한다', () => {
  assert.equal(contentDateTime('2026-09-13T14:05:37'), '2026.09.13 14:05')
})

test('U55 목록 복귀는 검색어와 정렬만 보존한다', () => {
  assert.equal(
    communityListReturnTo('keyword=원격&sort=comments&page=4&mineOnly=true&publishingState=menus-open'),
    '/community/posts?keyword=%EC%9B%90%EA%B2%A9&sort=comments',
  )
  assert.equal(communityListReturnTo('sort=latest&page=2'), '/community/posts')
})

test('U50/U57에 PDF 밖 수동 인증 입력과 상세 번호를 노출하지 않는다', () => {
  const profile = source('src/routes/mypage/-components/http/HttpAccountPages.tsx')
  const support = source('src/routes/support/SupportPagesView.tsx')
  assert.doesNotMatch(profile, /label="이메일 인증 링크"|여기에 붙여넣으세요|>인증 확인</)
  assert.doesNotMatch(support, /<header><span[^>]*>\{article\.number\}/)
  assert.match(support, /작성일시 \{article\.dateTime \?\? article\.date\}/)
})

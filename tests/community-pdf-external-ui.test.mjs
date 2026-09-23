import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

function source(relativePath) {
  return readFileSync(`${projectRoot}${relativePath}`, 'utf8')
}

test('U52 login popup keeps only the PDF login notice and return path', () => {
  const view = source('src/routes/community/CommunityPostListPageView.tsx')

  assert.match(view, /title="로그인이 필요합니다\."/)
  assert.match(view, /게시글을 작성하려면 로그인해 주세요\./)
  assert.match(view, /returnTo=\$\{encodeURIComponent\(writePath\)\}/)
  assert.doesNotMatch(view, /로그인 후 글쓰기를 계속할 수 있습니다\./)
})

test('U54 arbitrary post images do not expose the publishing sample as alt text', () => {
  const view = source('src/routes/community/CommunityPostDetailPageView.tsx')

  assert.match(view, /post\.image \? <img alt=\{displayTitle\}/)
  assert.doesNotMatch(view, /Windows 네트워크 연결 오류 화면/)
})

test('U57 detail renders persisted body without an inferred empty-body sentence', () => {
  const view = source('src/routes/support/SupportPagesView.tsx')

  const renderer = view.match(/<RichContentRenderer\b[^>]*\/>/)?.[0]
  assert.ok(renderer, 'support detail must render the persisted rich document')
  assert.match(renderer, /\battachments=\{article\.attachments\}/)
  assert.match(renderer, /\bdocument=\{article\.richContent\}/)
  assert.match(renderer, /\bfallback=\{content\}/)
  assert.match(renderer, /\bloadImage=\{storefront\.loadArticleImage\}/)
  assert.doesNotMatch(view, /등록된 내용이 없습니다\./)
})

test('U47 and U54-U57 preserve PDF-visible metadata and the publishing list structure', () => {
  const manager = source('src/routes/mypage/ManagerPagesView.tsx')
  const managerCatalog = source('src/routes/mypage/-components/ManagerCatalog.tsx')
  const postDetail = source('src/routes/community/CommunityPostDetailPageView.tsx')
  const support = source('src/routes/support/SupportPagesView.tsx')

  assert.match(manager, /\{item\.name\} \(\{item\.assignedRcpcIds\.length\}\)/)
  assert.match(managerCatalog, /\{manager\.name\}<em>\{manager\.assignedRcpcIds\.length\}<\/em>/)
  assert.match(postDetail, /작성자 \{post\.author\}/)
  assert.match(postDetail, /작성일시 \{post\.dateTime \?\? post\.date\}/)
  assert.match(support, /className="support-list"/)
  assert.match(support, /<time>\{article\.date\}<\/time>/)
  assert.match(support, /작성일시 \{article\.dateTime \?\? article\.date\}/)
})

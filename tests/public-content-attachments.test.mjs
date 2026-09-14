import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { attachmentFormat, toPublicAttachment } from '../src/domain/storefront/publicAttachment.ts'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

test('U54/U57 공개 첨부는 API MIME과 절대 다운로드 URL을 보존한다', () => {
  assert.deepEqual(
    toPublicAttachment({
      id: 41,
      fileName: 'guide.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 1_536,
      downloadUrl: '/api/v1/content/attachments/41/download',
    }, 'http://127.0.0.1:8080'),
    {
      id: '41',
      name: 'guide.pdf',
      size: '2KB',
      type: 'application/pdf',
      href: 'http://127.0.0.1:8080/api/v1/content/attachments/41/download',
    },
  )
})

test('첨부 형식은 MIME을 우선하고 없으면 파일 확장자를 사용한다', () => {
  assert.equal(attachmentFormat({ name: 'guide.pdf', type: 'application/pdf' }), 'PDF')
  assert.equal(attachmentFormat({ name: 'diagnostic.log', type: '' }), 'LOG')

  const attachmentList = readFileSync(`${projectRoot}src/components/ui/AttachmentListControl.tsx`, 'utf8')
  assert.match(attachmentList, /attachmentFormat\(attachment\)/)
})

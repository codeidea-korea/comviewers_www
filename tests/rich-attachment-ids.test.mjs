import assert from 'node:assert/strict'
import test from 'node:test'
import { richAttachmentIds } from '../src/domain/storefront/richAttachmentIds.ts'
test('rich attachment ids survive nested document serialization and deduplicate repeated images', () => {
  const document = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { attachmentId: 91, src: 'blob:temporary' } }] }, { type: 'image', attrs: { attachmentId: 91 } }] }
  assert.deepEqual(richAttachmentIds(JSON.stringify(document)), [91])
})
test('invalid image ids cannot enter a post attachment allow-list', () => {
  assert.throws(() => richAttachmentIds({ type: 'doc', content: [{ type: 'image', attrs: { attachmentId: '../other-owner' } }] }))
})

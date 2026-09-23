export function richAttachmentIds(value: unknown): number[] {
  if (typeof value === 'string') { try { value = JSON.parse(value) } catch { return [] } }
  const ids = new Set<number>()
  function visit(node: unknown) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return
    const entry = node as { type?: unknown; attrs?: { attachmentId?: unknown }; content?: unknown }
    if (entry.type === 'image') {
      const id = Number(entry.attrs?.attachmentId)
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('본문 이미지 첨부 정보를 확인해 주세요.')
      ids.add(id)
    }
    if (Array.isArray(entry.content)) entry.content.forEach(visit)
  }
  visit(value)
  return [...ids]
}

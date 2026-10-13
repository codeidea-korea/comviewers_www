import type { JSONContent } from '@tiptap/core'
import { persistentEditorDocument } from '../../../components/ui/richTextEditorImages'

function canonicalAttrs(attrs: JSONContent['attrs']) {
  const entries = Object.entries(attrs ?? {}).filter(([, value]) => value !== null && value !== undefined).sort(([left], [right]) => left.localeCompare(right))
  return entries.length ? { attrs: Object.fromEntries(entries) } : {}
}

function canonicalDocument(node: JSONContent): JSONContent {
  return {
    ...(node.type ? { type: node.type } : {}),
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...canonicalAttrs(node.attrs),
    ...(node.marks?.length ? { marks: node.marks.map(mark => ({ type: mark.type, ...canonicalAttrs(mark.attrs) })) } : {}),
    ...(node.content?.length ? { content: node.content.map(canonicalDocument) } : {}),
  }
}

function canonicalHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  return document.body.innerHTML === '<p></p>' ? '' : document.body.innerHTML
}

export function postEditorContentChanged(initialHtml: string, initialDocument: JSONContent | null, html: string, document: JSONContent | null): boolean {
  if (initialDocument && document) {
    return JSON.stringify(canonicalDocument(persistentEditorDocument(document))) !== JSON.stringify(canonicalDocument(persistentEditorDocument(initialDocument)))
  }
  return canonicalHtml(html) !== canonicalHtml(initialHtml)
}

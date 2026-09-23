import type { CSSProperties, ReactNode } from 'react'
import type { AttachmentItem } from './AttachmentListControl'
import type { EditorImageLoader } from './richTextEditorImages'
import { RichAttachmentImage } from './RichAttachmentImage'

interface RichContentRendererProps {
  attachments?: readonly AttachmentItem[]
  document: unknown
  fallback: readonly string[]
  loadImage?: EditorImageLoader
}

const textAligns = new Set(['left', 'center', 'right', 'justify'])
const fonts = new Set(['Pretendard', 'NanumSquare Neo'])
const sizes = new Set(['14px', '16px', '18px'])
const lineHeights = new Set(['1.4', '1.6', '1.8'])

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function string(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function attrs(node: Record<string, unknown>) {
  return object(node.attrs) ?? {}
}

function children(node: Record<string, unknown>, attachments: readonly AttachmentItem[], loadImage?: EditorImageLoader): ReactNode[] {
  return Array.isArray(node.content) ? node.content.map((child, index) => renderNode(child, `${index}`, attachments, loadImage)) : []
}

function safeStyle(nodeAttrs: Record<string, unknown>) {
  const style: CSSProperties = {}
  const align = string(nodeAttrs.textAlign)
  if (align && textAligns.has(align)) style.textAlign = align as CSSProperties['textAlign']
  return style
}

function markStyle(markAttrs: Record<string, unknown>) {
  const style: CSSProperties = {}
  const color = string(markAttrs.color)
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) style.color = color
  const fontFamily = string(markAttrs.fontFamily)
  if (fontFamily && fonts.has(fontFamily)) style.fontFamily = fontFamily
  const fontSize = string(markAttrs.fontSize)
  if (fontSize && sizes.has(fontSize)) style.fontSize = fontSize
  const lineHeight = string(markAttrs.lineHeight)
  if (lineHeight && lineHeights.has(lineHeight)) style.lineHeight = lineHeight
  return style
}

function isHttpUrl(value: string | undefined) {
  return value ? /^https?:\/\//i.test(value) && !value.includes('\\') : false
}

function applyMarks(text: ReactNode, marks: unknown, key: string): ReactNode {
  if (!Array.isArray(marks)) return text
  return marks.reduce<ReactNode>((current, mark, index) => {
    const row = object(mark)
    const type = string(row?.type)
    const markAttrs = object(row?.attrs) ?? {}
    const markKey = `${key}-mark-${index}`
    if (type === 'bold') return <strong key={markKey}>{current}</strong>
    if (type === 'italic') return <em key={markKey}>{current}</em>
    if (type === 'underline') return <u key={markKey}>{current}</u>
    if (type === 'strike') return <s key={markKey}>{current}</s>
    if (type === 'code') return <code key={markKey}>{current}</code>
    if (type === 'link') {
      const href = string(markAttrs.href)
      return isHttpUrl(href) ? <a href={href} key={markKey} rel="noreferrer" target="_blank">{current}</a> : current
    }
    if (type === 'textStyle' || type === 'highlight') {
      return <span key={markKey} style={markStyle(markAttrs)}>{current}</span>
    }
    return current
  }, text)
}

function renderNode(value: unknown, key: string, attachments: readonly AttachmentItem[], loadImage?: EditorImageLoader): ReactNode {
  const node = object(value)
  const type = string(node?.type)
  if (!node || !type) return null
  const nodeAttrs = attrs(node)
  if (type === 'text') return applyMarks(string(node.text) ?? '', node.marks, key)
  if (type === 'paragraph') return <p key={key} style={safeStyle(nodeAttrs)}>{children(node, attachments, loadImage)}</p>
  if (type === 'heading') {
    const level = nodeAttrs.level === 1 || nodeAttrs.level === 2 || nodeAttrs.level === 3 ? nodeAttrs.level : 2
    const content = children(node, attachments, loadImage)
    if (level === 1) return <h1 key={key} style={safeStyle(nodeAttrs)}>{content}</h1>
    if (level === 3) return <h3 key={key} style={safeStyle(nodeAttrs)}>{content}</h3>
    return <h2 key={key} style={safeStyle(nodeAttrs)}>{content}</h2>
  }
  if (type === 'bulletList') return <ul key={key}>{children(node, attachments, loadImage)}</ul>
  if (type === 'orderedList') return <ol key={key}>{children(node, attachments, loadImage)}</ol>
  if (type === 'listItem') return <li key={key}>{children(node, attachments, loadImage)}</li>
  if (type === 'blockquote') return <blockquote key={key}>{children(node, attachments, loadImage)}</blockquote>
  if (type === 'codeBlock') return <pre key={key}><code>{children(node, attachments, loadImage)}</code></pre>
  if (type === 'horizontalRule') return <hr key={key} />
  if (type === 'hardBreak') return <br key={key} />
  if (type === 'image') {
    const attachmentId = String(nodeAttrs.attachmentId ?? '')
    const attachment = attachments.find((item) => item.id === attachmentId)
    const id = Number(attachmentId)
    if (!Number.isSafeInteger(id) || id <= 0 || (!attachment && !loadImage)) return null
    return <RichAttachmentImage attachmentId={id} href={attachment?.href} key={key} loadImage={loadImage} name={attachment?.name ?? string(nodeAttrs.alt) ?? '본문 이미지'} />
  }
  if (type === 'doc') return <>{children(node, attachments, loadImage)}</>
  return null
}

export function RichContentRenderer({ attachments = [], document, fallback, loadImage }: RichContentRendererProps) {
  const root = object(document)
  if (!root || root.type !== 'doc') {
    return <>{fallback.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</>
  }
  return <>{renderNode(root, 'root', attachments, loadImage)}</>
}

import type { JSONContent } from '@tiptap/core'

const fonts = new Set(['Pretendard', 'NanumSquare Neo'])
const sizes = [14, 16, 18] as const
const lineHeights = [1.4, 1.6, 1.8] as const
const aligns = new Set(['left', 'center', 'right', 'justify'])
const nodeTypes = new Set(['doc', 'paragraph', 'text', 'hardBreak', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock', 'horizontalRule', 'image'])
const simpleMarks = new Set(['bold', 'italic', 'underline', 'strike', 'code'])
const namedColors: Record<string, string> = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
  yellow: '#ffff00', gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000',
  purple: '#800080', fuchsia: '#ff00ff', lime: '#00ff00', olive: '#808000', navy: '#000080',
  teal: '#008080', aqua: '#00ffff', orange: '#ffa500',
}

function color(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (Object.hasOwn(namedColors, value.toLowerCase())) return namedColors[value.toLowerCase()]
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(value)) return `#${[...value.slice(1)].map(channel => channel + channel).join('')}`.toLowerCase()
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value)
  if (!rgb) return undefined
  const channels = rgb.slice(1).map(Number)
  return channels.every(channel => channel <= 255)
    ? `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
    : undefined
}

function font(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.split(',').map(name => name.trim().replace(/^["']|["']$/g, '')).find(name => fonts.has(name))
}

function size(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const match = /^(\d+(?:\.\d+)?)(px|pt)$/i.exec(value.trim())
  if (!match) return undefined
  const pixels = Number(match[1]) * (match[2]!.toLowerCase() === 'pt' ? 4 / 3 : 1)
  if (!Number.isFinite(pixels) || pixels <= 0) return undefined
  return `${sizes.reduce((best, candidate) => Math.abs(candidate - pixels) < Math.abs(best - pixels) ? candidate : best)}px`
}

function lineHeight(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const height = Number(value)
  if (!Number.isFinite(height) || height < 1 || height > 3) return undefined
  return String(lineHeights.reduce((best, candidate) => Math.abs(candidate - height) < Math.abs(best - height) ? candidate : best))
}

function safeHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const href = value.trim()
  return /^https?:\/\//i.test(href) && !/[\\\u0000-\u0020\u007f-\u009f]/.test(href) && href.length <= 1000 ? href : undefined
}

function shortText(value: unknown) { return typeof value === 'string' ? value.slice(0, 255) : undefined }
function positiveInt(value: unknown) { return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647 }
function attachmentId(value: unknown) { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 }

function normalizeMark(mark: NonNullable<JSONContent['marks']>[number]) {
  if (simpleMarks.has(mark.type)) return { type: mark.type }
  if (mark.type === 'link') {
    const href = safeHref(mark.attrs?.href)
    return href ? { type: 'link', attrs: { href, target: mark.attrs?.target === '_self' ? '_self' : '_blank', rel: 'noopener noreferrer nofollow', class: null } } : null
  }
  if (mark.type !== 'textStyle' && mark.type !== 'highlight') return null
  const attrs: Record<string, string> = {}
  const safeColor = color(mark.attrs?.color)
  if (safeColor) attrs.color = safeColor
  if (mark.type === 'textStyle') {
    const safeFont = font(mark.attrs?.fontFamily)
    const safeSize = size(mark.attrs?.fontSize)
    const safeLineHeight = lineHeight(mark.attrs?.lineHeight)
    if (safeFont) attrs.fontFamily = safeFont
    if (safeSize) attrs.fontSize = safeSize
    if (safeLineHeight) attrs.lineHeight = safeLineHeight
  }
  if (mark.type === 'highlight' && !safeColor) return { type: 'highlight' }
  return Object.keys(attrs).length ? { type: mark.type, attrs } : null
}

function nodeAttrs(node: JSONContent): Record<string, unknown> | undefined {
  const source = node.attrs ?? {}
  if (node.type === 'paragraph' || node.type === 'heading') {
    return {
      ...(node.type === 'heading' ? { level: Number.isInteger(source.level) ? Math.max(1, Math.min(3, source.level)) : 1 } : {}),
      ...(aligns.has(source.textAlign) ? { textAlign: source.textAlign } : {}),
    }
  }
  if (node.type === 'orderedList') return { start: positiveInt(source.start) ? source.start : 1, ...(shortText(source.type) ? { type: shortText(source.type) } : {}) }
  if (node.type === 'codeBlock') return shortText(source.language) ? { language: shortText(source.language) } : undefined
  if (node.type !== 'image') return undefined
  return {
    attachmentId: source.attachmentId,
    ...(typeof source.alt === 'string' ? { alt: shortText(source.alt) } : {}),
    ...(typeof source.title === 'string' ? { title: shortText(source.title) } : {}),
    // Initial editor values can contain a local preview. Persistence removes it.
    ...(typeof source.src === 'string' && source.src.startsWith('blob:') ? { src: source.src } : {}),
  }
}

export function normalizeEditorDocument(value: unknown, allowImages = true): JSONContent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (value as JSONContent).type !== 'doc') return null
  function visit(node: JSONContent): JSONContent[] {
    if (node.type === 'image' && (!allowImages || !attachmentId(node.attrs?.attachmentId))) return []
    if (!nodeTypes.has(node.type ?? '')) return (node.content ?? []).flatMap(visit)
    const attrs = nodeAttrs(node)
    const wingdingsBullet = node.type === 'text' && node.text?.trim() === 'l'
      && node.marks?.some(mark => mark.type === 'textStyle' && /^['"]?Wingdings['"]?$/i.test(String(mark.attrs?.fontFamily ?? '').trim()))
    const text = node.text?.replaceAll('\0', '')
    if (node.type === 'text' && !text) return []
    return [{
      type: node.type,
      ...(node.type === 'text' ? { text: wingdingsBullet ? text!.replace('l', '●') : text } : {}),
      ...(attrs ? { attrs } : {}),
      // The API accepts marks only on text, including when a break inherited them.
      ...(node.type === 'text' && node.marks ? { marks: [...new Map(node.marks.map(normalizeMark).filter(mark => mark !== null).map(mark => [mark.type, mark])).values()] } : {}),
      ...(node.content ? { content: node.content.flatMap(visit) } : node.type === 'doc' ? { content: [] } : {}),
    }]
  }
  return visit(value as JSONContent)[0] ?? null
}

const bodyTags = new Set(['p', 'div', 'span', 'h1', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'br', 'hr', 'a', 'mark'])
const blockTags = new Set(['section', 'article', 'main', 'aside', 'header', 'footer', 'address', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'dl', 'dt', 'dd'])
const discardedTags = new Set(['script', 'style', 'meta', 'link', 'base', 'title', 'noscript', 'template', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'svg', 'canvas', 'video', 'audio', 'source'])
const normalizedBlocks = new Set(['p', 'div', 'h1', 'h2', 'h3', 'pre', 'blockquote', 'ul', 'ol', 'li'])
const contextTypes = new Set(['paragraph', 'heading', 'orderedList', 'bulletList', 'listItem', 'codeBlock', 'blockquote'])
const listStyles: Record<string, string> = { decimal: '1', 'lower-alpha': 'a', 'lower-latin': 'a', 'upper-alpha': 'A', 'upper-latin': 'A', 'lower-roman': 'i', 'upper-roman': 'I' }

function bodyTextStyle(target: HTMLElement) {
  const style = target.ownerDocument.createElement('span').style
  for (const property of ['color', 'font-family', 'font-size', 'line-height', 'white-space']) {
    style.setProperty(property, target.style.getPropertyValue(property))
    target.style.removeProperty(property)
  }
  return style.cssText
}

/** TextStyle parses spans; block styles must follow their inline text into spans. */
function wrapTextRuns(target: HTMLElement, style: string, background?: string) {
  let run: HTMLElement | undefined
  for (const child of Array.from(target.childNodes)) {
    if (child.nodeType === 1 && normalizedBlocks.has((child as HTMLElement).tagName.toLowerCase())) {
      wrapTextRuns(child as HTMLElement, style, background)
      run = undefined
    } else {
      if (!run) {
        const span = target.ownerDocument.createElement('span')
        if (style) span.setAttribute('style', style)
        const wrapper = background ? target.ownerDocument.createElement('mark') : span
        if (background) {
          wrapper.setAttribute('data-color', background)
          wrapper.style.backgroundColor = background
          wrapper.appendChild(span)
        }
        target.insertBefore(wrapper, child)
        run = span
      }
      run.appendChild(child)
    }
  }
}

function clipboardSlice(value: string | null): string | undefined {
  if (!value || value.length > 4000) return undefined
  const match = /^(\d{1,2}) (\d{1,2}) (\[.*\])$/.exec(value)
  if (!match || Number(match[1]) > 24 || Number(match[2]) > 24) return undefined
  try {
    const context: unknown = JSON.parse(match[3]!)
    if (!Array.isArray(context) || context.length % 2 || context.length > 48) return undefined
    const normalized: unknown[] = []
    for (let index = 0; index < context.length; index += 2) {
      const type: unknown = context[index]
      const attrs: unknown = context[index + 1]
      if (typeof type !== 'string' || !contextTypes.has(type)) return undefined
      if (attrs !== null && (typeof attrs !== 'object' || Array.isArray(attrs))) return undefined
      normalized.push(type, nodeAttrs({ type, attrs: attrs === null ? undefined : attrs as Record<string, unknown> }) ?? null)
    }
    return `${match[1]} ${match[2]} ${JSON.stringify(normalized)}`
  } catch { return undefined }
}

function copyBodyStyle(source: HTMLElement, target: HTMLElement) {
  const input = source.style
  const output = target.style
  output.color = color(input.color || source.getAttribute('color')) ?? ''
  output.fontFamily = font(input.fontFamily || source.getAttribute('face')) ?? ''
  output.fontSize = size(input.fontSize) ?? ''
  output.lineHeight = lineHeight(input.lineHeight) ?? ''
  const align = input.textAlign || source.getAttribute('align') || ''
  if (aligns.has(align)) output.textAlign = align
  if (/^(normal|bold|[1-9]00)$/.test(input.fontWeight)) output.fontWeight = input.fontWeight
  if (input.fontStyle === 'italic' || input.fontStyle === 'normal') output.fontStyle = input.fontStyle
  if (/^(pre|pre-wrap|break-spaces)$/.test(input.whiteSpace)) output.whiteSpace = 'pre-wrap'
  const decoration = input.textDecorationLine || input.textDecoration
  output.textDecoration = decoration === 'none' ? 'none' : ['underline', 'line-through'].filter(value => decoration.includes(value)).join(' ')
  if (!target.getAttribute('style')) target.removeAttribute('style')
}

function pastedNode(source: Node, output: Document, allowImages: boolean): Node[] {
  if (source.nodeType === 3) return [output.createTextNode((source.textContent ?? '').replaceAll('\0', ''))]
  if (source.nodeType !== 1) return []
  const element = source as HTMLElement
  const tag = element.tagName.toLowerCase()
  if (discardedTags.has(tag) || element.hidden || element.style.display === 'none') return []
  if (tag === 'img') {
    const id = Number(element.getAttribute('data-attachment-id'))
    if (!allowImages || !attachmentId(id)) return []
    const image = output.createElement('img')
    image.setAttribute('data-attachment-id', String(id))
    image.setAttribute('alt', shortText(element.getAttribute('alt')) ?? '')
    return [image]
  }
  const name = /^h[4-6]$/.test(tag) ? 'h3' : blockTags.has(tag) ? 'div' : bodyTags.has(tag) ? tag : 'span'
  const target = output.createElement(name)
  copyBodyStyle(element, target)
  // Retain only validated editor slice context so internal copy keeps spacing/open lists.
  const slice = clipboardSlice(element.getAttribute('data-pm-slice'))
  if (slice && bodyTags.has(tag)) target.setAttribute('data-pm-slice', slice)
  const href = tag === 'a' ? safeHref(element.getAttribute('href')) : undefined
  if (href) { target.setAttribute('href', href); target.setAttribute('target', '_blank'); target.setAttribute('rel', 'noopener noreferrer nofollow') }
  if (tag === 'ol') {
    const start = Number(element.getAttribute('start'))
    if (positiveInt(start)) target.setAttribute('start', String(start))
    const type = element.getAttribute('type') || listStyles[element.style.listStyleType]
    if (type && ['1', 'a', 'A', 'i', 'I'].includes(type)) target.setAttribute('type', type)
  }
  const bullet = /^['"]?Wingdings['"]?$/i.test(element.style.fontFamily.trim()) && !element.children.length && element.textContent?.trim() === 'l'
  if (bullet) target.textContent = element.textContent!.replace('l', '●')
  else Array.from(element.childNodes).flatMap(child => pastedNode(child, output, allowImages)).forEach(child => target.appendChild(child))
  const background = color(element.style.backgroundColor || element.getAttribute('data-color'))
  if (tag === 'mark' && background) { target.style.backgroundColor = background; target.setAttribute('data-color', background) }
  if (name !== 'span') {
    const textStyle = bodyTextStyle(target)
    if (textStyle || (tag !== 'mark' && background)) wrapTextRuns(target, textStyle, tag !== 'mark' ? background : undefined)
  } else if (background) {
    wrapTextRuns(target, '', background)
  }
  if (!target.getAttribute('style')) target.removeAttribute('style')
  return [target]
}

/** Rebuild clipboard body content; never retain Office metadata, layout or event attributes. */
export function normalizePastedHtml(html: string, allowImages = true): string {
  const pasted = new DOMParser().parseFromString(html, 'text/html')
  const output = pasted.implementation.createHTMLDocument('')
  Array.from(pasted.body.childNodes).flatMap(node => pastedNode(node, output, allowImages)).forEach(node => output.body.appendChild(node))
  return output.body.innerHTML
}

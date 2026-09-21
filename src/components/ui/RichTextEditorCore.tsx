import type { ChangeEvent, ReactNode, SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import type { Editor, JSONContent } from '@tiptap/core'
import { useEffect, useId, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import iconLink from './editor-icons/icon-link.svg'
import iconFullscreen from './editor-icons/icon-close-fullscreen.svg'
import iconTableRows from './editor-icons/icon-table-rows.svg'
import './richTextEditor.css'

export interface RichTextEditorProps {
  ariaLabel?: string
  ariaLabelledby?: string
  className?: string
  synchronizeValue?: boolean
  onTextChange?: (text: string) => void
  onChange?: (html: string) => void
  onDocumentChange?: (document: JSONContent) => void
  placeholder?: string
  value?: string | JSONContent
}

interface EditorError {
  message: string
  source: 'image' | 'link'
}

interface ToolbarAction {
  label: string
  command: (editor: Editor) => boolean
  isActive: (editor: Editor) => boolean
  text: string
}

interface EditorToolbarProps {
  editor: Editor | null
  errorId?: string
  fullscreen: boolean
  onError: (message: string) => void
  onFullscreenToggle: () => void
  onImageSelect: () => void
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const SAFE_IMAGE_TYPES = new Set(['image/gif', 'image/jpeg', 'image/png', 'image/webp'])
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:'])

function isSafeLinkHref(value: unknown) {
  if (typeof value !== 'string') return false
  const href = value.trim()
  if (!href || href.startsWith('//') || href.includes('\\')) return false

  const compactHref = href.replace(/[\u0000-\u0020\u007f-\u009f]/g, '')
  const protocol = compactHref.match(/^([a-z][a-z\d+.-]*):/i)?.[1]
  return protocol ? SAFE_LINK_PROTOCOLS.has(`${protocol.toLowerCase()}:`) : false
}

const toolbarActions: readonly ToolbarAction[] = [
  { label: '굵게', command: (editor) => editor.chain().focus().toggleBold().run(), isActive: (editor) => editor.isActive('bold'), text: 'B' },
  { label: '기울임', command: (editor) => editor.chain().focus().toggleItalic().run(), isActive: (editor) => editor.isActive('italic'), text: 'I' },
  { label: '밑줄', command: (editor) => editor.chain().focus().toggleUnderline().run(), isActive: (editor) => editor.isActive('underline'), text: 'U' },
  { label: '취소선', command: (editor) => editor.chain().focus().toggleStrike().run(), isActive: (editor) => editor.isActive('strike'), text: 'S' },
  { label: '인용구', command: (editor) => editor.chain().focus().toggleBlockquote().run(), isActive: (editor) => editor.isActive('blockquote'), text: '❝' },
  { label: '글머리 기호 목록', command: (editor) => editor.chain().focus().toggleBulletList().run(), isActive: (editor) => editor.isActive('bulletList'), text: '•≡' },
  { label: '번호 목록', command: (editor) => editor.chain().focus().toggleOrderedList().run(), isActive: (editor) => editor.isActive('orderedList'), text: '1≡' },
  { label: '코드 블록', command: (editor) => editor.chain().focus().toggleCodeBlock().run(), isActive: (editor) => editor.isActive('codeBlock'), text: '</>' },
]

const headingOptions = [
  { label: '본문', value: 'paragraph' },
  { label: '제목 1', value: 'heading-1' },
  { label: '제목 2', value: 'heading-2' },
  { label: '제목 3', value: 'heading-3' },
]

const fontOptions = [
  { label: '기본 글꼴', value: '' },
  { label: 'Pretendard', value: 'Pretendard' },
  { label: '나눔스퀘어', value: 'NanumSquare Neo' },
]

const sizeOptions = [
  { label: '기본 크기', value: '' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
]

const lineHeightOptions = [
  { label: '기본 간격', value: '' },
  { label: '1.4', value: '1.4' },
  { label: '1.6', value: '1.6' },
  { label: '1.8', value: '1.8' },
]

function activeBlockType(editor: Editor) {
  const heading = [1, 2, 3].find((level) => editor.isActive('heading', { level }))
  return heading ? `heading-${heading}` : 'paragraph'
}

function NativeSelect({ options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { label: string; value: string }[] }) {
  return <select {...props}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
}

function EditorLinkDialog({ isOpen, onClose, onConfirm, children }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])
  return <dialog aria-labelledby={titleId} aria-modal="true" className="rich-text-editor__link-dialog" ref={dialogRef} role="dialog" onCancel={(event) => { event.preventDefault(); onClose() }} onKeyDown={(event) => {
    event.stopPropagation()
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && !event.nativeEvent.isComposing) {
      event.preventDefault()
      onConfirm()
    }
  }}>
    <h2 id={titleId}>링크 삽입</h2>{children}
    <div className="rich-text-editor__link-actions"><button onClick={onClose} type="button">취소</button><button onClick={onConfirm} type="button">적용</button></div>
  </dialog>
}

function EditorToolbar({ editor, errorId, fullscreen, onError, onFullscreenToggle, onImageSelect }: EditorToolbarProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkHref, setLinkHref] = useState('https://')
  const [linkError, setLinkError] = useState('')
  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber })
  if (!editor) return null

  const setLink = () => {
    const href = linkHref
    if (!href.trim()) {
      onError('')
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      setLinkOpen(false)
      return
    }
    const normalizedHref = href.trim()
    if (!isSafeLinkHref(normalizedHref)) {
      setLinkError('안전한 링크 주소를 입력해 주세요. http 또는 https 링크만 사용할 수 있습니다.')
      return
    }
    onError('')
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalizedHref }).run()
    setLinkOpen(false)
  }

  const changeBlockType = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value
    if (nextValue === 'paragraph') editor.chain().focus().setParagraph().run()
    else {
      const level = Number(nextValue.split('-')[1])
      if (level === 1 || level === 2 || level === 3) editor.chain().focus().toggleHeading({ level }).run()
    }
  }

  const changeFont = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value) editor.chain().focus().setFontFamily(value).run()
    else editor.chain().focus().unsetFontFamily().run()
  }

  const changeFontSize = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value) editor.chain().focus().setFontSize(value).run()
    else editor.chain().focus().unsetFontSize().run()
  }

  const changeLineHeight = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    if (value) editor.chain().focus().setLineHeight(value).run()
    else editor.chain().focus().unsetLineHeight().run()
  }

  const setTextColor = (event: ChangeEvent<HTMLInputElement>) => editor.chain().focus().setColor(event.target.value).run()

  return <><div aria-label="서식 도구" className="rich-text-editor__toolbar" role="toolbar">
    <div className="rich-text-editor__toolbar-row">
      <label className="rich-text-editor__block-type"><span className="sr-only">문단 형식</span><NativeSelect aria-label="문단 형식" onChange={changeBlockType} options={headingOptions} value={activeBlockType(editor)} /></label>
      <span aria-hidden="true" className="rich-text-editor__divider" />
      {toolbarActions.slice(0, 5).map((action) => <button aria-label={action.label} aria-pressed={action.isActive(editor)} className={action.isActive(editor) ? 'is-active' : ''} key={action.label} onClick={() => action.command(editor)} type="button">{action.text}</button>)}
      <label aria-label="텍스트 색상" className="rich-text-editor__color"><span aria-hidden="true">A</span><input aria-label="텍스트 색상" onChange={setTextColor} type="color" value={editor.getAttributes('textStyle').color || '#121212'} /></label>
      <button aria-label="텍스트 강조" aria-pressed={editor.isActive('highlight')} className={editor.isActive('highlight') ? 'is-active' : ''} onClick={() => editor.chain().focus().toggleHighlight().run()} type="button">A▾</button>
      <span aria-hidden="true" className="rich-text-editor__divider" />
      <label className="rich-text-editor__select"><span className="sr-only">글꼴</span><NativeSelect aria-label="글꼴" onChange={changeFont} options={fontOptions} value={editor.getAttributes('textStyle').fontFamily || ''} /></label>
      <label className="rich-text-editor__select"><span className="sr-only">글자 크기</span><NativeSelect aria-label="글자 크기" onChange={changeFontSize} options={sizeOptions} value={editor.getAttributes('textStyle').fontSize || ''} /></label>
      <label className="rich-text-editor__select"><span className="sr-only">줄 간격</span><NativeSelect aria-label="줄 간격" onChange={changeLineHeight} options={lineHeightOptions} value={editor.getAttributes('textStyle').lineHeight || ''} /></label>
    </div>
    <div className="rich-text-editor__toolbar-row">
      {toolbarActions.slice(5).map((action) => <button aria-label={action.label} aria-pressed={action.isActive(editor)} className={action.isActive(editor) ? 'is-active' : ''} key={action.label} onClick={() => action.command(editor)} type="button">{action.text}</button>)}
      <button aria-label="왼쪽 정렬" aria-pressed={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} type="button">≡</button>
      <button aria-label="가운데 정렬" aria-pressed={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} type="button">≡</button>
      <button aria-label="오른쪽 정렬" aria-pressed={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} type="button">≡</button>
      <button aria-label="양쪽 정렬" aria-pressed={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} type="button">≡</button>
      <button aria-label="줄바꿈 삽입" onClick={() => editor.chain().focus().setHardBreak().run()} type="button"><img alt="" src={iconTableRows} /></button>
      <button aria-label="구분선 삽입" onClick={() => editor.chain().focus().setHorizontalRule().run()} type="button">―</button>
      <span aria-hidden="true" className="rich-text-editor__divider" />
      <button aria-describedby={errorId} aria-label="링크" aria-pressed={editor.isActive('link')} className={editor.isActive('link') ? 'is-active' : ''} onClick={() => { setLinkHref(editor.getAttributes('link').href || 'https://'); setLinkError(''); setLinkOpen(true) }} type="button"><img alt="" src={iconLink} /></button>
      <button aria-label="이미지 삽입" onClick={onImageSelect} type="button">▣</button>
      <button aria-label="서식 지우기" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} type="button">Tx</button>
      <button aria-label="실행 취소" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} type="button">↶</button>
      <button aria-label="다시 실행" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} type="button">↷</button>
      <button aria-label={fullscreen ? '전체 화면 닫기' : '전체 화면'} aria-pressed={fullscreen} onClick={onFullscreenToggle} type="button"><img alt="" src={iconFullscreen} /></button>
    </div>
  </div>{linkOpen ? <EditorLinkDialog isOpen={linkOpen} onClose={() => setLinkOpen(false)} onConfirm={setLink}>
    <label>링크 주소<input autoFocus aria-invalid={!!linkError} onChange={(event) => { setLinkHref(event.target.value); setLinkError('') }} placeholder="https://" type="url" value={linkHref} /></label>
    {linkError ? <p className="rich-text-editor__error" role="alert">{linkError}</p> : null}
  </EditorLinkDialog> : null}</>
}

export function RichTextEditorCore({ ariaLabel = '내용', ariaLabelledby, className = '', synchronizeValue = true, onChange, onTextChange, onDocumentChange, placeholder = '내용을 입력해 주세요.', value = '' }: RichTextEditorProps) {
  const [fullscreen, setFullscreen] = useState(false)
  const [error, setError] = useState<EditorError | null>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const editor = useEditor({
    content: value,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      Link.configure({ autolink: true, isAllowedUri: isSafeLinkHref, openOnClick: false, shouldAutoLink: isSafeLinkHref }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: { attributes: { ...(ariaLabelledby ? { 'aria-labelledby': ariaLabelledby } : { 'aria-label': ariaLabel }), class: 'rich-text-editor__content' } },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML())
      onTextChange?.(currentEditor.getText({ blockSeparator: '\n' }))
      onDocumentChange?.(currentEditor.getJSON())
    },
  })

  useEffect(() => {
    if (!synchronizeValue || !editor || editor.isDestroyed) return
    const unchanged = typeof value === 'string' ? value === editor.getHTML() : JSON.stringify(value) === JSON.stringify(editor.getJSON())
    if (!unchanged) editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, synchronizeValue, value])

  useEffect(() => {
    if (!fullscreen) return
    const surface = surfaceRef.current
    surface?.focus()
    const handleKey = (event: KeyboardEvent) => {
      // A link dialog in the native top layer owns its own focus and Escape key.
      if (document.querySelector('.rich-text-editor__link-dialog[open]')) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setFullscreen(false); return }
      if (event.key !== 'Tab' || !surface) return
      const controls = Array.from(surface.querySelectorAll<HTMLElement>('button:not(:disabled), select, input:not([type="file"]), [contenteditable="true"]')).filter((node) => node.getClientRects().length)
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === surface)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === surface)) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [fullscreen])

  const addImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return
    if (!SAFE_IMAGE_TYPES.has(file.type)) {
      setError({ message: '지원하지 않는 이미지 형식입니다. PNG, JPEG, GIF, WebP 파일을 선택해 주세요.', source: 'image' })
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError({ message: '이미지 파일은 5MB 이하만 첨부할 수 있습니다.', source: 'image' })
      return
    }
    setError({ message: '본문 이미지는 첨부파일로 업로드한 뒤 게시글에 연결해 주세요.', source: 'image' })
  }

  const surface = <div aria-label={fullscreen ? `${ariaLabel} 전체 화면 편집` : undefined} aria-modal={fullscreen ? true : undefined} role={fullscreen ? 'dialog' : undefined} ref={surfaceRef} tabIndex={fullscreen ? -1 : undefined} className={`rich-text-editor ${className}${fullscreen ? ' is-fullscreen' : ''}`}><EditorToolbar editor={editor} errorId={error?.source === 'link' ? errorId : undefined} fullscreen={fullscreen} onError={(message) => setError(message ? { message, source: 'link' } : null)} onFullscreenToggle={() => setFullscreen((current) => !current)} onImageSelect={() => imageInputRef.current?.click()} /><input accept="image/gif,image/jpeg,image/png,image/webp" aria-describedby={error?.source === 'image' ? errorId : undefined} aria-invalid={error?.source === 'image' ? 'true' : undefined} aria-label="본문 이미지 선택" className="sr-only" onChange={addImage} ref={imageInputRef} type="file" /><EditorContent className="rich-text-editor__body" editor={editor} />{error ? <p className="rich-text-editor__error" id={errorId} role="alert">{error.message}</p> : null}</div>
  return fullscreen ? createPortal(surface, document.body) : surface
}

import { useRef, useState, type FormEvent } from 'react'
import type { JSONContent } from '@tiptap/core'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { RichTextEditor } from '../../components/ui/RichTextEditorControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { usePost, usePostActions } from '@/routes/community/-components/hooks/useContent'
import type { Post } from '@/domain/storefront/services'
import { isDefinitivePostRejection } from '@/domain/storefront/postSaveRetry'
import { CommunityShell } from './CommunityComponentsView'
import closeIcon from '../../assets/figma/product-list-close.svg'

type EditorAttachment = { id?: string; localId: string; name: string; size?: string; type?: string; file?: File }

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const toEditorHtml = (paragraphs: string[]) => paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
export function CommunityPostCreatePage({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const { postId } = useParams()
  const result = usePost(mode === 'edit' ? postId : undefined)
  if (mode === 'edit' && result.isPending) return <CommunityShell><LoadingState label="게시글을 불러오는 중입니다." /></CommunityShell>
  if (mode === 'edit' && (result.isError || !result.data || !result.data.isMine)) return <CommunityShell><p role="alert">수정할 게시글을 찾을 수 없습니다.</p><Link to="/community/posts">목록으로</Link></CommunityShell>
  return <PostEditor key={postId ?? 'new'} mode={mode} editingPost={result.data ?? null} />
}

function PostEditor({ mode, editingPost }: { mode: 'create' | 'edit'; editingPost: Post | null }) {
  const actions = usePostActions()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const submitting = useRef(false)
  const createAttempt = useRef<{ signature: string; key: string } | null>(null)
  const [files, setFiles] = useState<EditorAttachment[]>((editingPost?.attachments ?? []).map((file, index) => ({ ...file, localId: file.id ?? `${file.name}-${index}` })))
  const [title, setTitle] = useState(editingPost?.title || '')
  const [content, setContent] = useState(editingPost ? toEditorHtml(editingPost.content || []) : '')
  const [richContent, setRichContent] = useState<JSONContent | null>((editingPost?.richContent as JSONContent | null | undefined) ?? null)
  const [notice, setNotice] = useState('')
  const imageUploadLock = useRef(false)
  const [imagePending, setImagePending] = useState(false)
  function setImageUploadPending(pending: boolean) { imageUploadLock.current = pending; setImagePending(pending) }
  async function uploadImage(file: File) {
    if (!actions.uploadImage) throw new Error('이미지 업로드를 사용할 수 없습니다.')
    if (files.length >= 3) throw new Error('본문 이미지와 첨부파일은 합계 3개까지 등록할 수 있습니다.')
    const result = await actions.uploadImage(file)
    setFiles(current => [...current, { id: String(result.attachmentId), localId: String(result.attachmentId), name: file.name, size: `${Math.ceil(file.size / 1024)}KB`, type: file.type }])
    return result
  }
  const titleError = notice.startsWith('제목') ? notice : ''
  const contentError = notice.startsWith('게시글 내용') ? notice : ''
  const submitError = notice && !titleError && !contentError ? notice : ''
  const submitLabel = mode === 'edit' ? '수정 완료' : '등록'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || imageUploadLock.current) return
    const document = new DOMParser().parseFromString(content, 'text/html')
    const blocks = Array.from(document.body.querySelectorAll('p, li, h1, h2, h3, pre')).map((node) => node.textContent?.trim() ?? '').filter(Boolean)
    const paragraphs = blocks.length ? blocks : [(document.body.textContent ?? '').trim()].filter(Boolean)
    const plainText = paragraphs.join('\n').trim()
    if (!title.trim()) { setNotice('제목을 입력해 주세요.'); return }
    if (title.trim().length < 2 || title.trim().length > 100) { setNotice('제목은 2~100자로 입력해 주세요.'); return }
    if (!plainText) { setNotice('게시글 내용을 입력해 주세요.'); return }
    if (plainText.length < 10 || plainText.length > 10_000) { setNotice('게시글 내용은 10~10,000자로 입력해 주세요.'); return }
    submitting.current = true
    try {
      const draft = { title: title.trim(), content: paragraphs, richContent, attachments: files.map(({ id, name, size, type, file }) => ({ id, name, size: size ?? '', type: type ?? '', file })) }
      const signature = JSON.stringify({ ...draft, attachments: files.map(({ id, localId, name, size, type, file }) => ({ id, localId, name, size, type, fileSize: file?.size, fileModified: file?.lastModified })) })
      const idempotencyKey = mode === 'create'
        ? createAttempt.current?.signature === signature ? createAttempt.current.key : crypto.randomUUID()
        : undefined
      if (idempotencyKey) createAttempt.current = { signature, key: idempotencyKey }
      const saved = await actions.save.mutateAsync({
        id: editingPost?.postId,
        draft,
        idempotencyKey,
      })
      const listParams = params.toString()
      navigate(`/community/posts/${saved.postId}${listParams ? `?${listParams}` : ''}`, { replace: true })
    } catch (error) {
      if (mode === 'create' && isDefinitivePostRejection(error)) createAttempt.current = null
      setNotice(error instanceof Error ? error.message : '저장에 실패했습니다.')
    } finally { submitting.current = false }
  }
  return (
    <CommunityShell>
      <form className={`post-editor content-container${mode === 'edit' ? ' post-editor--edit' : ` post-editor--files-${files.length}`}`} onSubmit={submit}>
        <h1>{mode === 'edit' ? '게시글 수정' : '게시글 작성'}</h1>
        <label><span>제목</span><input aria-label="제목" aria-invalid={Boolean(titleError)} maxLength={100} onChange={(event) => { setTitle(event.target.value); setNotice('') }} placeholder="제목을 입력해 주세요." value={title} />{titleError ? <small className="post-editor__field-error" role="alert">{titleError}</small> : null}</label>
        <div className="post-editor__editor-field"><span id="post-editor-content-label">내용</span><RichTextEditor uploadImage={actions.uploadImage ? uploadImage : undefined} loadImage={actions.loadImage} onImageUploadPendingChange={setImageUploadPending} ariaLabelledby="post-editor-content-label" onChange={(value) => { setContent(value); setNotice('') }} onDocumentChange={(document) => setRichContent(document)} placeholder="" value={richContent ?? content} />{contentError ? <small className="post-editor__field-error" role="alert">{contentError}</small> : null}</div>
        <section className="post-files"><h2>첨부파일</h2><p>* 최대 3개까지 첨부 가능</p><label className="file-select">파일 선택<input className="sr-only" disabled={imagePending || actions.save.isPending} onChange={(event) => { const selected = Array.from(event.target.files ?? []).map((file) => ({ localId: crypto.randomUUID(), name: file.name, size: `${Math.ceil(file.size / 1024)}KB`, type: file.type, file })); setFiles((current) => [...current, ...selected].slice(0, 3)); event.currentTarget.value = '' }} type="file" multiple /></label>{files.map((file) => <div key={file.localId}><span>{file.name} <small>{file.size}</small></span><button aria-label={`${file.name} 삭제`} onClick={() => setFiles((current) => current.filter((item) => item.localId !== file.localId))} type="button"><img alt="" src={closeIcon} /></button></div>)}</section>
        <div className="post-editor__actions"><Link to={editingPost ? `/community/posts/${editingPost.postId}${params.toString() ? `?${params.toString()}` : ''}` : `/community/posts${params.toString() ? `?${params.toString()}` : ''}`}>취소</Link><button disabled={actions.save.isPending || imagePending} type="submit">{submitLabel}</button></div>
        {submitError ? <p className="post-editor__submit-error" role="alert">{submitError}</p> : null}
      </form>
    </CommunityShell>
  )
}

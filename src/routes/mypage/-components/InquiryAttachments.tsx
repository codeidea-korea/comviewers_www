import { useEffect, useRef, useState } from 'react'
import type { InquiryReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { Button } from '@/components/ui/ButtonControl'

export interface InquiryDraftAttachment { attachmentId: number; fileName: string; fileSize: number }

export function InquiryAttachments({ api, requestId, files, onChange, disabled, onBusy }: {
  api: InquiryReadServices; requestId: number; files: readonly InquiryDraftAttachment[];
  onChange: (files: readonly InquiryDraftAttachment[]) => void; disabled: boolean; onBusy: (busy: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const change = useRef(onChange)
  change.current = onChange
  useEffect(() => {
    const controller = new AbortController()
    lock.current = true; setBusy(true); onBusy(true)
    void api.pendingAttachments(requestId, controller.signal).then((pending) => change.current(pending))
      .catch(() => { if (!controller.signal.aborted) setError('전송 대기 첨부파일을 불러오지 못했습니다. 대화를 새로 열어 다시 확인해 주세요.') })
      .finally(() => { if (!controller.signal.aborted) { lock.current = false; setBusy(false); onBusy(false) } })
    return () => controller.abort()
  }, [api, requestId, onBusy])
  const upload = async (selected: FileList | null) => {
    const incoming = Array.from(selected ?? [])
    if (!incoming.length || lock.current || disabled) return
    if (incoming.length + files.length > 5 || incoming.some((file) => !file.size || file.size > 10 * 1024 * 1024)) {
      setError('첨부파일은 한 개당 10MB 이하, 최대 5개까지 선택할 수 있습니다.'); return
    }
    lock.current = true; setBusy(true); onBusy(true); setError('')
    let uploaded = [...files]
    try {
      for (const file of incoming) {
        const result = await api.uploadAttachment(requestId, file)
        uploaded = [...uploaded, result]; onChange(uploaded)
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : '파일을 올리지 못했습니다. 성공한 파일은 유지됩니다.') }
    finally { lock.current = false; setBusy(false); onBusy(false) }
  }
  const remove = async (attachmentId: number) => {
    if (lock.current || disabled) return
    lock.current = true; setBusy(true); onBusy(true); setError('')
    try { await api.discardAttachment(requestId, attachmentId); onChange(files.filter((file) => file.attachmentId !== attachmentId)) }
    catch { setError('첨부파일을 제거하지 못했습니다. 다시 시도해 주세요.') }
    finally { lock.current = false; setBusy(false); onBusy(false) }
  }
  return <fieldset disabled={disabled || busy}><legend>첨부파일 ({files.length}/5)</legend>
    <label>파일 선택<input type="file" multiple accept=".png,.jpg,.jpeg,.webp,.pdf,.txt" onChange={(event) => { void upload(event.target.files); event.target.value = '' }}/></label>
    <p className="inquiry-chat__attachment-help">PNG·JPG·WEBP·PDF·TXT, 파일당 최대 10MB. 안전 검사를 통과한 파일만 전송됩니다.</p>
    {files.length || busy || error ? <div className="inquiry-chat__attachment-list">
      {files.map((file) => <p className="inquiry-chat__attachment-file" key={file.attachmentId}>{file.fileName} ({file.fileSize.toLocaleString('ko-KR')} bytes) <Button size="small" variant="secondary" onClick={() => void remove(file.attachmentId)}>삭제</Button></p>)}
      {busy ? <p role="status">첨부파일 처리 중…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div> : null}
  </fieldset>
}

export function InquiryAttachmentDownload({ api, requestId, attachment }: {
  api: InquiryReadServices; requestId: number; attachment: { id: number; fileName: string; fileSize: number }
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const download = async () => {
    if (busy) return
    setBusy(true); setError(false)
    try {
      const blob = await api.downloadAttachment(requestId, attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = attachment.fileName
      document.body.append(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setError(true) } finally { setBusy(false) }
  }
  return <p><Button size="small" variant="secondary" disabled={busy} onClick={() => void download()}>{attachment.fileName} ({attachment.fileSize.toLocaleString('ko-KR')} bytes){busy ? ' · 내려받는 중…' : ''}</Button>
    {error ? <span role="alert"> 파일을 내려받지 못했습니다. 다시 시도해 주세요.</span> : null}</p>
}

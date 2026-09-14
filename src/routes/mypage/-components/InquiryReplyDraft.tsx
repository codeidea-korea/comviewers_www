import { useRef, useState } from 'react'
import type { MyAccountSnapshot } from '@/domain/myAccount/services'
import { inquiryDraftSchema, inquiryDraftTypeSchema } from '@/domain/myAccount/draftServices'
import { useInquiryDrafts } from './hooks/useAccountDrafts'
import { LoadingState } from '@/components/ui/LoadingStateControl'
type Inquiry = MyAccountSnapshot['inquiries'][number]
export function InquiryReplyDraft({ entry }: { entry: Inquiry }) {
  const drafts = useInquiryDrafts()
  if (drafts.isPending) return <LoadingState className="route-loading--compact" label="답변 초안을 불러오는 중입니다." />
  if (drafts.isError) return <p role="alert">답변 초안을 불러오지 못했습니다. <button onClick={() => void drafts.refetch()} type="button">다시 시도</button></p>
  return <ReplyForm key={entry.inquiryId} entry={entry} initial={drafts.data.find((draft) => draft.key === `reply:${entry.inquiryId}`)?.message ?? ''} />
}
function ReplyForm({ entry, initial }: { entry: Inquiry; initial: string }) {
  const drafts = useInquiryDrafts()
  const busy = useRef(false)
  const [message, setMessage] = useState(initial)
  const [notice, setNotice] = useState('')
  async function save() {
    if (busy.current) return
    const parsed = inquiryDraftSchema.safeParse({ key: `reply:${entry.inquiryId}`, inquiryId: entry.inquiryId, type: inquiryDraftTypeSchema.safeParse(entry.type).success ? entry.type : '기타 문의', rcpcIds: entry.rcpcIds, message })
    if (!parsed.success) { setNotice(parsed.error.issues[0]?.message ?? '입력 내용을 확인해 주세요.'); return }
    busy.current = true
    try { await drafts.save.mutateAsync(parsed.data); setNotice('답변 초안을 저장했습니다.') }
    catch (error) { setNotice(error instanceof Error ? error.message : '초안 저장에 실패했습니다.') }
    finally { busy.current = false }
  }
  return <><footer><input aria-label="문의 메시지" disabled={drafts.save.isPending} maxLength={5000} onChange={(event) => setMessage(event.target.value)} placeholder="메시지 입력" value={message} /><button disabled={drafts.save.isPending || !message.trim()} onClick={() => void save()} type="button">{drafts.save.isPending ? '저장 중…' : '초안 저장'}</button></footer>{notice ? <p role="status" className="mypage-notice">{notice}</p> : null}</>
}

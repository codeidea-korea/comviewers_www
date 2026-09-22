import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { colocationDraftInputSchema, colocationDraftSchema, type ColocationDraft } from '@/domain/colocation/draftRepository'
import { assignColocationEvidenceTypes, colocationSubmissionErrorMessage, validateColocation } from '../colocationInput'

const draftKey = ['colocationDraft'] as const
export function useColocationDraft() {
  const repository = useServices().colocationDraft
  return useQuery({ queryKey: draftKey, queryFn: async ({ signal }) => { const draft = await repository.get(signal); return draft === null ? null : colocationDraftSchema.parse(draft) }, staleTime: 0 })
}
export function useColocationForm(initialDraft: ColocationDraft | null) {
  const navigate = useNavigate()
  const repository = useServices().colocationDraft
  const client = useQueryClient()
  const busy = useRef(false)
  const [files, setFiles] = useState<File[]>(initialDraft?.files ?? [])
  const fileTypes = assignColocationEvidenceTypes(files.map(file => file.name))
  const submissionKey = useRef<{ fingerprint: string; key: string } | null>(null)
  const [notice, setNotice] = useState('')
  const [validationIssue, setValidationIssue] = useState<{ field: string; message: string } | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [emailDomain, setEmailDomain] = useState('direct')
  const [emailDomainInput, setEmailDomainInput] = useState(initialDraft?.fields.emailDomain ?? '')
  const [phonePrefix, setPhonePrefix] = useState(initialDraft?.fields.phonePrefix ?? '010')
  const [messenger, setMessenger] = useState(initialDraft?.fields.messenger ?? '')
  const save = useMutation({ mutationFn: async (input: Parameters<typeof repository.save>[0]) => colocationDraftSchema.parse(await repository.save(input)), onSuccess: (draft) => client.setQueryData(draftKey, draft) })
  const terms = useQuery({ queryKey: ['colocation', 'terms'], enabled: Boolean(repository.terms), queryFn: ({ signal }) => repository.terms!(signal) })
  const fixture: Partial<ColocationDraft['fields']> & { phone?: string[] } = initialDraft ? { ...initialDraft.fields, phone: [initialDraft.fields.phonePrefix, initialDraft.fields.phoneMiddle, initialDraft.fields.phoneLast] } : {}
  function updateFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    const next = [...files, ...incoming.filter((file) => !files.some((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified))]
    if (next.length > 5 || next.some((file) => !/\.(jpe?g|png|pdf)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024)) {
      setNotice('JPG, PNG, PDF 파일을 5개 이하, 파일당 10MB 이하로 선택해 주세요.')
    } else { setFiles(next); setNotice('파일을 선택했습니다.') }
    event.target.value = ''
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = event.currentTarget
    const checked = validateColocation(form, emailDomainInput, files.map(file => file.name))
    if (!checked.success) {
      const issue = checked.error.issues[0]
      const key = String(issue?.path[0] ?? '')
      setValidationIssue({ field: key, message: issue?.message ?? '입력값을 확인해 주세요.' })
      setNotice('')
      const field = form.elements.namedItem(key === 'email' ? 'emailId' : key === 'files' ? 'evidenceFiles' : key)
      if (field instanceof HTMLElement) { field.focus(); field.scrollIntoView({ block: 'center' }) }
      return
    }
    setValidationIssue(null)
    if (!terms.data) { setValidationIssue({ field: 'accepted', message: '입점 약관을 불러온 후 다시 신청해 주세요.' }); return }
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const input = { fields: { ...values, emailDomain: emailDomainInput, phonePrefix, messenger }, files, fileTypes, accepted: true, termsPolicyVersionId: terms.data?.id }
    const fingerprint = JSON.stringify({ ...input, files: files.map(file => [file.name, file.size, file.lastModified]) })
    if (submissionKey.current?.fingerprint !== fingerprint) {
      try { submissionKey.current = { fingerprint, key: crypto.randomUUID() } }
      catch { setNotice('안전한 연결 환경에서 다시 신청해 주세요.'); return }
    }
    const result = colocationDraftInputSchema.safeParse({ ...input, idempotencyKey: submissionKey.current?.key })
    if (!result.success) {
      const issue = result.error.issues[0]
      const key = String(issue?.path[0] === 'fields' ? issue.path[1] : issue?.path[0] ?? '')
      setValidationIssue({ field: key, message: issue?.message ?? '입력값을 확인해 주세요.' })
      const field = form.elements.namedItem(key)
      if (field instanceof HTMLElement) { field.focus(); field.scrollIntoView({ block: 'center' }) }
      return
    }
    busy.current = true
    setNotice('')
    try { await save.mutateAsync(result.data); setCompleteOpen(true) }
    catch (error) { setNotice(colocationSubmissionErrorMessage(error)) }
    finally { busy.current = false }
  }
  return { fixture, selectedFiles: files.map((file) => `${file.name} (${(file.size / 1024).toLocaleString('ko-KR', { maximumFractionDigits: 1 })} KB)`), removeFile: (index: number) => { setFiles(current => current.filter((_, itemIndex) => itemIndex !== index)); setNotice(current => current === '파일을 선택했습니다.' ? '' : current) },
    notice, validationIssue, completeOpen, setCompleteOpen, emailDomain, setEmailDomain, emailDomainInput, setEmailDomainInput,
    phonePrefix, setPhonePrefix, messenger, setMessenger, pending: save.isPending,
    submitLabel: '입점 신청',
    pendingLabel: '제출 중…',
    completeTitle: '입점 신청 완료',
    completeMessage: '입점 신청이 접수되었습니다. 제출하신 정보를 검토한 후 담당자 연락처로 결과를 안내해 드리겠습니다.',
    terms: terms.data, termsPending: terms.isPending, termsError: terms.isError || (terms.isSuccess && !terms.data), retryTerms: () => void terms.refetch(),
    closeComplete: () => { setCompleteOpen(false); navigate('/') },
    updateFiles, submit }
}

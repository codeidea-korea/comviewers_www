import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { colocationDraftInputSchema, colocationDraftSchema, colocationServerRooms, type ColocationDraft, type ColocationServerRoom } from '@/domain/colocation/draftRepository'
import { assignColocationEvidenceTypes, colocationRoomFieldName, colocationSubmissionErrorMessage, normalizeColocationEmailFields, validateColocation } from '../colocationInput'

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
  const [validationIssue, setValidationIssue] = useState<{ field: string; message: string } | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [emailDomain, setEmailDomain] = useState('direct')
  const [emailIdInput, setEmailIdInput] = useState(initialDraft?.fields.emailId ?? '')
  const [emailDomainInput, setEmailDomainInput] = useState(initialDraft?.fields.emailDomain ?? '')
  const [phonePrefix, setPhonePrefix] = useState(initialDraft?.fields.phonePrefix ?? '010')
  const [serverRooms, setServerRooms] = useState(() => (initialDraft ? colocationServerRooms(initialDraft) : [{ requestedServerRoomName: '', messengerType: '', messengerId: '' }]).map((room, index) => ({ ...room, id: String(index) })))
  const nextRoomId = useRef(serverRooms.length)
  const save = useMutation({
    mutationFn: async (input: Parameters<typeof repository.save>[0]) => colocationDraftSchema.parse(await repository.save(input)),
    onSuccess: () => { client.setQueryData<ColocationDraft | null>(draftKey, null) },
  })
  const terms = useQuery({ queryKey: ['colocation', 'terms'], enabled: Boolean(repository.terms), queryFn: ({ signal }) => repository.terms!(signal) })
  const fixture: Partial<ColocationDraft['fields']> & { phone?: string[] } = initialDraft ? { ...initialDraft.fields, phone: [initialDraft.fields.phonePrefix, initialDraft.fields.phoneMiddle, initialDraft.fields.phoneLast] } : {}
  function showIssue(form: HTMLFormElement, field: string, message: string) {
    setValidationIssue({ field, message })
    const name = field === 'email' ? 'emailId' : field === 'files' ? 'evidenceFiles' : field
    const input = form.elements.namedItem(name)
    if (input instanceof HTMLElement) {
      input.focus()
      const scrollTarget = field === 'files' ? input.closest('.colocation-file') ?? input : input
      scrollTarget.scrollIntoView({ block: 'center' })
    } else {
      form.querySelector('header')?.scrollIntoView({ block: 'center' })
    }
  }
  function updateEmailId(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    const fields = normalizeColocationEmailFields(value, '')
    setEmailIdInput(fields.emailId)
    if (fields.emailId !== value.trim()) {
      setEmailDomainInput(fields.emailDomain)
      setEmailDomain('direct')
      if (value.endsWith('@')) {
        const domainInput = event.currentTarget.form?.elements.namedItem('emailDomain')
        if (domainInput instanceof HTMLInputElement) domainInput.focus()
      }
    }
  }
  function updateEmailDomainInput(event: ChangeEvent<HTMLInputElement>) {
    const fields = normalizeColocationEmailFields('', event.target.value)
    if (fields.emailId) setEmailIdInput(fields.emailId)
    setEmailDomainInput(fields.emailDomain)
    setEmailDomain('direct')
  }
  function updateFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    const next = [...files, ...incoming.filter((file) => !files.some((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified))]
    if (next.length > 5 || next.some((file) => !/\.(jpe?g|png|pdf)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024)) {
      setValidationIssue({ field: 'files', message: 'JPG, PNG, PDF 파일을 5개 이하, 파일당 10MB 이하로 선택해 주세요.' })
    } else {
      setFiles(next)
      setValidationIssue(current => current?.field === 'files' ? null : current)
    }
    event.target.value = ''
  }
  function addServerRoom() {
    if (busy.current) return
    const id = String(nextRoomId.current++)
    setServerRooms(current => [...current, { id, requestedServerRoomName: '', messengerType: '', messengerId: '' }])
  }
  function removeServerRoom(id: string) {
    if (busy.current || id === serverRooms[0]?.id) return
    setServerRooms(current => current.filter(room => room.id !== id))
    setValidationIssue(current => current?.field.startsWith(`serverRoom-${id}-`) ? null : current)
  }
  function updateServerRoom(id: string, field: keyof ColocationServerRoom, value: string) {
    if (busy.current) return
    setServerRooms(current => current.map(room => room.id === id ? { ...room, [field]: value } : room))
  }
  function validationField(path: readonly PropertyKey[]): string {
    if (path[0] !== 'serverRooms') return String(path[0] ?? '')
    const index = Number(path[1])
    const room = serverRooms[index]
    return room ? colocationRoomFieldName(room.id, index, path[2] as keyof ColocationServerRoom) : 'form'
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const checked = validateColocation(form, emailDomainInput, files.map(file => file.name), serverRooms)
    const emailFields = normalizeColocationEmailFields(String(values.emailId ?? ''), String(values.emailDomain ?? emailDomainInput))
    setEmailIdInput(emailFields.emailId)
    setEmailDomainInput(emailFields.emailDomain)
    if (emailFields.emailDomain !== emailDomainInput) setEmailDomain('direct')
    if (!checked.success) {
      const issue = checked.error.issues[0]
      const key = validationField(issue?.path ?? [])
      showIssue(form, key, issue?.message ?? '입력값을 확인해 주세요.')
      return
    }
    setValidationIssue(null)
    if (!terms.data) { showIssue(form, 'accepted', '입점 약관을 불러온 후 다시 신청해 주세요.'); return }
    const firstRoom = checked.data.serverRooms[0]!
    const input = { fields: { ...values, emailId: checked.data.emailId, emailDomain: checked.data.emailDomain, phonePrefix, serverRoomName: firstRoom.requestedServerRoomName, messenger: firstRoom.messengerType, messengerId: firstRoom.messengerId }, serverRooms: checked.data.serverRooms, files, fileTypes, accepted: true, termsPolicyVersionId: terms.data?.id }
    const fingerprint = JSON.stringify({ ...input, files: files.map(file => [file.name, file.size, file.lastModified]) })
    if (submissionKey.current?.fingerprint !== fingerprint) {
      try { submissionKey.current = { fingerprint, key: crypto.randomUUID() } }
      catch { showIssue(form, 'form', '안전한 연결 환경에서 다시 신청해 주세요.'); return }
    }
    const result = colocationDraftInputSchema.safeParse({ ...input, idempotencyKey: submissionKey.current?.key })
    if (!result.success) {
      const issue = result.error.issues[0]
      const key = issue?.path[0] === 'fields' ? String(issue.path[1]) : validationField(issue?.path ?? [])
      const mappedField = key === 'termsPolicyVersionId' ? 'accepted' : key === 'fileTypes' ? 'files'
        : key === 'emailId' || key === 'emailDomain' ? 'email'
        : key === 'phonePrefix' ? 'phoneMiddle' : key === 'idempotencyKey' ? 'form' : key
      const field = mappedField.startsWith('serverRoom-') || ['businessName', 'businessNumber', 'representative', 'managerName', 'email', 'phoneMiddle', 'phoneLast', 'serverRoomName', 'messenger', 'messengerId', 'accepted', 'files'].includes(mappedField) ? mappedField : 'form'
      showIssue(form, field, issue?.message ?? '입력값을 확인해 주세요.')
      return
    }
    busy.current = true
    try { await save.mutateAsync(result.data); setCompleteOpen(true) }
    catch (error) {
      const message = colocationSubmissionErrorMessage(error)
      const field = message.includes('증빙') || message.includes('첨부파일') ? 'files'
        : message.includes('약관') ? 'accepted' : 'form'
      showIssue(form, field, message)
    }
    finally { busy.current = false }
  }
  return { fixture, selectedFiles: files.map((file) => `${file.name} (${(file.size / 1024).toLocaleString('ko-KR', { maximumFractionDigits: 1 })} KB)`), removeFile: (index: number) => setFiles(current => current.filter((_, itemIndex) => itemIndex !== index)),
    validationIssue, completeOpen, setCompleteOpen, emailDomain, setEmailDomain, emailIdInput, updateEmailId, emailDomainInput, setEmailDomainInput, updateEmailDomainInput,
    phonePrefix, setPhonePrefix, serverRooms, addServerRoom, removeServerRoom, updateServerRoom, pending: save.isPending,
    submitLabel: '입점 신청',
    pendingLabel: '제출 중…',
    completeTitle: '입점 신청 완료',
    completeMessage: '입점 신청이 접수되었습니다.',
    completeDescription: '제출하신 정보를 검토한 후 담당자 연락처로 결과를 안내해 드리겠습니다.',
    terms: terms.data, termsPending: terms.isPending, termsError: terms.isError || (terms.isSuccess && !terms.data), retryTerms: () => void terms.refetch(),
    closeComplete: () => { setCompleteOpen(false); navigate('/') },
    updateFiles, submit }
}

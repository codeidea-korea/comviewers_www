import { z } from 'zod'
import { colocationServerRoomSchema, type ColocationServerRoom } from '@/domain/colocation/draftRepository'

// Client input checks only; server must verify documents and current terms version.
const colocationInputSchema = z.object({
  businessName: z.string().trim().min(1, '상호명을 입력해 주세요.').max(150),
  businessNumber: z.string().min(1, '사업자등록번호를 입력해 주세요.').regex(/^\d{10}$/, '사업자등록번호를 숫자 10자리로 입력해 주세요.'),
  representative: z.string().trim().min(1, '대표자명을 입력해 주세요.').max(100),
  managerName: z.string().trim().min(1, '담당자명을 입력해 주세요.').max(100),
  emailId: z.string(),
  emailDomain: z.string(),
  email: z.string().min(1, '이메일을 입력해 주세요.').pipe(z.email('이메일 주소를 확인해 주세요.')),
  phoneMiddle: z.string().regex(/^\d{3,4}$/, '핸드폰 번호를 입력해 주세요.'),
  phoneLast: z.string().regex(/^\d{4}$/, '핸드폰 번호를 입력해 주세요.'),
  serverRooms: z.array(colocationServerRoomSchema).min(1, '서버실 정보를 입력해 주세요.'),
  accepted: z.literal(true, { error: '필수 약관에 동의해 주세요.' }),
  files: z.array(z.string()).min(2, '필수 증빙서류를 선택해 주세요.').max(5),
})

export type ColocationEvidenceType = 'business_license' | 'bankbook' | 'other'

export function assignColocationEvidenceTypes(files: readonly unknown[]): ColocationEvidenceType[] {
  return files.map((_, index) => index === 0 ? 'business_license' : index === 1 ? 'bankbook' : 'other')
}

export function hasRequiredColocationEvidenceTypes(fileTypes: readonly ColocationEvidenceType[]): boolean {
  return fileTypes.filter(type => type === 'business_license').length === 1
    && fileTypes.filter(type => type === 'bankbook').length === 1
}

export function colocationSubmissionErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '입점 신청을 제출하지 못했습니다.'
}

export function normalizeColocationEmailFields(emailId: string, emailDomain: string) {
  const fields = { emailId: emailId.trim(), emailDomain: emailDomain.trim() }
  const split = (value: string) => {
    const parts = value.split('@')
    return parts.length === 2 && parts[0] ? { emailId: parts[0], emailDomain: parts[1]! } : null
  }
  const fromId = split(fields.emailId)
  const fromDomain = split(fields.emailDomain)
  if ((fields.emailId.includes('@') && !fromId) || (fields.emailDomain.includes('@') && !fromDomain)) return fields
  if (fromId && fromDomain && (fromId.emailId !== fromDomain.emailId || fromId.emailDomain.toLowerCase() !== fromDomain.emailDomain.toLowerCase())) return fields
  return fromId ?? fromDomain ?? fields
}

export function validateColocation(form: HTMLFormElement, emailDomain: string, files: string[], serverRooms?: readonly ColocationServerRoom[]) {
  const values = Object.fromEntries(new FormData(form))
  const fields = normalizeColocationEmailFields(String(values.emailId ?? ''), String(values.emailDomain ?? emailDomain))
  const email = fields.emailId && fields.emailDomain ? `${fields.emailId}@${fields.emailDomain}` : ''
  const rooms = serverRooms ?? [{ requestedServerRoomName: String(values.serverRoomName ?? ''), messengerType: String(values.messenger ?? ''), messengerId: String(values.messengerId ?? '') }]
  return colocationInputSchema.safeParse({ ...values, ...fields, serverRooms: rooms, email, accepted: values.accepted === 'on', files })
}

export function colocationRoomFieldName(roomId: string, index: number, field: keyof ColocationServerRoom): string {
  const name = field === 'requestedServerRoomName' ? 'serverRoomName' : field === 'messengerType' ? 'messenger' : field
  return index === 0 ? name : `serverRoom-${roomId}-${name}`
}

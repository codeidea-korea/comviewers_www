import { z } from 'zod'

// Client input checks only; server must verify documents and current terms version.
const colocationInputSchema = z.object({
  businessName: z.string().trim().min(1, '상호명을 입력해 주세요.').max(150),
  businessNumber: z.string().min(1, '사업자등록번호를 입력해 주세요.').regex(/^\d{10}$/, '사업자등록번호를 숫자 10자리로 입력해 주세요.'),
  representative: z.string().trim().min(1, '대표자명을 입력해 주세요.').max(100),
  managerName: z.string().trim().min(1, '담당자명을 입력해 주세요.').max(100),
  email: z.string().min(1, '이메일을 입력해 주세요.').pipe(z.email('이메일 주소를 확인해 주세요.')),
  phoneMiddle: z.string().regex(/^\d{3,4}$/, '핸드폰 번호를 입력해 주세요.'),
  phoneLast: z.string().regex(/^\d{4}$/, '핸드폰 번호를 입력해 주세요.'),
  serverRoomName: z.string().trim().min(1, '서버실명을 입력해 주세요.').max(150),
  messenger: z.string().min(1, '상담 메신저 정보를 입력해 주세요.'),
  messengerId: z.string().trim().min(1, '상담 메신저 정보를 입력해 주세요.').max(100),
  accepted: z.literal(true, { error: '필수 약관에 동의해 주세요.' }),
  files: z.array(z.string()).min(2, '필수 증빙서류를 선택해 주세요.').max(5),
})

export type ColocationEvidenceType = 'business_license' | 'bankbook' | 'other'

export function assignColocationEvidenceTypes(fileNames: readonly string[]): ColocationEvidenceType[] {
  let businessAssigned = false
  let bankbookAssigned = false
  return fileNames.map((fileName) => {
    const normalized = fileName.toLowerCase().replace(/[\s_-]/g, '')
    if (!businessAssigned && /(사업자|business(?:registration|license))/.test(normalized)) {
      businessAssigned = true
      return 'business_license' as const
    }
    if (!bankbookAssigned && /(통장|bankbook|accountcopy)/.test(normalized)) {
      bankbookAssigned = true
      return 'bankbook' as const
    }
    return 'other' as const
  })
}

export function hasRequiredColocationEvidenceTypes(fileTypes: readonly ColocationEvidenceType[]): boolean {
  return fileTypes.filter(type => type === 'business_license').length === 1
    && fileTypes.filter(type => type === 'bankbook').length === 1
}

export function colocationSubmissionErrorMessage(error: unknown, live: boolean): string {
  if (error instanceof Error && error.message === '동일 사업자번호로 신청·검토 중이거나 승인된 입점 내역이 있습니다.') {
    return '검토 중인 입점 신청 내역이 있습니다.'
  }
  if (error instanceof Error) return error.message
  return live ? '입점 신청을 제출하지 못했습니다.' : '초안을 저장하지 못했습니다. 다시 시도해 주세요.'
}

export function validateColocation(form: HTMLFormElement, emailDomain: string, files: string[]) {
  const values = Object.fromEntries(new FormData(form))
  const emailId = String(values.emailId ?? '').trim()
  const normalizedDomain = emailDomain.trim()
  const email = emailId && normalizedDomain ? `${emailId}@${normalizedDomain}` : ''
  return colocationInputSchema.safeParse({ ...values, email, accepted: values.accepted === 'on', files })
}

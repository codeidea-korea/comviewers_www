import { z } from 'zod'
import { ApiClientError, type ApiClient } from './httpClient'
import type { ColocationDraftInput } from '@/domain/colocation/draftRepository'

const id = z.number().int().positive().safe()
const policy = z.object({ id, kind: z.literal('server-room'), title: z.string().min(1), version: z.string(), effectiveDate: z.iso.date(), content: z.string().min(1) })
const request = z.object({
  businessNumber: z.string().regex(/^[0-9]{10}$/), companyName: z.string().trim().min(1).max(150), ceoName: z.string().trim().min(1).max(100),
  contactName: z.string().trim().min(1).max(100), contactDepartment: z.string().max(100), contactPosition: z.string().max(100),
  contactEmail: z.email().max(255), contactMobile: z.string().regex(/^[0-9-]{9,30}$/), requestedServerRoomName: z.string().trim().min(1).max(150),
  address: z.string().max(500), phone: z.string().max(30), messengerType: z.string().trim().min(1).max(50), messengerId: z.string().trim().min(1).max(100),
  termsPolicyVersionId: id, idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/), accepted: z.literal(true),
})

export function createServerRoomApplicationApi(client: ApiClient, authenticated: boolean) {
  return {
    async terms(signal?: AbortSignal) {
      const rows = await client.request('/api/v1/policies/public-documents', policy.array(), { query: { kind: 'server-room' }, signal })
      return rows[0] ?? null
    },
    async create(input: ColocationDraftInput) {
      const types = input.fileTypes ?? []
      if (types.length !== input.files.length || types.filter(type => type === 'business_license').length !== 1 || types.filter(type => type === 'bankbook').length !== 1) throw new Error('사업자등록증과 통장 사본을 각각 한 개 지정해 주세요.')
      const fields = input.fields
      const phone = [fields.phonePrefix, fields.phoneMiddle, fields.phoneLast].join('-')
      const application = request.parse({ businessNumber: fields.businessNumber, companyName: fields.businessName, ceoName: fields.representative,
        contactName: fields.managerName, contactDepartment: '', contactPosition: fields.position, contactEmail: `${fields.emailId}@${fields.emailDomain}`,
        contactMobile: phone, requestedServerRoomName: fields.serverRoomName, address: '', phone, messengerType: fields.messenger, messengerId: fields.messengerId,
        termsPolicyVersionId: input.termsPolicyVersionId, idempotencyKey: input.idempotencyKey, accepted: input.accepted })
      const body = new FormData()
      body.append('application', new Blob([JSON.stringify(application)], { type: 'application/json' }))
      input.files.forEach((file, index) => body.append(types[index] === 'business_license' ? 'businessLicense' : types[index] === 'bankbook' ? 'bankbook' : 'attachments', file))
      try { return await client.request('/api/v1/server-room-applications', id, { method: 'POST', authenticated, body }) }
      catch (error) {
        if (error instanceof ApiClientError) {
          if (error.code === 'SR001') throw new Error('동일 사업자번호로 신청·검토 중이거나 승인된 입점 내역이 있습니다.')
          if (error.code === 'SR002') throw new Error('증빙 저장 또는 악성코드 검사를 완료하지 못했습니다. 잠시 후 다시 신청해 주세요.')
          if (error.code === 'SR003') throw new Error('입점 약관이 변경되었습니다. 새로고침 후 최신 약관에 동의해 주세요.')
          if (error.status === 429 || error.code === 'A007') throw new Error('신청 요청이 많습니다. 잠시 후 다시 시도해 주세요.')
        }
        throw error
      }
    },
  }
}
export type ServerRoomApplicationApi = ReturnType<typeof createServerRoomApplicationApi>

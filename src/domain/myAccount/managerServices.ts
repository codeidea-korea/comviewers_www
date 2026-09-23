import { z } from 'zod'
import type { MyAccountSnapshot } from './services'
export const managerInputSchema = z.object({
  name: z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,10}$/, '담당자명은 1~10자의 한글, 영문, 숫자로 입력해 주세요.'),
  loginId: z.string().trim().regex(/^[A-Za-z0-9_]{5,16}$/, '아이디는 5~16자의 영문, 숫자, 밑줄로 입력해 주세요.'),
  password: z.string().regex(/^[A-Za-z0-9!@#$%]{8,16}$/, '비밀번호는 8~16자의 영문, 숫자, 특수문자(!, @, #, $, %)로 입력해 주세요.').optional(),
  memo: z.string().max(500, '메모는 500자 이하로 입력해 주세요.'),
  permissionGroupId: z.number().int().positive().safe().optional(),
})
export type ManagerInput = z.infer<typeof managerInputSchema>
export const isActiveManager = (item: { status: string }) => item.status === '사용중' || item.status === '활성'
export type AccountManager = MyAccountSnapshot['managers'][number]
export interface ManagerServices {
  isManagerLoginAvailable(loginId: string): Promise<boolean>
  saveManager(input: { id?: string; draft: ManagerInput }): Promise<void>
  assignManager(input: { managerId: string | null; rcpcIds: readonly string[] }): Promise<void>
  deleteManager(id: string): Promise<void>
}
export function saveManagerSnapshot(snapshot: MyAccountSnapshot, input: { id?: string; draft: ManagerInput }): MyAccountSnapshot {
  const draft = managerInputSchema.parse(input.draft)
  const existing = input.id ? snapshot.managers.find((item) => item.id === input.id) : undefined
  if (input.id && (!existing || !isActiveManager(existing))) throw new Error('담당자를 찾을 수 없습니다.')
  if (existing && existing.loginId !== draft.loginId) throw new Error('담당자 아이디는 변경할 수 없습니다.')
  if (snapshot.managers.some((item) => item.id !== input.id && item.loginId.toLowerCase() === draft.loginId.toLowerCase()) || snapshot.profile.userId.toLowerCase() === draft.loginId.toLowerCase()) throw new Error('이미 사용 중인 아이디입니다.')
  const id = existing?.id ?? `manager-${crypto.randomUUID()}`
  const profile = { name: draft.name, loginId: draft.loginId, memo: draft.memo }
  const manager = { ...(existing ?? { id, managerId: id, assignedRcpcIds: [], assignmentHistory: [], status: '활성' }), ...profile }
  return { ...snapshot, managers: existing ? snapshot.managers.map((item) => item.id === id ? manager : item) : [...snapshot.managers, manager] }
}
export function assignManagerSnapshot(snapshot: MyAccountSnapshot, input: { managerId: string | null; rcpcIds: readonly string[] }): MyAccountSnapshot {
  const ids = z.array(z.string().min(1)).min(1, 'RCPC를 선택해 주세요.').parse(input.rcpcIds)
  if (new Set(ids).size !== ids.length || ids.some((id) => !snapshot.rcpcs.some((item) => item.id === id))) throw new Error('선택한 RCPC를 확인해 주세요.')
  if (input.managerId && !snapshot.managers.some((item) => item.id === input.managerId && isActiveManager(item))) throw new Error('담당자를 찾을 수 없습니다.')
  const numbers = snapshot.rcpcs.filter((item) => ids.includes(item.id)).map((item) => item.rcpcId)
  return { ...snapshot, managers: snapshot.managers.map((item) => {
    const next = item.id === input.managerId ? [...new Set([...item.assignedRcpcIds, ...numbers])] : item.assignedRcpcIds.filter((number) => !numbers.includes(number))
    const at = new Date().toISOString()
    const changes = [...item.assignedRcpcIds.filter((id) => !next.includes(id)).map((rcpcId) => ({ rcpcId, action: 'unassigned' as const, at })), ...next.filter((id) => !item.assignedRcpcIds.includes(id)).map((rcpcId) => ({ rcpcId, action: 'assigned' as const, at }))]
    return { ...item, assignedRcpcIds: next, assignmentHistory: [...item.assignmentHistory, ...changes] }
  }) }
}
export function deleteManagerSnapshot(snapshot: MyAccountSnapshot, id: string): MyAccountSnapshot {
  if (!snapshot.managers.some((item) => item.id === id && isActiveManager(item))) throw new Error('담당자를 찾을 수 없습니다.')
  return { ...snapshot, managers: snapshot.managers.map((item) => item.id === id ? { ...item, status: 'inactive', assignedRcpcIds: [], assignmentHistory: [...item.assignmentHistory, ...item.assignedRcpcIds.map((rcpcId) => ({ rcpcId, action: 'unassigned' as const, at: new Date().toISOString() }))] } : item) }
}

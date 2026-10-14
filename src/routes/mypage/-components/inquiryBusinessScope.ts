export const bulkInquiryBusinessNotice = '일괄문의는 동일 사업자에서만 가능합니다.'

type BusinessTarget = { serverRoomId?: number | null; serverRoomBusinessKey?: string | null }

export function hasSameInquiryBusiness(targets: readonly BusinessTarget[]): boolean {
  if (targets.length < 2) return true
  const keys = targets.map(target => target.serverRoomBusinessKey).filter((key): key is string => Boolean(key))
  if (new Set(keys).size > 1) return false
  // One server room has one operator, even when its business profile is unavailable.
  const roomId = targets[0]?.serverRoomId
  if (roomId != null && Number.isSafeInteger(roomId) && roomId > 0
    && targets.every(target => target.serverRoomId === roomId)) return true
  return keys.length === targets.length && new Set(keys).size === 1
}

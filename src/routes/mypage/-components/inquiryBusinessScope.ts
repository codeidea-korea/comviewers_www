export const bulkInquiryBusinessNotice = '일괄문의는 동일 사업자에서만 가능합니다.'

type BusinessTarget = { serverRoomBusinessKey?: string | null }

export function hasSameInquiryBusiness(targets: readonly BusinessTarget[]): boolean {
  if (targets.length < 2) return true
  const key = targets[0]?.serverRoomBusinessKey
  return Boolean(key) && targets.every(target => target.serverRoomBusinessKey === key)
}

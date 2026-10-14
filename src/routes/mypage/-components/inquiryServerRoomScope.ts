export const bulkInquiryServerRoomNotice = '일괄 문의 불가: 동일 서버실의 RCPC만 선택해 주세요.'

type ServerRoomTarget = { serverRoomId?: number | null }

export function hasSameInquiryServerRoom(targets: readonly ServerRoomTarget[]): boolean {
  if (targets.length < 2) return true
  const roomId = targets[0]?.serverRoomId
  return roomId != null && targets.every(target => target.serverRoomId === roomId)
}

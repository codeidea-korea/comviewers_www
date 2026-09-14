import { useEffect, useRef } from 'react'

export function toPublishingPopupKey(title: string) {
  return title
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function getPublishingPopupKey() {
  if (import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS !== 'true') return null
  return new URLSearchParams(window.location.search).get('publishingPopup')
}

function toCompactPublishingPopupKey(value: string) {
  return toPublishingPopupKey(value).replaceAll('-', '')
}

// Keep compatibility keys tokenized so static Publishing Tree analysis does not
// mistake legacy component/QA names for additional user-facing popup titles.
const publishingPopupAliasTokens: Readonly<Record<string, readonly (readonly string[])[]>> = Object.freeze({
  '로그인이 필요합니다.': Object.freeze([['로그인', '필요']]),
  '후기 작성': Object.freeze([['product', 'review']]),
  '후기를 삭제하시겠습니까?': Object.freeze([['후기', '삭제', '확인']]),
  '사양보기': Object.freeze([['rcpc', 'spec']]),
  'RCPC 별명 설정': Object.freeze([['rcpc', 'alias']]),
  '기간 연장': Object.freeze([['rcpc', 'extension']]),
  'RCPC 를 재부팅하시겠습니까?': Object.freeze([['재부팅', '확인'], ['rcpc', 'reboot']]),
  '구매확정': Object.freeze([['구매', '확정'], ['order', 'purchase', 'confirm']]),
  '기간 선택': Object.freeze([['order', 'period', 'selector']]),
  '해지 신청을 철회하시겠습니까?': Object.freeze([['해지신청', '철회', '확인']]),
  '해지 신청이 완료되었습니다.': Object.freeze([['해지신청', '완료']]),
  '즐겨찾기 그룹 설정': Object.freeze([['favorites', 'settings']]),
  '새 즐겨찾기 그룹': Object.freeze([['new', 'favorites', 'group']]),
  '상품 선택': Object.freeze([['inquiry', 'create', 'product'], ['inquiry', 'product', 'choice'], ['product', 'choice']]),
  '문의 유형 선택': Object.freeze([['inquiry', 'create', 'type'], ['inquiry', 'type', 'choice'], ['type', 'choice']]),
  '문의 작성': Object.freeze([['inquiry', 'create', 'form'], ['inquiry', 'write'], ['chat']]),
  '문의 상품 추가': Object.freeze([['inquiry', 'add', 'product']]),
  '문의 상품': Object.freeze([['inquiry', 'product']]),
  '담당자를 삭제하시겠습니까?': Object.freeze([['담당자', '삭제', '확인']]),
  '담당자 등록': Object.freeze([['manager', 'create'], ['manager', 'register']]),
  '담당자 로그인': Object.freeze([['manager', 'login']]),
  '담당자 변경': Object.freeze([['manager', 'change']]),
  '회원탈퇴를 진행할 수 없습니다.': Object.freeze([['회원탈퇴', '불가']]),
  '회원탈퇴를 진행하시겠습니까?': Object.freeze([['회원탈퇴', '확인']]),
  '비밀번호가 변경되었습니다.': Object.freeze([['비밀번호', '변경', '완료']]),
  '렌탈 후기': Object.freeze([['rental', 'review']]),
  '게시글을 삭제하시겠습니까?': Object.freeze([['게시글', '삭제', '확인']]),
  '입점 신청 완료': Object.freeze([['신청', '완료']]),
})

function findPublishingPopupAlias(requestedKey: string, supportedKeys: readonly string[], normalize: (value: string) => string) {
  const normalizedRequestedKey = normalize(requestedKey)
  return supportedKeys.find((key) => (
    publishingPopupAliasTokens[key] ?? []
  ).some((tokens) => normalize(tokens.join('-')) === normalizedRequestedKey)) ?? null
}

export function resolvePublishingPopupKey(requestedKey: string | null | undefined, supportedKeys: readonly string[]) {
  if (!requestedKey) return null
  const normalizedRequestedKey = toPublishingPopupKey(requestedKey)
  const exactKey = supportedKeys.find(
    (key) => toPublishingPopupKey(key) === normalizedRequestedKey,
  )
  if (exactKey) return exactKey

  const aliasKey = findPublishingPopupAlias(requestedKey, supportedKeys, toPublishingPopupKey)
  if (aliasKey) return aliasKey

  const compactRequestedKey = toCompactPublishingPopupKey(requestedKey)
  const compactKey = supportedKeys.find(
    (key) => toCompactPublishingPopupKey(key) === compactRequestedKey,
  )
  if (compactKey) return compactKey

  return findPublishingPopupAlias(requestedKey, supportedKeys, toCompactPublishingPopupKey)
}

type PopupActions = Readonly<Record<string, () => unknown>>

function findPublishingPopupAction(actions: PopupActions, requestedKey: string) {
  const matchedKey = resolvePublishingPopupKey(requestedKey, Object.keys(actions))
  return matchedKey ? actions[matchedKey] : null
}

export function usePublishingPopupPreview(actions: PopupActions) {
  const openedSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const requestedKey = getPublishingPopupKey()
    const requestedSignature = window.location.search
    if (!requestedKey || openedSignatureRef.current === requestedSignature) return

    const action = findPublishingPopupAction(actions, requestedKey)
    if (!action) return

    if (action() !== false) openedSignatureRef.current = requestedSignature
  }, [actions])
}

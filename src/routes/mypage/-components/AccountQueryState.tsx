import { useUiTranslation } from '@/i18n/uiTranslation'
import { LoadingState } from '@/components/ui/LoadingStateControl'

export function AccountQueryState({ pending, error, retry }: { pending: boolean; error: Error | null; retry: () => unknown }) {
  const { uiText } = useUiTranslation()
  if (pending) return <LoadingState className="route-loading--compact" label={uiText("정보를 불러오는 중입니다.")} />
  if (error) return <div role="alert" className="mypage-notice mypage-notice--error"><p>{uiText(error.message || '정보를 불러오지 못했습니다.')}</p><button onClick={() => { void retry() }} type="button">{uiText("다시 시도")}</button></div>
  return null
}

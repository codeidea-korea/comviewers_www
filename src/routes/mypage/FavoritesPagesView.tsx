import { useUiTranslation } from '@/i18n/uiTranslation'
import { useServices } from '@/app/ServiceProvider'
import { FavoritesPageContent } from './-components/favorites/FavoritesPageContent'
import { MyPageLayout } from './MypageComponentsView'

export function FavoritesPage({ settings = false }: { settings?: boolean }) {
  const { uiText } = useUiTranslation()
  const { myAccount } = useServices()
  if (!myAccount.rcpcApi || !myAccount.rcpcMutations) {
    return <MyPageLayout title={uiText("즐겨찾기")}><p role="alert">{uiText("즐겨찾기 정보를 불러오지 못했습니다.")}</p></MyPageLayout>
  }
  return <FavoritesPageContent api={myAccount.rcpcApi} mutations={myAccount.rcpcMutations} settings={settings}/>
}

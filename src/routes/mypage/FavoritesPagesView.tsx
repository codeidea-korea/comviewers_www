import { useServices } from '@/app/ServiceProvider'
import { FavoritesPageContent } from './-components/HttpFavoritesPage'
import { MyPageLayout } from './MypageComponentsView'

export function FavoritesPage({ settings = false }: { settings?: boolean }) {
  const { myAccount } = useServices()
  if (!myAccount.rcpcApi || !myAccount.rcpcMutations) {
    return <MyPageLayout title="즐겨찾기"><p role="alert">즐겨찾기 정보를 불러오지 못했습니다.</p></MyPageLayout>
  }
  return <FavoritesPageContent api={myAccount.rcpcApi} mutations={myAccount.rcpcMutations} settings={settings}/>
}

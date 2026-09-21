import { useServices } from '@/app/ServiceProvider'
import { StoragePageContent } from './-components/storage/StoragePageContent'
import { MyPageLayout } from './MypageComponentsView'

export function StoragePage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) return <MyPageLayout title="보관함"><p role="alert">보관함을 불러오지 못했습니다.</p></MyPageLayout>
  return <StoragePageContent api={myAccount.readApi} rcpcApi={myAccount.rcpcApi} />
}

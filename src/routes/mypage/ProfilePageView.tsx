import { useServices } from '@/app/ServiceProvider'
import { ProfilePageContent } from './-components/profile/ProfilePageContent'
import { MyPageLayout } from './MypageComponentsView'

export function ProfilePage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) {
    return <MyPageLayout title="내 정보 수정"><p role="alert">회원 정보를 불러오지 못했습니다.</p></MyPageLayout>
  }
  return <ProfilePageContent api={myAccount.readApi} mutations={myAccount.profileMutations} withdrawal={myAccount.withdrawalApi}/>
}

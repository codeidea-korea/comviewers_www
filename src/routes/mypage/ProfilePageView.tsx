import { useServices } from '@/app/ServiceProvider'
import { ProfilePageContent } from './-components/profile/ProfilePageContent'
import { LoginMethodsSection } from './LoginMethodsPageView'
import { MyPageLayout } from './MypageComponentsView'
import { useLocation, useSearchParams } from 'react-router'

export function ProfilePage() {
  const { myAccount } = useServices()
  const location = useLocation()
  const [params] = useSearchParams()
  const active = params.get('section') === 'login-methods' ? 'login-methods' : 'profile'
  return <MyPageLayout title="내 정보 수정">
    <div className="profile-settings-page">
      {active === 'login-methods'
        ? <LoginMethodsSection/>
        : myAccount.readApi
          ? <ProfilePageContent key={location.key} api={myAccount.readApi} mutations={myAccount.profileMutations} withdrawal={myAccount.withdrawalApi}/>
          : <p role="alert">회원 정보를 불러오지 못했습니다.</p>}
    </div>
  </MyPageLayout>
}

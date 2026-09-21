import { useServices } from '@/app/ServiceProvider'
import { ProfilePageContent } from './-components/profile/ProfilePageContent'
import { LoginMethodsSection } from './LoginMethodsPageView'
import { MyPageLayout, MyPageTabs } from './MypageComponentsView'
import { useSearchParams } from 'react-router'

export function ProfilePage() {
  const { myAccount } = useServices()
  const [params] = useSearchParams()
  const active = params.get('section') === 'login-methods' ? 'login-methods' : 'profile'
  return <MyPageLayout title="내 정보 수정">
    <div className="profile-settings-page">
      <MyPageTabs active={active} items={[
        { id: 'profile', label: '회원 정보', href: '/mypage/profile' },
        { id: 'login-methods', label: '로그인 및 보안', href: '/mypage/profile?section=login-methods' },
      ]}/>
      {active === 'login-methods'
        ? <LoginMethodsSection/>
        : myAccount.readApi
          ? <ProfilePageContent api={myAccount.readApi} mutations={myAccount.profileMutations} withdrawal={myAccount.withdrawalApi}/>
          : <p role="alert">회원 정보를 불러오지 못했습니다.</p>}
    </div>
  </MyPageLayout>
}

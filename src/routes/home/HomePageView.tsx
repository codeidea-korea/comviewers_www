import { useHomeContent } from './-components/hooks/useHomeContent'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AppShell } from '../../components/layout/AppShellView'
import { Modal } from '../../components/ui/ModalControl'
import { useSession } from '../../app/session/SessionProvider'
import { HomeHeroSection } from './-components/HomeHeroSection'
import { HomeIntroSection } from './-components/HomeIntroSection'
import { HomeRecommendedSection } from './-components/HomeRecommendedSection'
import { HomeCommunitySection } from './-components/HomeCommunitySection'
import { HomeUsageSection } from './-components/HomeUsageSection'
import { HomeSecuritySection } from './-components/HomeSecuritySection'
import { HomeCallToAction } from './-components/HomeCallToAction'
import { HomeBannerSection } from './-components/HomeBannerSection'
import './home-publishing.css'

export function HomePage() {
  const navigate = useNavigate()
  const session = useSession()
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false)
  const [loginRequiredMessage, setLoginRequiredMessage] = useState('상품을 구매하려면 로그인해 주세요.\n로그인 후 구매를 계속할 수 있습니다.')
  const [loginReturnPath, setLoginReturnPath] = useState('/products')
  const [recommendedUseOptionId, setRecommendedUseOptionId] = useState<number | null>(null)
  const content = useHomeContent(recommendedUseOptionId)
  const writeCommunityPost = () => {
    if (session.status === 'authenticated') { void navigate('/community/posts/new'); return }
    setLoginRequiredMessage('게시글을 작성하려면 로그인해 주세요.\n로그인 후 커뮤니티 글쓰기를 계속할 수 있습니다.')
    setLoginReturnPath('/community/posts/new')
    setLoginRequiredOpen(true)
  }
  return (
    <AppShell className="app-shell--home" headerState="main">
      <HomeHeroSection />
      <HomeIntroSection />
      <HomeRecommendedSection content={content} selectedOptionId={recommendedUseOptionId} onOptionChange={setRecommendedUseOptionId} />
      <HomeBannerSection />
      <HomeCommunitySection content={content} onWritePost={writeCommunityPost} />
      <HomeUsageSection articleId={content.usageGuides.data?.[0]?.articleId} />
      <HomeSecuritySection />
      <HomeCallToAction />
      <Modal closeLabel="취소" confirmLabel="로그인하기" isOpen={loginRequiredOpen} onClose={() => setLoginRequiredOpen(false)} onConfirm={() => navigate(`/login?returnTo=${encodeURIComponent(loginReturnPath)}`)} title="로그인이 필요합니다."><p>{loginRequiredMessage.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 ? <br /> : null}{line}</span>)}</p></Modal>
    </AppShell>
  )
}

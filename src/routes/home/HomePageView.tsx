import { useHomeContent } from './-components/hooks/useHomeContent'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { AppShell } from '../../components/layout/AppShellView'
import { useSession } from '../../app/session/SessionProvider'
import { useServices } from '../../app/ServiceProvider'
import { usePublicQueryClient } from '../../app/PublicCatalogQueryProvider'
import { HomeHeroSection } from './-components/HomeHeroSection'
import { HomeIntroSection } from './-components/HomeIntroSection'
import { HomeRecommendedSection } from './-components/HomeRecommendedSection'
import { HomeCommunitySection } from './-components/HomeCommunitySection'
import { HomeUsageSection } from './-components/HomeUsageSection'
import { HomeSecuritySection } from './-components/HomeSecuritySection'
import { HomeCallToAction } from './-components/HomeCallToAction'
import { HomeBannerSection } from './-components/HomeBannerSection'
import { HomeStorePopup } from './-components/HomeStorePopup'
import './home-publishing.css'

const popupDismissalKey = (id: number) => `comviewers:home-popup:hidden-until:${id}`

function isHiddenToday(id: number) {
  try {
    return Number(window.localStorage.getItem(popupDismissalKey(id))) > Date.now()
  } catch {
    return false
  }
}

function hideForToday(id: number) {
  const tomorrow = new Date()
  tomorrow.setHours(24, 0, 0, 0)
  try {
    window.localStorage.setItem(popupDismissalKey(id), String(tomorrow.getTime()))
  } catch {
    // Storage can be unavailable; the popup is still dismissed for this visit.
  }
}

export function HomePage() {
  const session = useSession()
  const { storefront } = useServices()
  const publicClient = usePublicQueryClient()
  const [dismissedPopupIds, setDismissedPopupIds] = useState<number[]>([])
  const popupQuery = useQuery({ queryKey: ['storefront', 'active-popups'], queryFn: () => storefront.listActivePopups(), retry: false }, publicClient)
  const popupAudience = session.status === 'authenticated' ? 'customer' : 'guest'
  const activePopup = popupQuery.data?.find((popup) => !dismissedPopupIds.includes(popup.id) && !isHiddenToday(popup.id)
    && popup.targets.some((target) => target.targetType === 'all' || target.targetType === popupAudience))
  const [recommendedUseOptionId, setRecommendedUseOptionId] = useState<number | null>(null)
  const content = useHomeContent(recommendedUseOptionId)
  const dismissPopup = (id: number) => setDismissedPopupIds((ids) => [...ids, id])
  return (
    <AppShell className="app-shell--home" headerState="main">
      <HomeHeroSection />
      <HomeIntroSection />
      <HomeRecommendedSection content={content} selectedOptionId={recommendedUseOptionId} onOptionChange={setRecommendedUseOptionId} />
      <HomeBannerSection />
      <HomeCommunitySection content={content} />
      <HomeUsageSection articleId={content.usageGuides.data?.items[0]?.articleId} />
      <HomeSecuritySection />
      <HomeCallToAction />
      {activePopup && <HomeStorePopup key={activePopup.id} popup={activePopup} onClose={() => dismissPopup(activePopup.id)} onHideToday={() => { hideForToday(activePopup.id); dismissPopup(activePopup.id) }} />}
    </AppShell>
  )
}

import type { ReactNode } from 'react'
import { TranslatedText } from '@/i18n/translation'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { AppShell } from '../../components/layout/AppShellView'
import communityChevronDown from '../../assets/figma/community-chevron-down.svg'
import communityHeroDecoration from '../../assets/figma/community-hero-decoration.png'
import communitySearch from '../../assets/figma/community-search.svg'
import { BoardToolbar as SharedBoardToolbar } from '../../components/community/BoardToolbarControl'
import reviewStarEmpty from '../../assets/figma/review-star-empty.svg'
import reviewStarFilled from '../../assets/figma/review-star-filled.svg'

export const communityTabs = [
  { id: 'posts', label: '커뮤니티', href: '/community/posts' },
  { id: 'reviews', label: '렌탈 후기', href: '/community/reviews' },
]

export function CommunityShell({ children, description, isolated = false, plain = false, support = false, title = '커뮤니티' }: { children: ReactNode; description?: ReactNode; isolated?: boolean; plain?: boolean; support?: boolean; title?: string }) {
  if (isolated) return <main className="community-shell community-shell--isolated">{children}</main>

  return (
    <AppShell className="community-shell">
      {!plain ? <section className={`community-hero${support ? ' community-hero--support' : ''}`}>
        {!support ? <span aria-hidden="true" className="community-hero__decoration"><img alt="" src={communityHeroDecoration} /></span> : null}
        <div className="content-container"><h1>{title === '커뮤니티' ? <TranslatedText id="nav.community" /> : title === '고객센터' ? <TranslatedText id="nav.support" /> : title === '렌탈 후기' ? <TranslatedText id="nav.rentalReviews" /> : title}</h1>{description ? <p>{description}</p> : null}</div>
      </section> : null}
      {children}
    </AppShell>
  )
}

export function CommunityTabs({ active }: { active: 'posts' | 'reviews' }) {
  return <nav aria-label="커뮤니티 구분" className="community-tabs">{communityTabs.map((tab) => <Link className={tab.id === active ? 'is-active' : ''} key={tab.id} to={tab.href}><TranslatedText id={tab.id === 'reviews' ? 'nav.rentalReviews' : 'nav.community'} /></Link>)}</nav>
}

export function BoardToolbar({ count, onSearchChange, onSortChange, onWrite, search = '', showWrite = false, sort = 'latest', sortOptions, writeLabel, writeTo }: { count: number; onSearchChange: (value: string) => void; onSortChange: (value: string) => void; onWrite?: () => void; search?: string; showWrite?: boolean; sort?: string; sortOptions?: readonly { label: string; value: string }[]; writeLabel?: string; writeTo?: string }) {
  return <SharedBoardToolbar count={count} onSearchChange={onSearchChange} onSortChange={onSortChange} onWrite={onWrite} search={search} searchIcon={communitySearch} showWrite={showWrite} sort={sort} sortIcon={communityChevronDown} sortOptions={sortOptions} writeLabel={writeLabel} writeTo={writeTo} />
}

export function Stars({ tone = 'gold', value }: { tone?: string; value: number }) {
  return (
    <span aria-label={`별점 ${value}점`} className={`review-stars review-stars--${tone}`}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < value
        return <span aria-hidden="true" className={`review-star review-star--${filled ? 'filled' : 'empty'}`} key={index}><img alt="" src={filled ? reviewStarFilled : reviewStarEmpty} /></span>
      })}
    </span>
  )
}

import type { ReactNode } from 'react'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'

export function SectionHeading({ children, description, link, linkLabel = '더보기' }: { children: ReactNode; description?: ReactNode; link?: string; linkLabel?: string }) {
  return (
    <div className="home-section-heading">
      <div><h2>{children}</h2>{description ? <p>{description}</p> : null}</div>
      {link ? <Link onClick={() => window.scrollTo(0, 0)} to={link}>{linkLabel} <span aria-hidden="true">›</span></Link> : null}
    </div>
  )
}


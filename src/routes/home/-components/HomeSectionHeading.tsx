import type { ReactNode } from 'react'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import sectionMoreIcon from '../../../assets/figma/home-section-zoom-in.svg'
import sectionArrowIcon from '../../../assets/figma/scrap-chevron-right.svg'

export function SectionHeading({ children, description, link, linkLabel = '더보기', linkIcon = 'zoom' }: { children: ReactNode; description?: ReactNode; link?: string; linkLabel?: string; linkIcon?: 'zoom' | 'arrow' }) {
  return (
    <div className="home-section-heading">
      <div><h2>{children}</h2>{description ? <p>{description}</p> : null}</div>
      {link ? <Link to={link}>{linkLabel}{linkIcon === 'arrow' ? <span aria-hidden="true" className="home-section-heading__arrow"><img alt="" src={sectionArrowIcon} /></span> : <img alt="" aria-hidden="true" src={sectionMoreIcon} />}</Link> : null}
    </div>
  )
}


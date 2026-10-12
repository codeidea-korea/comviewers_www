import { useNavigate } from 'react-router'
import backIcon from '@/assets/figma/chevron-left.svg'

export function PageBackButton({ fallbackTo, label }: { fallbackTo: string; label: string }) {
  const navigate = useNavigate()

  const goBack = () => {
    const index = (window.history.state as { idx?: number } | null)?.idx
    if (typeof index === 'number' && index > 0) navigate(-1)
    else navigate(fallbackTo)
  }

  return <button aria-label={label} className="mypage-page-back" onClick={goBack} type="button"><img alt="" src={backIcon}/></button>
}

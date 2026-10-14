import { DialogLayer } from '@/components/ui/DialogLayerControl'
import { SearchField } from '@/components/ui/SearchFieldControl'
import closeIcon from '@/assets/figma/inquiry-modal-close.svg'
import { useEffect, useState, type CSSProperties } from 'react'
import './board-search-sheet.css'

export function BoardSearchSheet({ open, value, maxLength, onChange, onSubmit, onClose }: { open: boolean; value: string; maxLength: number; onChange: (value: string) => void; onSubmit: (value: string) => void; onClose: () => void }) {
  const [viewport, setViewport] = useState<{ height: number; bottom: number } | null>(null)
  useEffect(() => {
    if (!open) return
    const visual = window.visualViewport
    const update = () => setViewport({ height: visual?.height ?? window.innerHeight, bottom: visual ? Math.max(0, window.innerHeight - visual.height - visual.offsetTop) : 0 })
    update()
    visual?.addEventListener('resize', update)
    visual?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => { visual?.removeEventListener('resize', update); visual?.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [open])
  const viewportStyle = viewport ? { '--board-search-viewport-height': `${viewport.height}px`, '--board-search-keyboard-offset': `${viewport.bottom}px` } as CSSProperties : undefined
  return <DialogLayer asChild backdropClassName="mobile-bottom-sheet board-search-sheet" isOpen={open} onClose={onClose} showTitle={false} title="검색">
    <section aria-label="검색" aria-modal="true" className="mobile-bottom-sheet__surface" role="dialog" style={viewportStyle} tabIndex={-1}>
      <div className="mobile-bottom-sheet__handle"/><header className="mobile-bottom-sheet__header"><h2>검색</h2><button aria-label="검색 닫기" onClick={onClose} type="button"><img alt="" src={closeIcon}/></button></header>
      <div className="mobile-bottom-sheet__content"><form onSubmit={event => { event.preventDefault(); onSubmit(value); onClose() }}>
        <SearchField autoFocus className="mypage-mobile-search" controlClassName="mypage-mobile-search__control" label="제목 또는 내용 검색" maxLength={maxLength} onChange={event => onChange(event.target.value)} placeholder="제목 또는 내용 검색" value={value}/><button className="mypage-mobile-search__submit" type="submit">조회</button>
      </form></div>
    </section>
  </DialogLayer>
}

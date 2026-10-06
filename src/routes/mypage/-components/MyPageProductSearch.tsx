import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { SearchField } from '@/components/ui/SearchFieldControl'
import searchIcon from '@/assets/figma/mypage-search.svg'
import closeIcon from '@/assets/figma/inquiry-modal-close.svg'
import { resolveExactProductNo } from './productSearchResolver'
import { productNoSearchSchema } from '@/api/productNo'
import { managerScopedPath } from './managerPortalPath'

export function MyPageProductSearch() {
  const { myAccount } = useServices()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [value, setValue] = useState('')
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [composing, setComposing] = useState(false)
  const submitSequence = useRef(0)
  useEffect(() => {
    if (composing) { setKeyword(''); return }
    const normalized = value.trim().toUpperCase()
    const timer = window.setTimeout(() => setKeyword(productNoSearchSchema.safeParse(normalized).success ? normalized : ''), 250)
    return () => window.clearTimeout(timer)
  }, [value, composing])
  const result = useQuery({ queryKey: ['my-account', 'read', 'product-autocomplete', keyword],
    enabled: Boolean(myAccount.rcpcApi && keyword), retry: false,
    queryFn: ({ signal }) => myAccount.rcpcApi!.list({ productNo: keyword, page: 0, size: 10 }, signal) })
  function select(productNo: string) {
    submitSequence.current += 1
    setOpen(false); setValue(productNo); setNotice('')
    void navigate(managerScopedPath(`/mypage/rcpc?productNo=${encodeURIComponent(productNo)}`, pathname))
  }
  async function submit(input: string) {
    const productNo = input.trim().toUpperCase()
    const api = myAccount.rcpcApi
    const sequence = ++submitSequence.current
    if (!api || !productNo) {
      setOpen(false)
      setNotice('일치하는 RCPC가 없습니다.')
      return
    }
    if (!productNoSearchSchema.safeParse(productNo).success) {
      setOpen(false)
      setNotice('품번은 영문과 숫자로 입력해 주세요.')
      return
    }
    setNotice('')
    try {
      const exact = await resolveExactProductNo(productNo, (query, page, size) => api.list({ productNo: query, page, size }))
      if (sequence !== submitSequence.current) return
      if (exact) select(exact)
      else { setOpen(false); setNotice('일치하는 RCPC가 없습니다.') }
    } catch {
      if (sequence === submitSequence.current) { setOpen(false); setNotice('품번을 검색하지 못했습니다.') }
    }
  }
  return <div className="mypage-sidebar__search-area" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} onFocus={() => setOpen(true)}>
    <SearchField className="mypage-sidebar__search" controlClassName="mypage-sidebar__search-row" icon={searchIcon} label="품번 검색" labelClassName="" maxLength={16} placeholder=" " value={value}
      autoCapitalize="characters" autoCorrect="off" spellCheck={false}
      onCompositionStart={() => { submitSequence.current += 1; setComposing(true) }}
      onCompositionEnd={event => { setValue(event.currentTarget.value); setComposing(false) }}
      onChange={event => { submitSequence.current += 1; setValue(event.target.value); setNotice(''); setOpen(true) }}
      onSubmit={input => { void submit(input) }}/>
    {value ? <button aria-label="품번 검색어 지우기" className="mypage-sidebar__search-clear" onClick={() => { submitSequence.current += 1; setValue(''); setKeyword(''); setNotice(''); setOpen(false) }} type="button"><img alt="" src={closeIcon}/></button> : null}
    {open && !composing && keyword && keyword === value.trim().toUpperCase() && myAccount.rcpcApi && <div className="mypage-sidebar__recent" aria-label="품번 검색 결과">
      {result.isPending ? <p role="status">검색 중…</p> : result.isError ? <p role="alert">품번을 검색하지 못했습니다.</p> : result.data?.items.length ? result.data.items.map(item => <button key={item.rentalId} type="button" onClick={() => select(item.productNo)}>{item.productNo}</button>) : <p>일치하는 RCPC가 없습니다.</p>}
    </div>}{notice && <p className="mypage-sidebar__search-notice" role="status">{notice}</p>}
  </div>
}

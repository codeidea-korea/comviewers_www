import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { SearchField } from '@/components/ui/SearchFieldControl'
import searchIcon from '@/assets/figma/mypage-search.svg'
import { resolveExactProductNo } from './productSearchResolver'

export function MyPageProductSearch() {
  const { myAccount } = useServices()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const submitSequence = useRef(0)
  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(value.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [value])
  const result = useQuery({ queryKey: ['my-account', 'http', 'product-autocomplete', keyword],
    enabled: Boolean(myAccount.rcpcApi && keyword), retry: false,
    queryFn: ({ signal }) => myAccount.rcpcApi!.list({ productNo: keyword, page: 0, size: 10 }, signal) })
  function select(productNo: string) {
    submitSequence.current += 1
    setOpen(false); setValue(productNo); setNotice('')
    void navigate(`/mypage/rcpc?productNo=${encodeURIComponent(productNo)}`)
  }
  async function submit(input: string) {
    const productNo = input.trim()
    const api = myAccount.rcpcApi
    const sequence = ++submitSequence.current
    if (!api || !productNo) {
      setOpen(false)
      setNotice('일치하는 RCPC가 없습니다.')
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
    <SearchField className="mypage-sidebar__search" controlClassName="mypage-sidebar__search-row" icon={searchIcon} label="품번 검색" labelClassName="" placeholder=" " value={value}
      onChange={event => { submitSequence.current += 1; setValue(event.target.value.slice(0, 50)); setNotice(''); setOpen(true) }}
      onSubmit={input => { void submit(input) }}/>
    {open && keyword && keyword === value.trim() && myAccount.rcpcApi && <div className="mypage-sidebar__recent" aria-label="품번 검색 결과">
      {result.isPending ? <p role="status">검색 중…</p> : result.isError ? <p role="alert">품번을 검색하지 못했습니다.</p> : result.data?.items.length ? result.data.items.map(item => <button key={item.rentalId} type="button" onClick={() => select(item.productNo)}>{item.productNo}</button>) : <p>일치하는 RCPC가 없습니다.</p>}
    </div>}{notice && <p className="mypage-sidebar__search-notice" role="status">{notice}</p>}
  </div>
}

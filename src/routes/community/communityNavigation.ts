const COMMUNITY_LIST_PATH = '/community/posts'

export function communityListReturnTo(search: string | URLSearchParams) {
  const source = typeof search === 'string' ? new URLSearchParams(search) : search
  const target = new URLSearchParams()
  const keyword = source.get('keyword')?.trim()
  const sort = source.get('sort')

  if (keyword) target.set('keyword', keyword)
  if (sort === 'views' || sort === 'comments') target.set('sort', sort)

  const query = target.toString()
  return `${COMMUNITY_LIST_PATH}${query ? `?${query}` : ''}`
}

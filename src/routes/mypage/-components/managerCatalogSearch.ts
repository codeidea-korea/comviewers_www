export interface ManagerCatalogSearchRow {
  rcpc: string
  alias: string
  managerNames: readonly string[]
}

export function managerCatalogRowMatches(row: ManagerCatalogSearchRow, search: string) {
  const keyword = search.trim().toLocaleLowerCase('ko-KR')
  if (!keyword) return true
  return [row.rcpc, row.alias, ...row.managerNames]
    .some((value) => value.toLocaleLowerCase('ko-KR').includes(keyword))
}

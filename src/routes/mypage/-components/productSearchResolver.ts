export interface ProductNoSearchResult {
  items: ReadonlyArray<{ productNo: string }>
  totalPages: number
}

export async function resolveExactProductNo(
  input: string,
  list: (productNo: string, page: number, size: number) => Promise<ProductNoSearchResult>,
) {
  const productNo = input.trim()
  if (!productNo) return null
  let totalPages = 1
  for (let page = 0; page < totalPages; page += 1) {
    const data = await list(productNo, page, 100)
    const exact = data.items.find(item => item.productNo.toLowerCase() === productNo.toLowerCase())
    if (exact) return exact.productNo
    totalPages = data.totalPages
  }
  return null
}

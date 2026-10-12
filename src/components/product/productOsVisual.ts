import noOsImage from '@/assets/figma/store/product-04.png'
import windows10Image from '@/assets/figma/store/product-03.png'
import windows11Image from '@/assets/figma/store/product-01.png'
import { osFilterLabel } from '@/domain/products/osFilterLabel'

export function productOsVisual(osFilterValue: string | null | undefined, part: boolean) {
  const label = part ? null : osFilterLabel(osFilterValue)
  if (label === 'Windows 10') return { image: windows10Image, label }
  if (label === 'Windows 11') return { image: windows11Image, label }
  return { image: noOsImage, label: null }
}

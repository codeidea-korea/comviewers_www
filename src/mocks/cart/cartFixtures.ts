import image02 from '../../assets/figma/store/product-02.png'
import image03 from '../../assets/figma/store/product-03.png'
import image04 from '../../assets/figma/store/product-04.png'
import { cartSchema } from '../../domain/cart/schemas'

const spec = 'Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores / DDR3 128G / SSD 120GB / NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB) '
const rental = {
  type: 'rental', productId: '89023', label: '품번 89023', location: 'IRC코리아/메가서버실',
  spec, available: true, setupFee: 5000, rentalFee: 32000, quantity: 1, durationUnits: 1, maximumQuantity: 3,
}

// Synthetic publishing examples, isolated from checkout fixtures and live products.
export const cartFixtures = cartSchema.parse([
  { ...rental, id: 'partner', type: 'part', billingUnit: 'unit', durationUnits: null, rowKind: 'partner', label: '파트상품이름', image: image04, setupFee: 0, rentalFee: 120000, maximumQuantity: null },
  { ...rental, id: 'connected', rowKind: 'connected', image: image04 },
  { ...rental, id: 'normal', rowKind: 'normal', image: image02, spec: `${spec}${spec}` },
  { ...rental, id: 'waiting', rowKind: 'waiting', image: image03, available: false },
])

import windowsBackground from '../assets/figma/windows-card-bg.png'
import productImage01 from '../assets/figma/store/product-01.png'
import productImage02 from '../assets/figma/store/product-02.png'
import productImage03 from '../assets/figma/store/product-03.png'
import productImage04 from '../assets/figma/store/product-04.png'
import productImage05 from '../assets/figma/store/product-05.png'
import productImage06 from '../assets/figma/store/product-06.png'
import productImage07 from '../assets/figma/store/product-07.png'
import productImage08 from '../assets/figma/store/product-08.png'
import { mockProducts } from './products'

const variants: readonly (readonly [string, string, string, number])[] = [
  ['DDR3/8G', 'SSD/240G', 'GeForce GTX 1660 (6GB)', 520000],
  ['DDR4/16G', 'NVMe/500G', 'GeForce RTX 3060 (12GB)', 720000],
  ['DDR4/32G', 'NVMe/1TB', 'GeForce RTX 4070 (12GB)', 990000],
]

// The catalog frame intentionally cycles the eight exported Windows artwork
// variants instead of repeating one placeholder image on every product card.
const catalogImages = [
  productImage01,
  productImage02,
  productImage03,
  productImage04,
  productImage05,
  productImage06,
  productImage07,
  productImage08,
  productImage01,
  productImage02,
  productImage03,
  productImage04,
]

const catalogCardStates = [
  { mouseIncluded: true, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: true },
  { mouseIncluded: true, keyboardIncluded: true },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
  { mouseIncluded: false, keyboardIncluded: false },
]

export const commerceProducts = Array.from({ length: 12 }, (_, index) => {
  const base = mockProducts[index % mockProducts.length]
  const variant = variants[index % variants.length]
  return {
    ...base,
    id: 89023 + index,
    productId: 89023 + index,
    ram: variant[0],
    disk: variant[1],
    gpu: variant[2],
    monthlyPrice: variant[3],
    image: catalogImages[index] ?? windowsBackground,
  }
})

const catalogCardBase = {
  ...mockProducts[0],
  id: 89023,
  productId: 89023,
  ram: 'DDR3/6G',
  disk: 'SSD/120G',
  gpu: 'GeForce GTX 1650 (4GB)',
  setupFee: 5000,
  monthlyPrice: 833000,
}

export const catalogCardProducts = catalogImages.map((image, index) => ({
  ...catalogCardBase,
  ...catalogCardStates[index],
  id: `catalog-card-${index + 1}`,
  image,
}))

export const catalogUnavailableCardProducts = catalogCardProducts.slice(0, 4).map((product, index) => ({
  ...product,
  available: false,
  id: `catalog-card-waiting-${index + 1}`,
  productId: 89123 + index,
}))

const catalogListBase = {
  ...catalogCardBase,
  id: 'catalog-list',
  productId: 99999,
  setupFee: 3000,
  ip: '061.07*.0**.***',
}

type CatalogListState = {
  peripherals?: string[]
  serverState?: string
  os?: string
  cpu?: string
  ram?: string
  disk?: string
  gpu?: string
}

const catalogListStates: CatalogListState[] = [
  { peripherals: ['mouse', 'keyboard-disabled'], serverState: 'offline' },
  { peripherals: ['mouse-disabled', 'keyboard'], serverState: 'offline' },
  {
    peripherals: ['mouse', 'keyboard'],
    serverState: 'online',
    os: `${catalogListBase.os} ${catalogListBase.os}`,
    cpu: `${catalogListBase.cpu} ${catalogListBase.cpu}`,
    ram: 'DDR3/12G',
    disk: 'SSD/36G',
    gpu: 'GeForce GTX 1650 (12GB)',
  },
  { peripherals: ['mouse-disabled', 'keyboard-disabled'], serverState: 'online' },
  { peripherals: ['mouse', 'keyboard-disabled'], serverState: 'online' },
  { peripherals: ['mouse-disabled', 'keyboard-disabled'], serverState: 'online' },
  { peripherals: ['mouse-disabled', 'keyboard'], serverState: 'online' },
]

export const catalogListProducts = Array.from({ length: 20 }, (_, index) => ({
  ...catalogListBase,
  peripherals: ['mouse-disabled', 'keyboard-disabled'],
  serverState: 'online',
  ...catalogListStates[index],
  id: `catalog-list-${index + 1}`,
}))

export const catalogUnavailableListProducts = catalogListProducts.slice(0, 4).map((product, index) => ({
  ...product,
  available: false,
  id: `catalog-list-waiting-${index + 1}`,
  productId: 89901 + index,
  serverState: 'offline',
}))

export const cartFixtures = [
  { id: 'partner', label: '파트상품이름', price: 120000, setupFee: 0, rentalFee: 120000, product: { ...commerceProducts[0], image: productImage04 }, tone: 'blue' },
  { id: 'connected', label: '품번 89023', price: 37000, setupFee: 5000, rentalFee: 32000, product: { ...commerceProducts[1], image: productImage04 }, tone: 'blue' },
  { id: 'normal', label: '품번 89023', price: 37000, setupFee: 5000, rentalFee: 32000, product: { ...commerceProducts[2], image: productImage02 }, tone: 'green' },
  { id: 'waiting', label: '품번 89023', price: 37000, setupFee: 5000, rentalFee: 32000, product: { ...commerceProducts[3], image: productImage03 }, tone: 'orange' },
]

export const checkoutOrderItems = [
  { ...cartFixtures[1], quantity: 1, displayTermDuration: '1일' },
  { ...cartFixtures[0], quantity: 1, displayAmount: 37000 },
  { ...cartFixtures[2], quantity: 1, product: { ...cartFixtures[2].product, image: cartFixtures[1].product.image }, displayTermDuration: '1일' },
]

export const checkoutSourceSummary = {
  rentalTotal: 77000,
  rentalSetupTotal: 5000,
  rentalMonthlyTotal: 72000,
  partTotal: 123000,
  expectedTotal: 200000,
  pointTotal: 720,
}

export const checkoutFixture = {
  name: '김컴뷰',
  emailId: 'user123',
  emailDomain: 'gmail.com',
  phone: ['010', '1234', '5678'],
  messenger: 'Nimbuzz 닉네즈',
  coupon: '오픈 이벤트 쿠폰 (15% 쿠폰)',
  points: '50',
}

export const orderFixture = {
  orderNumber: '20260707123456789',
  orderedAt: '2026-07-01 17:12:13',
  amount: '34,000원',
  depositor: '김컴뷰',
  account: '1234-5678-1234',
  dueAt: '2026-07-01 17:42:13',
}

export const formatWon = (value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`

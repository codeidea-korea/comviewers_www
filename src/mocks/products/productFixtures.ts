import { productSchema } from '../../domain/products/schemas'
import type { DetailSelections } from '../../domain/products/types'
import image01 from '../../assets/figma/store/product-01.png'
import image02 from '../../assets/figma/store/product-02.png'
import image03 from '../../assets/figma/store/product-03.png'
import image04 from '../../assets/figma/store/product-04.png'
import image05 from '../../assets/figma/store/product-05.png'
import image06 from '../../assets/figma/store/product-06.png'
import image07 from '../../assets/figma/store/product-07.png'
import image08 from '../../assets/figma/store/product-08.png'

const productImages = [image01, image02, image03, image04, image05, image06, image07, image08, image01, image02, image03, image04]

// Explicit synthetic metadata; never infer filter semantics from display strings.
const profiles = [
  { os: '10', cpu: 'AMD Ryzen 3 2200G', cpuType: 'AMD Ryzen', clock: '3.5G', cores: '4C', ramSpec: 'DDR4', ramSize: '8G', diskSize: '240G', gpu: 'GTX', gpuMemory: 'GT 4G', gpuLabel: 'GeForce GTX 1650 (4GB)', price: 60000 },
  { os: '11', cpu: 'Intel Core i7-12700', cpuType: 'Intel Core', clock: '2.0G', cores: '12C', ramSpec: 'DDR4', ramSize: '32G', diskSize: '1T', gpu: 'RTX', gpuMemory: 'GT 12G', gpuLabel: 'GeForce RTX 4070 (12GB)', price: 130000 },
  { os: '11', cpu: 'AMD Ryzen 9 7900', cpuType: 'AMD Ryzen', clock: '3.5G', cores: '12C', ramSpec: 'DDR5', ramSize: '64G', diskSize: '2T', gpu: 'RTX', gpuMemory: 'GT 12G', gpuLabel: 'GeForce RTX 4070 (12GB)', price: 220000 },
] as const
const rooms = ['IRC코리아/메가서버실', '컴픽/한빛', '델리즈/칠곡서버실', '서광모드/B소프트서버실']
const lines = ['KT 일반/공용', 'KT 일반/단독', 'LG U+ 일반/공용', 'SK브로드밴드 공용']
const purposes = ['게임용', '사무용', '개발·연구용', '그래픽·렌더링용', '방송·스트리밍용']
const ipTypes = ['1컴 1공인 IP', '2컴 1공인 IP', '고정 IP', '유동 IP']
const games = ['엔씨소프트', '넥슨', '넷마블', '카카오게임즈']

export const fixtures = Array.from({ length: 24 }, (_, index) => {
  const profile = profiles[index % profiles.length]!
  const image = productImages[index % productImages.length]
  const mouseIncluded = index % 2 === 0
  const keyboardIncluded = index % 3 === 0
  const product = productSchema.parse({
    image, country: 'Korea', ip: '061.07*.0*.***', setupFee: 5000, id: `mock-product-${index + 1}`, productId: String(89023 + index), billingUnit: 'thirty_day', pointRate: 1, minRentalUnits: 1, maxRentalUnits: 3,
    os: `Microsoft Windows ${profile.os} Pro (64Bit)`, cpu: profile.cpu,
    ram: `${profile.ramSpec}/${profile.ramSize}`, disk: `SSD/${profile.diskSize}`, gpu: profile.gpuLabel,
    monthlyPrice: profile.price, available: index < 20, serverState: index % 5 === 0 ? 'offline' : 'online',
    serverRoom: rooms[index % rooms.length],
    mouseIncluded, keyboardIncluded,
    peripherals: [...(mouseIncluded ? ['mouse'] : []), ...(keyboardIncluded ? ['keyboard'] : [])],
  })
  const details: DetailSelections = {
    os: [profile.os], 'cpu-type': [profile.cpuType], 'cpu-clock': [profile.clock], 'cpu-core': [profile.cores],
    'ram-spec': [profile.ramSpec], 'ram-size': [profile.ramSize], 'disk-type': ['SSD'], 'disk-size': [profile.diskSize],
    'gpu-type': [profile.gpu], 'gpu-memory': [profile.gpuMemory],
    peripheral: [...(mouseIncluded ? ['마우스'] : []), ...(keyboardIncluded ? ['키보드'] : [])], game: [games[index % games.length]!],
  }
  return { product, details, room: rooms[index % rooms.length], line: lines[index % lines.length], ip: ipTypes[index % ipTypes.length], purpose: purposes[index % purposes.length] }
})

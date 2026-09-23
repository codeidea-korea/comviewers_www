import type { CatalogDetail, CatalogListItem } from '@/api/catalog'
import { productSchema } from './schemas'
import type { Product } from './types'

function deviceState(value: string | null): boolean | null {
  return value === 'connected' ? true : value === 'disconnected' ? false : null
}

export function mapCatalogProduct(dto: CatalogListItem | CatalogDetail): Product {
  const spec = dto.spec
  const mouse = deviceState(dto.inputDeviceStatus.mouseConnectionStatus)
  const keyboard = deviceState(dto.inputDeviceStatus.keyboardConnectionStatus)
  const disks = [spec?.ssdGb == null ? null : `SSD/${spec.ssdGb}GB`, spec?.hddGb == null ? null : `HDD/${spec.hddGb}GB`].filter((value) => value !== null)
  return productSchema.parse({
    id: dto.productNo, productId: dto.productNo,
    image: 'images' in dto ? (dto.images.find((image) => image.primary)?.url ?? dto.images[0]?.url ?? null) : dto.primaryImageUrl,
    title: dto.title, description: 'description' in dto ? dto.description : null,
    detailRichContent: 'detailRichContent' in dto ? dto.detailRichContent ?? null : null,
    detailInformation: 'detailInformation' in dto ? dto.detailInformation ?? null : null,
    os: spec?.osName ?? null, cpu: spec?.cpuModel ?? null,
    ram: spec?.ramGb == null ? spec?.ramType ?? null : [spec.ramType, `${spec.ramGb}GB`].filter(Boolean).join('/'),
    disk: disks.length ? disks.join(', ') : null, gpu: spec?.gpuModel ?? null,
    country: null, ip: spec?.maskedIp ?? null, serverRoom: dto.serverRoom.name, serverRoomProvider: dto.serverRoom.providerName,
    setupFee: dto.pricing.setupFee, monthlyPrice: dto.pricing.billingUnit === 'thirty_day' ? dto.pricing.monthlyPrice : null,
    unitPrice: dto.pricing.unitPrice,
    pricingType: dto.pricing.pricingType,
    minPurchaseQuantity: 'minUnits' in dto && dto.pricing.pricingType === 'one_time' ? dto.minUnits : null,
    maxPurchaseQuantity: 'maxUnits' in dto && dto.pricing.pricingType === 'one_time' ? dto.maxUnits : null,
    billingUnit: dto.pricing.billingUnit, available: 'instantAvailable' in dto ? dto.instantAvailable ?? null : null, saleAvailability: dto.availability,
    pointRate: dto.pricing.pointRate,
    minRentalUnits: 'minUnits' in dto && ['hour', 'day', 'thirty_day'].includes(dto.pricing.billingUnit) ? dto.minUnits : null,
    maxRentalUnits: 'maxUnits' in dto && ['hour', 'day', 'thirty_day'].includes(dto.pricing.billingUnit) ? dto.maxUnits : null,
    serverState: 'connectionStatus' in dto && dto.connectionStatus === 'ONLINE' ? 'online' : 'connectionStatus' in dto && dto.connectionStatus === 'OFFLINE' ? 'offline' : null, mouseIncluded: mouse, keyboardIncluded: keyboard,
    peripherals: mouse === null || keyboard === null ? null : [...(mouse ? ['mouse'] : []), ...(keyboard ? ['keyboard'] : [])],
    refundPolicy: 'refundPolicy' in dto ? dto.refundPolicy : null,
  })
}

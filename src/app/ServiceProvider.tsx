import type { LegalRepository } from '@/domain/legal/legalRepository'
import type { ColocationDraftRepository } from '@/domain/colocation/draftRepository'
import type { ReviewRepository } from '@/domain/reviews/reviewRepository'
import { createContext, useContext, type ReactNode } from 'react'
import type { ProductRepository } from '@/domain/products/productRepository'
import type { CartRepository } from '@/domain/cart/cartRepository'
import type { CheckoutRepository } from '@/domain/checkout/checkoutRepository'
import type { MyAccountServices } from '@/domain/myAccount/services'
import type { StorefrontServices } from '@/domain/storefront/services'

export interface Services {
  readonly legal: LegalRepository
  readonly colocationDraft: ColocationDraftRepository
  readonly reviews: ReviewRepository
  readonly products: ProductRepository
  readonly cart: CartRepository
  readonly checkout: CheckoutRepository
  readonly myAccount: MyAccountServices
  readonly storefront: StorefrontServices
}

const ServiceContext = createContext<Services | null>(null)

export function ServiceProvider({ children, services }: { children: ReactNode; services: Services }) {
  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>
}
export function useServices(): Services {
  const services = useContext(ServiceContext)
  if (!services) throw new Error('ServiceProvider is required')
  return services
}


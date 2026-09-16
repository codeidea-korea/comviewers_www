import type { LegalRepository } from '@/domain/legal/legalRepository'
import { createMockLegalRepository } from '@/mocks/legalRepository'
import type { ColocationDraftRepository } from '@/domain/colocation/draftRepository'
import { createMockColocationDraftRepository } from '@/mocks/colocationDraftRepository'
import type { ReviewRepository } from '@/domain/reviews/reviewRepository'
import { createMockReviewRepository } from '@/mocks/reviewRepository'
import { createContext, useContext, type ReactNode } from 'react'
import type { ProductRepository } from '@/domain/products/productRepository'
import { createMockProductRepository } from '@/mocks/productRepository'
import type { CartRepository } from '@/domain/cart/cartRepository'
import { createMockCartRepository } from '@/mocks/cartRepository'
import type { CheckoutRepository } from '@/domain/checkout/checkoutRepository'
import { createMockCheckoutRepository } from '@/mocks/checkoutRepository'
import type { MyAccountServices } from '@/domain/myAccount/services'
import { createMyAccountServices } from '@/mocks/myAccount/createServices'
import type { StorefrontServices } from '@/domain/storefront/services'
import { createStorefrontServices } from '@/mocks/storefront/createServices'

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

// Test-only service graph. The application runtime injects the API service factory.
export function createMockServices(): Services {
  const products = createMockProductRepository()
  const cart = createMockCartRepository(products)
  return { legal: createMockLegalRepository(), colocationDraft: createMockColocationDraftRepository(), reviews: createMockReviewRepository(), products, cart, checkout: createMockCheckoutRepository(cart),
    myAccount: createMyAccountServices(), storefront: createStorefrontServices() }
}
export function ServiceProvider({ children, services }: { children: ReactNode; services: Services }) {
  return <ServiceContext.Provider value={services}>{children}</ServiceContext.Provider>
}
export function useServices(): Services {
  const services = useContext(ServiceContext)
  if (!services) throw new Error('ServiceProvider is required')
  return services
}


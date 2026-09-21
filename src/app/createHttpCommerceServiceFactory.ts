import { createApiClient } from '@/api/httpClient'
import { createCatalogApi } from '@/api/catalog'
import { createCartApi } from '@/api/cart'
import type { CartRepository } from '@/domain/cart/cartRepository'
import type { CheckoutRepository } from '@/domain/checkout/checkoutRepository'
import { createHttpProductRepository } from '@/domain/products/httpProductRepository'
import { createHttpCartRepository } from '@/domain/cart/httpCartRepository'
import { createHttpCheckoutRepository } from '@/domain/checkout/httpCheckoutRepository'
import type { ServiceFactory, ServiceScope } from './AppProviders'
import type { Services } from './ServiceProvider'

interface CommerceFactoryOptions {
  readonly baseUrl: string
  // Other domains are injected explicitly into the API-backed runtime graph.
  readonly createOtherServices: (scope: ServiceScope) => Pick<Services, 'myAccount' | 'storefront' | 'reviews' | 'colocationDraft' | 'legal'>
}

function unavailableCommerce(message: string): Pick<Services, 'cart' | 'checkout'> {
  const reject = async (): Promise<never> => { throw new Error(message) }
  const cart: CartRepository = { list: reject, count: reject, add: reject, remove: reject, changeQuantity: reject }
  const checkout: CheckoutRepository = { quote: reject }
  return { cart, checkout }
}

/** Creates the API-backed service graph used by the application runtime. */
export function createHttpCommerceServiceFactory(options: CommerceFactoryOptions): ServiceFactory {
  return (scope) => {
    const client = createApiClient({ baseUrl: options.baseUrl, getAccessToken: scope.getAccessToken, onAuthenticationFailure: scope.logout })
    const products = createHttpProductRepository(client)
    const other = options.createOtherServices(scope)
    const session = scope.session
    if (session.status !== 'authenticated' || !scope.getAccessToken()) {
      return { ...other, products, ...unavailableCommerce('로그인이 필요합니다.') }
    }
    if (!session.organizationId) {
      return { ...other, products, ...unavailableCommerce('이용할 조직을 선택해 주세요.') }
    }
    if (session.capabilityStatus !== 'ready' || !session.customerSession) {
      return { ...other, products, ...unavailableCommerce('이용 권한을 확인할 수 없습니다.') }
    }
    if (!session.customerSession.commerceAvailable) {
      return { ...other, products, ...unavailableCommerce('대표 관리자만 장바구니와 주문서를 이용할 수 있습니다.') }
    }
    const api = createCartApi(client, session.organizationId)
    const cart = createHttpCartRepository(api, createCatalogApi(client))
    return { ...other, products, cart, checkout: createHttpCheckoutRepository(api, cart, client, session.organizationId) }
  }
}

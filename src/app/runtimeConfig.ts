import { createAuthAdapter } from '@/api/auth'
import { createApiClient } from '@/api/httpClient'
import { createCustomerProfileMutations } from '@/api/customerProfileMutations'
import { createCustomerRcpcMutations } from '@/api/customerRcpcMutations'
import { createHttpMyAccountServices } from '@/domain/myAccount/httpServices'
import { createHttpInquiryServices, createHttpMyRcpcServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { createHttpReviewRepository } from '@/domain/reviews/httpReviewRepository'
import { createHttpStorefrontServices } from '@/domain/storefront/httpStorefrontServices'
import { createCManagersApi } from '@/api/cManagers'
import { createHttpColocationDraftRepository } from '@/domain/colocation/httpColocationDraftRepository'
import { createHttpLegalRepository } from '@/domain/legal/httpLegalRepository'
import { createHttpCommerceServiceFactory } from './createHttpCommerceServiceFactory'
import type { AppProvidersProps } from './AppProviders'
import { createHttpManagerServices } from '@/domain/myAccount/httpManagerServices'
import { createCustomerWithdrawalApi } from '@/api/customerWithdrawal'
import type { MyAccountServices } from '@/domain/myAccount/services'

type RuntimeConfiguration = Pick<AppProvidersProps, 'authAdapter' | 'createServices'>

/** The service runtime is API-only. An omitted URL uses the current origin. */
export function createRuntimeConfiguration(baseUrl: string | undefined): RuntimeConfiguration {
  const apiBaseUrl = baseUrl === undefined || baseUrl === '' ? '/' : baseUrl
  return {
    authAdapter: createAuthAdapter(apiBaseUrl),
    createServices: createHttpCommerceServiceFactory({
      baseUrl: apiBaseUrl,
      createOtherServices: (scope) => {
        const session = scope.session
        const organizationId = session.status === 'authenticated' ? session.organizationId : null
        const client = createApiClient({ baseUrl: apiBaseUrl, getAccessToken: scope.getAccessToken, onAuthenticationFailure: scope.logout })
        const myAccount: MyAccountServices = organizationId && session.status === 'authenticated' && session.capabilityStatus === 'ready'
          ? (() => {
            const readApi = createHttpMyAccountServices(client, organizationId)
            const rcpcApi = createHttpMyRcpcServices(client, organizationId)
            const inquiryApi = createHttpInquiryServices(client, organizationId)
            const rcpcMutations = createCustomerRcpcMutations(client, organizationId)
            const managerApi = session.customerSession?.cManagerManagementAvailable ? createCManagersApi(client, organizationId) : undefined
            return { managers: managerApi ? createHttpManagerServices(managerApi, rcpcApi) : undefined,
              readApi, rcpcApi, inquiryApi, profileMutations: createCustomerProfileMutations(client), rcpcMutations, managerApi,
              withdrawalApi: createCustomerWithdrawalApi(client) }
          })()
          : {}
        const authenticated = session.status === 'authenticated' && Boolean(scope.getAccessToken())
        const commerceAvailable = authenticated && session.status === 'authenticated' && session.capabilityStatus === 'ready'
          && session.customerSession?.commerceAvailable === true
        const reviews = createHttpReviewRepository(client, { authenticated,
          customerOrganizationId: commerceAvailable ? organizationId : null, writeAvailable: commerceAvailable })
        return { myAccount, storefront: createHttpStorefrontServices(client, authenticated, apiBaseUrl), reviews,
          colocationDraft: createHttpColocationDraftRepository(client, authenticated), legal: createHttpLegalRepository(client) }
      },
    }),
  }
}


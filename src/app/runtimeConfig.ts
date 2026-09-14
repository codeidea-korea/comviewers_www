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
import { createLiveMyAccountReader } from '@/domain/myAccount/liveSnapshot'
import { createCustomerWithdrawalApi } from '@/api/customerWithdrawal'
import type { MyAccountServices } from '@/domain/myAccount/services'

type RuntimeConfiguration = Pick<AppProvidersProps, 'accessMode' | 'authAdapter' | 'createServices'>

function createUnavailableMyAccountServices(): MyAccountServices {
  const unavailable = async (): Promise<never> => { throw new Error('이 기능은 실제 API 연결과 이용 권한 확인이 필요합니다.') }
  return {
    read: unavailable,
    removeStorage: unavailable,
    changeStorageQuantity: unavailable,
    addFavoriteGroup: unavailable,
    moveFavorites: unavailable,
    getProfileDraft: unavailable,
    saveProfileDraft: unavailable,
    listInquiryDrafts: unavailable,
    saveInquiryDraft: unavailable,
    isManagerLoginAvailable: unavailable,
    saveManager: unavailable,
    assignManager: unavailable,
    deleteManager: unavailable,
  }
}

/** A missing URL preserves the local preview. Supplying a URL explicitly enables live commerce and login. */
export function createRuntimeConfiguration(baseUrl: string | undefined): RuntimeConfiguration {
  if (baseUrl === undefined || baseUrl === '') return { accessMode: 'preview' }
  return {
    accessMode: 'enforced',
    authAdapter: createAuthAdapter(baseUrl),
    createServices: createHttpCommerceServiceFactory({
      baseUrl,
      createOtherServices: (scope) => {
        const unavailableAccount = createUnavailableMyAccountServices()
        const session = scope.session
        const organizationId = session.status === 'authenticated' ? session.organizationId : null
        const client = createApiClient({ baseUrl, getAccessToken: scope.getAccessToken, onAuthenticationFailure: scope.logout })
        const myAccount = organizationId && session.status === 'authenticated' && session.capabilityStatus === 'ready'
          ? (() => {
            const readApi = createHttpMyAccountServices(client, organizationId)
            const rcpcApi = createHttpMyRcpcServices(client, organizationId)
            const inquiryApi = createHttpInquiryServices(client, organizationId)
            const rcpcMutations = createCustomerRcpcMutations(client, organizationId)
            const managerApi = session.customerSession?.cManagerManagementAvailable ? createCManagersApi(client, organizationId) : undefined
            const managerServices = managerApi ? {
              isManagerLoginAvailable: async (loginId: string) => (await managerApi.availability(loginId)).available,
              saveManager: async ({ id, draft }: Parameters<MyAccountServices['saveManager']>[0]) => {
                if (id) {
                  await managerApi.update(Number(id), { name: draft.name, password: draft.password || null, managementMemo: draft.memo })
                  return
                }
                if (!draft.password) throw new Error('비밀번호를 입력해 주세요.')
                await managerApi.create({ name: draft.name, username: draft.loginId, password: draft.password, managementMemo: draft.memo })
              },
              assignManager: async ({ managerId, rcpcIds }: Parameters<MyAccountServices['assignManager']>[0]) => {
                await managerApi.assignRcpcs(rcpcIds.map(Number), managerId ? Number(managerId) : null)
              },
              deleteManager: async (id: string) => { await managerApi.deactivate(Number(id)) },
            } : {}
            return { ...unavailableAccount, ...managerServices, read: createLiveMyAccountReader({ readApi, rcpcApi, inquiryApi, rcpcMutations, managerApi }),
              readApi, rcpcApi, inquiryApi, profileMutations: createCustomerProfileMutations(client), rcpcMutations, managerApi,
              withdrawalApi: createCustomerWithdrawalApi(client) }
          })()
          : unavailableAccount
        const authenticated = session.status === 'authenticated' && Boolean(scope.getAccessToken())
        const commerceAvailable = authenticated && session.status === 'authenticated' && session.capabilityStatus === 'ready'
          && session.customerSession?.commerceAvailable === true
        const reviews = createHttpReviewRepository(client, { authenticated,
          customerOrganizationId: commerceAvailable ? organizationId : null, writeAvailable: commerceAvailable })
        return { myAccount, storefront: createHttpStorefrontServices(client, authenticated, baseUrl), reviews,
          colocationDraft: createHttpColocationDraftRepository(client, authenticated), legal: createHttpLegalRepository(client) }
      },
    }),
  }
}


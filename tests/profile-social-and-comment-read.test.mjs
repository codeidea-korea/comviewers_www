import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { after } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

import { createCommunityApi } from '../src/api/community.ts'
import { createApiClient } from '../src/api/httpClient.ts'
import { customerProfilePatchSchema } from '../src/api/customerProfileMutations.ts'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ root: projectRoot, logLevel: 'error', server: { middlewareMode: true, hmr: false } })
after(() => server.close())
const { profileResponseSchema } = await server.ssrLoadModule('/src/api/myAccountSchemas.ts')
const { getProfileFieldErrors } = await server.ssrLoadModule('/src/routes/mypage/-components/profile/profileEditorModel.ts')

test('U49 social-only profile response selects the password-reset notice branch', () => {
  const profile = profileResponseSchema.parse({
    username: 'social_generated_id',
    socialLoginOnly: true,
    name: '소셜회원',
    nickname: '소셜회원',
    nicknameChangedAt: null,
    nicknameChangeAvailableAt: null,
    phone: null,
    messengerType: null,
    messengerId: null,
    email: 'social@example.test',
    marketingEmailAgreed: false,
    marketingEmailConsentChangedAt: null,
    updatedAt: null,
    profileImageAttachmentId: null,
  })
  const view = readFileSync(`${projectRoot}src/routes/mypage/-components/profile/ProfilePageContent.tsx`, 'utf8')

  assert.equal(profile.socialLoginOnly, true)
  assert.match(view, /profile\.socialLoginOnly/)
  assert.match(view, /소셜 로그인으로 가입한 계정은 현재 비밀번호가 설정되어 있지 않습니다\./)
  assert.match(view, /navigate\('\/account\/find-password'\)/)
})

test('U55 comment refresh uses the comment resource and does not reopen post detail', async () => {
  const requests = []
  const client = createApiClient({
    baseUrl: 'https://api.example.test',
    fetch: async (url) => {
      requests.push(String(url))
      return new Response(JSON.stringify({
        code: 'S000',
        message: 'success',
        data: [{
          id: 91,
          parentCommentId: null,
          author: '댓글작성자',
          authorProfileImageUrl: null,
          mine: false,
          content: '공개 댓글',
          status: 'published',
          createdAt: '2026-09-13T10:00:00',
          updatedAt: '2026-09-13T10:00:00',
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    },
  })
  const api = createCommunityApi(client, false)

  const comments = await api.comments(77)

  assert.equal(comments.length, 1)
  assert.deepEqual(requests, ['https://api.example.test/api/v1/community/posts/77/comments'])
  const service = readFileSync(`${projectRoot}src/domain/storefront/httpStorefrontServices.ts`, 'utf8')
  assert.match(service, /return \(await api\.comments\(id\)\)\.map\(toComment\)/)
})

test('U50 profile phone and messenger boundaries match the signup rules', () => {
  assert.equal(customerProfilePatchSchema.safeParse({ phone: '' }).success, true)
  assert.equal(customerProfilePatchSchema.safeParse({ phone: '010-1234-5678' }).success, true)
  assert.equal(customerProfilePatchSchema.safeParse({ phone: '010-1234-' }).success, false)

  const fields = {
    name: '테스트', nickname: '테스트', emailLocal: 'owner', emailDomain: 'example.com',
    phonePrefix: '010', phoneMiddle: '1234', phoneLast: '', messengerType: 'kakao', messengerId: '',
    marketingEmailAgreed: false, newPassword: '', newPasswordConfirm: '',
  }
  const errors = getProfileFieldErrors(fields, '')
  assert.equal(errors.phone, '휴대폰 번호를 모두 입력해 주세요.')
  assert.equal(errors.messenger, '메신저 종류와 아이디를 함께 입력해 주세요.')
  const complete = getProfileFieldErrors({ ...fields, phoneLast: '5678', messengerId: 'owner' }, '')
  assert.equal(complete.phone, '')
  assert.equal(complete.messenger, '')
})

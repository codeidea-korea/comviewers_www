import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createCommunityApi } from '../src/api/community.ts'
import { createApiClient } from '../src/api/httpClient.ts'
import { customerProfilePatchSchema } from '../src/api/customerProfileMutations.ts'
import { profileResponseSchema } from '../src/api/myAccountSchemas.ts'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

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
  const view = readFileSync(`${projectRoot}src/routes/mypage/-components/http/HttpAccountPages.tsx`, 'utf8')

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

  const view = readFileSync(`${projectRoot}src/routes/mypage/-components/http/HttpAccountPages.tsx`, 'utf8')
  assert.match(view, /Boolean\(phoneMiddle\) !== Boolean\(phoneLast\)/)
  assert.match(view, /메신저 종류와 아이디를 함께 입력해 주세요\./)
})

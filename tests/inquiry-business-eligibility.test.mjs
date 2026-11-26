import assert from 'node:assert/strict'
import test from 'node:test'
import { withSourceModules } from './helpers/withSourceModules.mjs'

const cases = [
  ['same business permits different server rooms', [{ serverRoomId: 1, serverRoomBusinessKey: 'business-a' }, { serverRoomId: 2, serverRoomBusinessKey: 'business-a' }], true],
  ['same room cannot permit different businesses', [{ serverRoomId: 1, serverRoomBusinessKey: 'business-a' }, { serverRoomId: 1, serverRoomBusinessKey: 'business-b' }], false],
  // ADR 0020 (2026-10-14): one verified server room permits missing business keys.
  ['same room permits a missing business key', [{ serverRoomId: 1, serverRoomBusinessKey: 'business-a' }, { serverRoomId: 1, serverRoomBusinessKey: null }], true],
  ['same room permits missing business keys', [{ serverRoomId: 1 }, { serverRoomId: 1 }], true],
  ['different rooms with a missing business key are blocked', [{ serverRoomId: 1, serverRoomBusinessKey: 'business-a' }, { serverRoomId: 2 }], false],
  ['missing room and business keys are blocked', [{ serverRoomId: null }, { serverRoomId: null }], false],
  ['invalid room IDs cannot substitute for business keys', [{ serverRoomId: 0 }, { serverRoomId: 0 }], false],
  ['no target remains permitted', [], true],
  ['one target does not require a business comparison', [{ serverRoomId: null, serverRoomBusinessKey: null }], true],
]
for (const [label, targets, expected] of cases) {
  test(`inquiry bulk eligibility: ${label}`, async () => withSourceModules(async load => {
    const { hasSameInquiryServerRoom } = await load('/src/routes/mypage/-components/inquiryServerRoomScope.ts')
    const before = structuredClone(targets)
    assert.equal(hasSameInquiryServerRoom(targets), expected)
    assert.deepEqual(targets, before)
  }))
}

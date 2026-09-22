import assert from 'node:assert/strict'
import test from 'node:test'
import { productNoCodeSchema, productNoResponseSchema, productNoPathSchema, productNoSearchSchema } from '../src/api/productNo.ts'

test('new asset codes remain strings across response and route boundaries', () => {
  for (const code of ['01ABCDEFGH', '0000000000', '9XYZ234567']) {
    assert.equal(productNoResponseSchema.parse(code), code)
    assert.equal(productNoPathSchema.parse(` ${code.toLowerCase()} `), code)
  }
})

test('legacy numeric responses normalize to strings without allowing unsafe numbers', () => {
  assert.equal(productNoResponseSchema.parse(80001), '80001')
  assert.equal(productNoResponseSchema.parse('80001'), '80001')
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '9007199254740992']) {
    assert.equal(productNoResponseSchema.safeParse(value).success, false)
  }
})

test('full codes reject ambiguous letters and malformed values; search permits partial codes', () => {
  for (const value of ['01ABCDEFGI', '01ABCDEFGO', '01ABCDEFGU', '01ABC-DEFH', 'ABC', '00']) {
    assert.equal(productNoCodeSchema.safeParse(value).success, false)
  }
  assert.equal(productNoSearchSchema.parse(' ab3 '), 'AB3')
  assert.equal(productNoSearchSchema.safeParse('AB-3').success, false)
})

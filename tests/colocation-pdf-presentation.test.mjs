import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  assignColocationEvidenceTypes,
  colocationSubmissionErrorMessage,
  hasRequiredColocationEvidenceTypes,
} from '../src/routes/company/-components/colocationInput.ts'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

test('입점 증빙은 파일명과 무관하게 첫 파일을 사업자등록증, 둘째를 통장사본으로 배정한다', () => {
  assert.deepEqual(
    assignColocationEvidenceTypes(['사업자등록증.pdf', '통장 사본.png']),
    ['business_license', 'bankbook'],
  )
  assert.deepEqual(
    assignColocationEvidenceTypes(['bankbook.png', 'business-license.pdf']),
    ['business_license', 'bankbook'],
  )
  const ambiguous = assignColocationEvidenceTypes(['first.pdf', 'second.png', 'appendix.jpg'])
  assert.deepEqual(ambiguous, ['business_license', 'bankbook', 'other'])
  assert.equal(hasRequiredColocationEvidenceTypes(ambiguous), true)
  assert.equal(
    hasRequiredColocationEvidenceTypes(assignColocationEvidenceTypes(['사업자등록증-1.pdf', '사업자등록증-2.pdf'])),
    true,
  )
  assert.equal(
    hasRequiredColocationEvidenceTypes(assignColocationEvidenceTypes(['사업자등록증.pdf', '통장사본.png'])),
    true,
  )
})

test('중복 신청 오류는 PDF 문구로 표시하고 다른 오류는 보존한다', () => {
  assert.equal(
    colocationSubmissionErrorMessage(
      new Error('동일 사업자번호로 신청·검토 중이거나 승인된 입점 내역이 있습니다.'),
      true,
    ),
    '검토 중인 입점 신청 내역이 있습니다.',
  )
  assert.equal(colocationSubmissionErrorMessage(new Error('서버 오류'), true), '서버 오류')
  assert.equal(colocationSubmissionErrorMessage(null, true), '입점 신청을 제출하지 못했습니다.')
})

test('입점 신청 화면은 U58 PDF 문구를 유지하고 추론 UI를 노출하지 않는다', () => {
  const view = readFileSync(`${projectRoot}src/routes/company/ColocationApplyPageView.tsx`, 'utf8')
  const hook = readFileSync(`${projectRoot}src/routes/company/-components/hooks/useColocationForm.ts`, 'utf8')

  assert.match(view, /placeholder="사업자등록증에 기재된 상호명"/)
  assert.match(view, /placeholder="000-00-00000"/)
  assert.match(view, /파일당 최대 10MB/)
  assert.doesNotMatch(view, /증빙 종류|기타 증빙|시행일/)
  assert.match(view, /\{terms\?\.content \?\? '현재 확인할 수 있는 입점 약관이 없습니다\.'/)
  assert.match(view, /disabled=\{pending \|\| !terms\}/)
  assert.match(
    readFileSync(`${projectRoot}src/routes/company/-components/colocationInput.ts`, 'utf8'),
    /사업자등록번호를 입력해 주세요\.[\s\S]*이메일을 입력해 주세요\.[\s\S]*상담 메신저 정보를 입력해 주세요\./,
  )
  assert.match(
    hook,
    /입점 신청이 접수되었습니다\. 제출하신 정보를 검토한 후 담당자 연락처로 결과를 안내해 드리겠습니다\./,
  )
})

import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { getPublicAccountApi } from '@/api/publicAccount'
import { Button } from '@/components/ui/ButtonControl'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { AuthHeading, AuthPage, AuthPanel, Checkbox } from '../AuthComponentsView'
import { saveSignupAgreements } from './signupDraft'

const termHeadingPattern = /^(제 ?\d+ ?장|제 ?\d+ ?조|제\d+조|부칙$)/
const signupTermLabels: Readonly<Record<string, string>> = {
  service_terms: '서비스 이용약관 동의',
  privacy_policy: '개인정보 수집 및 이용 동의',
  marketing_email_consent: '광고성 정보 수신 동의(이메일)',
}
const optionalMarketingEmailLabel = '[선택] 광고성 정보 수신 동의(이메일)'

function signupTermLabel(policyKey: string, fallback: string) {
  return signupTermLabels[policyKey] ?? fallback
}

function signupTermDisplayLabel(policyKey: string, fallback: string, required: boolean) {
  if (!required && policyKey === 'marketing_email_consent') return optionalMarketingEmailLabel
  return `[${required ? '필수' : '선택'}] ${signupTermLabel(policyKey, fallback)}`
}

function TermsCopy({ content }: { content: string }) {
  return content.split('\n').map((paragraph, index) => (
    <p key={`${paragraph}-${index}`}>{termHeadingPattern.test(paragraph) ? <strong>{paragraph}</strong> : paragraph || '\u00a0'}</p>
  ))
}

export function SignupTermsStep() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const socialSignup = searchParams.get('mode') === 'social'
  const api = getPublicAccountApi()
  const terms = useQuery({
    queryKey: ['public-account', 'signup-terms'],
    queryFn: ({ signal }) => api!.signupTerms(signal),
    enabled: Boolean(api),
  })
  const [ageAccepted, setAgeAccepted] = useState(false)
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const [error, setError] = useState('')
  const section = useRef<HTMLElement>(null)
  const availableTerms = terms.data ?? []
  const requiredAccepted = ageAccepted && availableTerms.length > 0
    && availableTerms.filter((term) => term.required).every((term) => accepted[term.termsPolicyVersionId])
  const allAccepted = requiredAccepted && availableTerms.every((term) => accepted[term.termsPolicyVersionId])

  function toggleAll(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked
    setAgeAccepted(checked)
    setAccepted(Object.fromEntries(availableTerms.map((term) => [term.termsPolicyVersionId, checked])))
  }

  function goToProfile() {
    if (!requiredAccepted) {
      const missing = !ageAccepted ? 'age' : `term-${availableTerms.find(term => term.required && !accepted[term.termsPolicyVersionId])?.termsPolicyVersionId}`
      setError('필수 약관과 연령 확인에 동의해 주세요.')
      const field = section.current?.querySelector<HTMLInputElement>(`input[name="${missing}"]`)
      field?.focus(); field?.scrollIntoView({ block: 'center' })
      return
    }
    setError('')
    saveSignupAgreements(availableTerms.map((term) => ({
      termsPolicyVersionId: term.termsPolicyVersionId,
      agreed: Boolean(accepted[term.termsPolicyVersionId]),
    })))
    window.scrollTo(0, 0)
    navigate(socialSignup ? '/signup/profile?mode=social' : '/signup/profile')
  }

  return (
    <AuthPage variant="terms"><AuthPanel>
      <AuthHeading current={1} title="회원가입" total={2} />
      <section className="terms-section" ref={section}>
        <h2>약관동의</h2>
        {!api ? <p role="status">회원가입 API 설정이 필요합니다.</p> : null}
        {terms.isPending && api ? <LoadingState className="route-loading--compact" label="약관을 불러오는 중입니다." /> : null}
        {terms.isError ? <p role="alert">약관을 불러오지 못했습니다. <button type="button" onClick={() => { void terms.refetch() }}>다시 시도</button></p> : null}
        <Checkbox checked={allAccepted} name="all" onChange={toggleAll}>모든 약관을 확인하고 전체 동의합니다.</Checkbox>
        <div className="terms-list">
          <div className="terms-item">
            <Checkbox checked={ageAccepted} name="age" onChange={(event) => setAgeAccepted(event.target.checked)} required>[필수] 만 14세 이상입니다.</Checkbox>
          </div>
          {availableTerms.map((term) => <div className="terms-item" key={term.termsPolicyVersionId}>
            <Checkbox checked={Boolean(accepted[term.termsPolicyVersionId])} name={`term-${term.termsPolicyVersionId}`}
              onChange={(event) => setAccepted((current) => ({ ...current, [term.termsPolicyVersionId]: event.target.checked }))}
              required={term.required}>{signupTermDisplayLabel(term.policyKey, term.name, term.required)}</Checkbox>
            {term.required ? <div aria-label={`${signupTermLabel(term.policyKey, term.name)} 내용`} className="terms-copy" role="region" tabIndex={0}><TermsCopy content={term.content} /></div> : null}
          </div>)}
        </div>
        <p aria-hidden={!error || requiredAccepted} className={`terms-required-error${error && !requiredAccepted ? '' : ' is-empty'}`} role={error && !requiredAccepted ? 'alert' : undefined}>{error || '\u00a0'}</p>
        <Button disabled={!api || !availableTerms.length || terms.isPending || terms.isError} onClick={goToProfile} size="large">다음</Button>
      </section>
    </AuthPanel></AuthPage>
  )
}

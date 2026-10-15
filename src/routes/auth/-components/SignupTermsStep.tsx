import { useAuthTranslation } from '@/routes/auth/authTranslation'
import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { getPublicAccountApi } from '@/api/publicAccount'
import { Button } from '@/components/ui/ButtonControl'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { AuthHeading, AuthPage, AuthPanel, Checkbox } from '../AuthComponentsView'
import { saveSignupAgreements } from './signupDraft'
import { SignupTermsCopy } from './SignupTermsCopy'

const signupTermLabels: Readonly<Record<string, string>> = {
  service_terms: '서비스 이용약관 동의',
  privacy_policy: '개인정보 수집 및 이용 동의',
  marketing_email_consent: '광고성 정보 수신 동의(이메일)',
}

function signupTermLabel(policyKey: string, fallback: string) {
  return signupTermLabels[policyKey] ?? fallback
}

export function SignupTermsStep() {
  const { authText, t, locale } = useAuthTranslation()
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
  const [showRequiredErrors, setShowRequiredErrors] = useState(false)
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
      setShowRequiredErrors(true)
      const field = section.current?.querySelector<HTMLInputElement>(`input[name="${missing}"]`)
      field?.focus(); field?.scrollIntoView({ block: 'center' })
      return
    }
    setShowRequiredErrors(false)
    saveSignupAgreements(availableTerms.map((term) => ({
      termsPolicyVersionId: term.termsPolicyVersionId,
      agreed: Boolean(accepted[term.termsPolicyVersionId]),
    })))
    const nextPath = socialSignup ? '/signup/profile?mode=social' : '/signup/profile'
    // Remove Google's document-wide translator before any profile inputs mount.
    if (document.getElementById('comviewers-google-translate')?.dataset.active === 'true') {
      document.cookie = 'googtrans=; Max-Age=0; Path=/'
      document.cookie = `googtrans=; Max-Age=0; Path=/; Domain=${window.location.hostname}`
      window.location.assign(nextPath)
      return
    }
    window.scrollTo(0, 0)
    navigate(nextPath)
  }

  return (
    <AuthPage variant="terms" translateContent><AuthPanel>
      <AuthHeading current={1} title={authText("회원가입")} total={2} />
      <section className="terms-section" ref={section}>
        <h2 className="notranslate" translate="no">{authText("약관동의")}</h2>
        {locale !== 'ko' ? <p className="notranslate" translate="no">{t('auth.termsOriginal')}</p> : null}
        {!api ? <p className="notranslate" translate="no" role="status">{authText("회원가입 API 설정이 필요합니다.")}</p> : null}
        {terms.isPending && api ? <LoadingState className="route-loading--compact" label={authText("약관을 불러오는 중입니다.")} /> : null}
        {terms.isError ? <p className="notranslate" translate="no" role="alert">{authText("약관을 불러오지 못했습니다.")}<button type="button" onClick={() => { void terms.refetch() }}>{authText("다시 시도")}</button></p> : null}
        <Checkbox checked={allAccepted} name="all" onChange={toggleAll}>{authText("모든 약관을 확인하고 전체 동의합니다.")}</Checkbox>
        <div className="terms-list">
          <div className="terms-item">
            <Checkbox checked={ageAccepted} name="age" onChange={(event) => setAgeAccepted(event.target.checked)} required>{authText("[필수] 만 14세 이상입니다.")}</Checkbox>
            {showRequiredErrors && !ageAccepted ? <p className="terms-required-error notranslate" translate="no" role="alert">{authText("만 14세 이상인지 확인해 주세요.")}</p> : null}
          </div>
          {availableTerms.map((term) => <div className="terms-item" key={term.termsPolicyVersionId}>
            <Checkbox checked={Boolean(accepted[term.termsPolicyVersionId])} name={`term-${term.termsPolicyVersionId}`}
              onChange={(event) => setAccepted((current) => ({ ...current, [term.termsPolicyVersionId]: event.target.checked }))}
              required={term.required}>{t('auth.termLabel', { required: authText(term.required ? '필수' : '선택'), label: authText(signupTermLabel(term.policyKey, term.name)) })}</Checkbox>
            {showRequiredErrors && term.required && !accepted[term.termsPolicyVersionId]
              ? <p className="terms-required-error notranslate" translate="no" role="alert">{t('auth.termConsent', { label: authText(signupTermLabel(term.policyKey, term.name)) })}</p> : null}
            {term.required ? <SignupTermsCopy content={term.content} label={t('auth.termContent', { label: authText(signupTermLabel(term.policyKey, term.name)) })} /> : null}
          </div>)}
        </div>
        <Button className="notranslate" translate="no" disabled={!api || !availableTerms.length || terms.isPending || terms.isError} onClick={goToProfile} size="large">{authText("다음")}</Button>
      </section>
    </AuthPanel></AuthPage>
  )
}

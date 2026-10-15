import { useUiTranslation } from '@/i18n/uiTranslation'
import type { ColocationDraft } from '@/domain/colocation/draftRepository'
import { useColocationDraft, useColocationForm } from './-components/hooks/useColocationForm'
import { AppShell } from '../../components/layout/AppShellView'
import { Modal } from '../../components/ui/ModalControl'
import { NativeSelect } from '../../components/ui/SelectControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { emailDomainOptions, phonePrefixOptions } from '../../lib/formOptions'
import { ColocationServerRooms } from './-components/ColocationServerRooms'
import { ColocationTermsCopy } from './-components/ColocationTermsCopy'

function SelectedFile({ file, onRemove }: { file: string; onRemove: () => void }) {
  const { t } = useUiTranslation()
  const match = file.match(/^(.*?)(?:\s+(\d+\s*(?:mb|kb)))?$/i)
  return (
    <span className="colocation-file-list__item">
      <span className="colocation-file-list__details"><span className="colocation-file-list__name" title={match?.[1] ?? file}>{match?.[1] ?? file}</span>{match?.[2] ? <small>{match[2]}</small> : null}</span>
      <button aria-label={t('forms.removeFile', { name: file })} onClick={onRemove} type="button">×</button>
    </span>
  )
}

export function ColocationApplyPage() {
  const { uiText } = useUiTranslation()
  const draft = useColocationDraft()
  // Keep the translator mounted while the draft changes from loading to the form.
  // Unmounting an active translator reloads the document to remove Google's DOM changes.
  return <AppShell className="colocation-shell">
    {draft.isPending ? <LoadingState label={uiText("입력 내용을 불러오는 중입니다.")} />
      : draft.isError && draft.data === undefined ? <p role="alert">{uiText("입력 내용을 불러오지 못했습니다.")} <button onClick={() => void draft.refetch()} type="button">{uiText("다시 시도")}</button></p>
      : <ColocationDraftForm initialDraft={draft.data ?? null} />}
  </AppShell>
}

function ColocationDraftForm({ initialDraft }: { initialDraft: ColocationDraft | null }) {
  const { uiText } = useUiTranslation()
  const { fixture, selectedFiles, removeFile, validationIssue, completeOpen, emailDomain, setEmailDomain, emailIdInput, updateEmailId, emailDomainInput, setEmailDomainInput, updateEmailDomainInput, phonePrefix, setPhonePrefix, serverRooms, addServerRoom, removeServerRoom, updateServerRoom, pending, submitLabel, pendingLabel, completeTitle, completeMessage, completeDescription, updateFiles, submit, terms, termsPending, termsError, retryTerms, closeComplete } = useColocationForm(initialDraft)
  const hasIssue = (...fields: string[]) => validationIssue !== null && fields.includes(validationIssue.field)
  const issueMessage = (...fields: string[]) => hasIssue(...fields) ? <small className="colocation-field-error notranslate" translate="no" role="alert">{uiText(validationIssue?.message)}</small> : null
  return (
      <section className="colocation-page">
        <form className="colocation-card" onSubmit={submit}>
          <header className="notranslate" translate="no"><h1>{uiText("입점신청")}</h1><p>{uiText("ComViewers와 함께 RCPC 서비스를 운영할 서버실 파트너를 모집합니다.")}<br />{uiText("입점에 필요한 정보를 제출해 주시면 검토 후 안내드리겠습니다.")}</p>{issueMessage('form')}</header>
          <fieldset className="notranslate" translate="no"><legend>{uiText("사업자 정보")}</legend><div className="colocation-grid"><label className={hasIssue('businessName') ? 'has-error' : ''}><span><b>*</b>{uiText("상호명")}</span><input aria-invalid={hasIssue('businessName')} defaultValue={fixture.businessName ?? ''} maxLength={150} name="businessName" placeholder={uiText("사업자등록증에 기재된 상호명")} required />{issueMessage('businessName')}</label><label className={hasIssue('businessNumber') ? 'has-error' : ''}><span><b>*</b>{uiText("사업자등록번호")}</span><input aria-invalid={hasIssue('businessNumber')} name="businessNumber" inputMode="numeric" onInput={event => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10) }} defaultValue={fixture.businessNumber?.replace(/\D/g, '')} placeholder="000-00-00000" required />{issueMessage('businessNumber')}</label><label className={hasIssue('representative') ? 'has-error' : ''}><span><b>*</b>{uiText("대표자명")}</span><input aria-invalid={hasIssue('representative')} maxLength={100} name="representative" defaultValue={fixture.representative} placeholder={uiText("대표자명 입력")} required />{issueMessage('representative')}</label></div></fieldset>
          <fieldset className="notranslate" translate="no"><legend>{uiText("담당자 정보")}</legend><div className="colocation-grid"><label className={hasIssue('managerName') ? 'has-error' : ''}><span><b>*</b>{uiText("담당자명")}</span><input aria-invalid={hasIssue('managerName')} maxLength={100} name="managerName" defaultValue={fixture.managerName} placeholder={uiText("담당자명 입력")} required />{issueMessage('managerName')}</label><label><span>{uiText("부서 또는 직책")}</span><input maxLength={100} name="position" defaultValue={fixture.position} placeholder={uiText("매니저")} /></label><label className={`colocation-grid__wide${hasIssue('email') ? ' has-error' : ''}`}><span><b>*</b>E-mail</span><div className="email-control"><input aria-invalid={hasIssue('email')} name="emailId" autoComplete="email" inputMode="email" spellCheck={false} onChange={updateEmailId} value={emailIdInput} aria-label={uiText("이메일 아이디")} placeholder={uiText("이메일")} required /><i>@</i><input aria-invalid={hasIssue('email')} aria-label={uiText("이메일 도메인")} name="emailDomain" autoComplete="off" spellCheck={false} onChange={updateEmailDomainInput} required value={emailDomainInput} /><NativeSelect aria-label={uiText("이메일 도메인 선택")} className="notranslate" translate="no" onChange={(event) => { const value = event.target.value; setEmailDomain(value); if (value !== 'direct') setEmailDomainInput(value) }} value={emailDomain}><option value="direct">{uiText("직접입력")}</option>{emailDomainOptions.map((option) => <option key={option} value={option} translate="no">{option}</option>)}</NativeSelect></div>{issueMessage('email')}</label><label className={`colocation-grid__wide${hasIssue('phoneMiddle', 'phoneLast') ? ' has-error' : ''}`}><span><b>*</b>{uiText("핸드폰")}</span><div className="phone-control"><NativeSelect aria-label={uiText("핸드폰 번호 앞자리")} onChange={(event) => setPhonePrefix(event.target.value)} value={phonePrefix}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect><input aria-invalid={hasIssue('phoneMiddle')} name="phoneMiddle" required inputMode="numeric" maxLength={4} defaultValue={fixture.phone?.[1]} aria-label={uiText("핸드폰 번호 가운데 자리")} /><input aria-invalid={hasIssue('phoneLast')} name="phoneLast" required inputMode="numeric" maxLength={4} defaultValue={fixture.phone?.[2]} aria-label={uiText("핸드폰 번호 끝자리")} /></div>{issueMessage('phoneMiddle', 'phoneLast')}</label></div></fieldset>
          <ColocationServerRooms rooms={serverRooms} pending={pending} validationIssue={validationIssue} onAdd={addServerRoom} onRemove={removeServerRoom} onChange={updateServerRoom} />
          <fieldset className={`notranslate${hasIssue('files') ? ' has-error' : ''}`} disabled={pending} translate="no"><legend>{uiText("증빙서류 첨부")}</legend><p className="colocation-help"><b>*</b> {uiText("사업자등록증(필수), 통장사본(필수) 등 증빙서류를 첨부해 주세요.")}<br />{uiText("* JPG, PNG, PDF 파일 · 총 5개 이하 · 파일당 최대 10MB")}</p><label className="colocation-file"><span>{uiText("파일 선택")}</span><input aria-invalid={hasIssue('files')} name="evidenceFiles" className="sr-only" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={updateFiles} type="file" /></label>{issueMessage('files')}<div className="colocation-file-list">{selectedFiles.map((file, index) => <SelectedFile key={`${file}-${index}`} file={file} onRemove={() => removeFile(index)} />)}</div></fieldset>
          <fieldset className={`colocation-consent${hasIssue('accepted') ? ' has-error' : ''}`}><legend className="sr-only notranslate" translate="no">{uiText("약관 동의")}</legend><label className={`notranslate${hasIssue('accepted') ? ' has-error' : ''}`} translate="no"><Checkbox key={terms?.id ?? 'unavailable'} name="accepted" disabled={!terms} required /> {uiText("[필수] 입점 약관 동의")}</label>{issueMessage('accepted')}
            {termsPending ? <LoadingState className="route-loading--compact notranslate" label={uiText("입점 약관을 불러오는 중입니다.")} /> : null}
            {termsError ? <p className="colocation-field-error notranslate" translate="no" role="alert">{uiText("입점 약관을 불러오지 못했습니다.")} <button type="button" onClick={retryTerms}>{uiText("다시 시도")}</button></p> : null}
            {terms ? <ColocationTermsCopy content={terms.content} label={uiText("입점 약관")} /> : <div className="colocation-terms-box notranslate" data-translation-content-ready={termsPending ? undefined : 'true'} translate="no">{uiText('현재 확인할 수 있는 입점 약관이 없습니다.')}</div>}
          </fieldset>
          <button className="colocation-submit notranslate" translate="no" disabled={pending || !terms} formNoValidate type="submit">{uiText(pending ? pendingLabel : submitLabel)}</button>
        </form>
        <Modal className="modal--colocation-complete notranslate" confirmLabel={uiText("닫기")} isOpen={completeOpen} onClose={closeComplete} onConfirm={closeComplete} showClose={false} title={uiText(completeTitle)}><div className="popup-copy"><p>{uiText(completeMessage)}</p><p className="colocation-complete-description">{uiText(completeDescription)}</p></div></Modal>
      </section>
  )
}

import type { ColocationDraft } from '@/domain/colocation/draftRepository'
import { useColocationDraft, useColocationForm } from './-components/hooks/useColocationForm'
import { AppShell } from '../../components/layout/AppShellView'
import { Modal } from '../../components/ui/ModalControl'
import { NativeSelect } from '../../components/ui/SelectControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { emailDomainOptions, messengerOptionLabel, messengerOptions, phonePrefixOptions } from '../../lib/formOptions'

function SelectedFile({ file, onRemove }: { file: string; onRemove: () => void }) {
  const match = file.match(/^(.*?)(?:\s+(\d+\s*(?:mb|kb)))?$/i)
  return (
    <span>
      <span>{match?.[1] ?? file}{match?.[2] ? <small>{match[2]}</small> : null}</span>
      <button aria-label={`${file} 삭제`} onClick={onRemove} type="button">×</button>
    </span>
  )
}

export function ColocationApplyPage() {
  const draft = useColocationDraft()
  if (draft.isPending) return <AppShell className="colocation-shell"><LoadingState label="입력 내용을 불러오는 중입니다." /></AppShell>
  if (draft.isError) return <AppShell className="colocation-shell"><p role="alert">입력 내용을 불러오지 못했습니다. <button onClick={() => void draft.refetch()} type="button">다시 시도</button></p></AppShell>
  return <ColocationDraftForm initialDraft={draft.data} />
}

function ColocationDraftForm({ initialDraft }: { initialDraft: ColocationDraft | null }) {
  const { fixture, selectedFiles, removeFile, notice, validationIssue, completeOpen, emailDomain, setEmailDomain, emailDomainInput, setEmailDomainInput, phonePrefix, setPhonePrefix, messenger, setMessenger, pending, submitLabel, pendingLabel, completeTitle, completeMessage, updateFiles, submit, terms, termsPending, termsError, retryTerms, closeComplete } = useColocationForm(initialDraft)
  const hasIssue = (...fields: string[]) => validationIssue !== null && fields.includes(validationIssue.field)
  const issueMessage = (...fields: string[]) => hasIssue(...fields) ? <small className="colocation-field-error" role="alert">* {validationIssue?.message}</small> : null
  return (
    <AppShell className="colocation-shell">
      <section className="colocation-page">
        <form className="colocation-card" onSubmit={submit}>
          <header><h1>입점신청</h1><p>ComViewers와 함께 RCPC 서비스를 운영할 서버실 파트너를 모집합니다.<br />입점에 필요한 정보를 제출해 주시면 검토 후 안내드리겠습니다.</p></header>
          <fieldset><legend>사업자 정보</legend><div className="colocation-grid"><label className={hasIssue('businessName') ? 'has-error' : ''}><span><b>*</b>상호명</span><input aria-invalid={hasIssue('businessName')} defaultValue={fixture.businessName ?? ''} maxLength={150} name="businessName" placeholder="사업자등록증에 기재된 상호명" required />{issueMessage('businessName')}</label><label className={hasIssue('businessNumber') ? 'has-error' : ''}><span><b>*</b>사업자등록번호</span><input aria-invalid={hasIssue('businessNumber')} name="businessNumber" inputMode="numeric" onInput={event => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10) }} defaultValue={fixture.businessNumber?.replace(/\D/g, '')} placeholder="000-00-00000" required />{issueMessage('businessNumber')}</label><label className={hasIssue('representative') ? 'has-error' : ''}><span><b>*</b>대표자명</span><input aria-invalid={hasIssue('representative')} maxLength={100} name="representative" defaultValue={fixture.representative} placeholder="대표자명 입력" required />{issueMessage('representative')}</label></div></fieldset>
          <fieldset><legend>담당자 정보</legend><div className="colocation-grid"><label className={hasIssue('managerName') ? 'has-error' : ''}><span><b>*</b>담당자명</span><input aria-invalid={hasIssue('managerName')} maxLength={100} name="managerName" defaultValue={fixture.managerName} placeholder="담당자명 입력" required />{issueMessage('managerName')}</label><label><span>부서 또는 직책</span><input maxLength={100} name="position" defaultValue={fixture.position} placeholder="매니저" /></label><label className={`colocation-grid__wide${hasIssue('email') ? ' has-error' : ''}`}><span><b>*</b>E-mail</span><div className="email-control"><input aria-invalid={hasIssue('email')} name="emailId" defaultValue={fixture.emailId} aria-label="이메일 아이디" placeholder="이메일" required /><i>@</i><input aria-invalid={hasIssue('email')} aria-label="이메일 도메인" onChange={(event) => { setEmailDomainInput(event.target.value); setEmailDomain('direct') }} required value={emailDomainInput} /><NativeSelect aria-label="이메일 도메인 선택" onChange={(event) => { const value = event.target.value; setEmailDomain(value); if (value !== 'direct') setEmailDomainInput(value) }} value={emailDomain}><option value="direct">이메일 선택</option>{emailDomainOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect></div>{issueMessage('email')}</label><label className={`colocation-grid__wide${hasIssue('phoneMiddle', 'phoneLast') ? ' has-error' : ''}`}><span><b>*</b>핸드폰</span><div className="phone-control"><NativeSelect aria-label="핸드폰 번호 앞자리" onChange={(event) => setPhonePrefix(event.target.value)} value={phonePrefix}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect><input aria-invalid={hasIssue('phoneMiddle')} name="phoneMiddle" required inputMode="numeric" maxLength={4} defaultValue={fixture.phone?.[1]} aria-label="핸드폰 번호 가운데 자리" /><input aria-invalid={hasIssue('phoneLast')} name="phoneLast" required inputMode="numeric" maxLength={4} defaultValue={fixture.phone?.[2]} aria-label="핸드폰 번호 끝자리" /></div>{issueMessage('phoneMiddle', 'phoneLast')}</label></div></fieldset>
          <fieldset><legend>서버실 정보</legend><div className="colocation-grid"><label className={hasIssue('serverRoomName') ? 'has-error' : ''}><span><b>*</b>서버실명</span><input aria-invalid={hasIssue('serverRoomName')} maxLength={150} name="serverRoomName" defaultValue={fixture.serverRoomName} placeholder="서버실명 입력" required />{issueMessage('serverRoomName')}</label><label className={hasIssue('messenger', 'messengerId') ? 'has-error' : ''}><span><b>*</b>상담 메신저</span><div className="messenger-control"><NativeSelect aria-invalid={hasIssue('messenger')} name="messenger" aria-label="상담 메신저 선택" onChange={(event) => setMessenger(event.target.value)} required value={messenger}><option value="">메신저 선택</option>{messengerOptions.map((option) => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect><input aria-invalid={hasIssue('messengerId')} defaultValue={fixture.messengerId ?? ''} maxLength={100} name="messengerId" aria-label="상담 메신저 아이디" placeholder="ID 입력" required /></div>{issueMessage('messenger', 'messengerId')}</label></div></fieldset>
          <fieldset className={hasIssue('files') ? 'has-error' : ''} disabled={pending}><legend>증빙서류 첨부</legend><p className="colocation-help"><b>*</b> 사업자등록증(필수), 통장사본(필수) 등 증빙서류를 첨부해 주세요.<br />* JPG, PNG, PDF 파일 · 총 5개 이하 · 파일당 최대 10MB</p><label className="colocation-file"><span>파일 선택</span><input aria-invalid={hasIssue('files')} name="evidenceFiles" className="sr-only" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={updateFiles} type="file" /></label>{issueMessage('files')}<div className="colocation-file-list">{selectedFiles.map((file, index) => <SelectedFile key={`${file}-${index}`} file={file} onRemove={() => removeFile(index)} />)}</div></fieldset>
          <fieldset className={`colocation-consent${hasIssue('accepted') ? ' has-error' : ''}`}><legend className="sr-only">약관 동의</legend><label className={hasIssue('accepted') ? 'has-error' : ''}><Checkbox key={terms?.id ?? 'unavailable'} name="accepted" disabled={!terms} required /> [필수] 입점 약관 동의</label>{issueMessage('accepted')}
            {termsPending ? <LoadingState className="route-loading--compact" label="입점 약관을 불러오는 중입니다." /> : null}
            {termsError ? <p role="alert">입점 약관을 불러오지 못했습니다. <button type="button" onClick={retryTerms}>다시 시도</button></p> : null}
            <div aria-label="입점 약관" className="colocation-terms-box" role="region" tabIndex={0} style={{ whiteSpace: 'pre-wrap' }}>{terms?.content ?? '현재 확인할 수 있는 입점 약관이 없습니다.'}</div>
          </fieldset>
          <button className="colocation-submit" disabled={pending || !terms} formNoValidate type="submit">{pending ? pendingLabel : submitLabel}</button>
          {notice ? <p aria-live="polite" className="community-notice">{notice}</p> : null}
        </form>
        <Modal className="modal--colocation-complete" confirmLabel="닫기" isOpen={completeOpen} onClose={closeComplete} onConfirm={closeComplete} showClose={false} title={completeTitle}><div className="popup-copy"><p>{completeMessage}</p></div></Modal>
      </section>
    </AppShell>
  )
}

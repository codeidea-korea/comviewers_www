import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { cManagerFeatureCodes, type CManagerPermissionGroupInput, type CManagerPermissionGroupSummaryDto, type CManagerPermissionRuleDto } from '@/api/cManagers'
import { Button } from '@/components/ui/ButtonControl'
import './managerPermissionGroups.css'

const featureLabels = { rcpc: 'RCPC 조회·재부팅', 'rcpc.preference': '즐겨찾기', 'rcpc.group': 'RCPC 그룹', 'rcpc.remote_access': '원격 접속정보', operation_request: '문의' }
const actions = [{ key: 'canRead', label: '조회' }, { key: 'canCreate', label: '등록' }, { key: 'canUpdate', label: '수정' }, { key: 'canDelete', label: '삭제' }] as const
const emptyDraft = (): CManagerPermissionGroupInput => ({ name: '', description: '', rules: cManagerFeatureCodes.map(featureCode => ({ featureCode, canRead: false, canCreate: false, canUpdate: false, canDelete: false })) })

export function ManagerPermissionGroupField({ value, onChange, onReady, onBusyChange, disabled }: {
  value: number | undefined; onChange: (id: number) => void; onReady: (ready: boolean) => void; onBusyChange?: (busy: boolean) => void; disabled: boolean
}) {
  const { myAccount: { managerApi: api } } = useServices()
  const client = useQueryClient()
  const key = ['my-account', 'manager-permission-groups', api?.organizationId] as const
  const groups = useQuery({ queryKey: key, enabled: Boolean(api), queryFn: ({ signal }) => {
    if (!api) throw new Error('권한 그룹을 조회할 수 없습니다.')
    return api.permissionGroups(signal)
  } })
  const [editor, setEditor] = useState<{ id?: number; draft: CManagerPermissionGroupInput } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selected = groups.data?.find(group => group.id === value)
  useEffect(() => { onBusyChange?.(busy) }, [busy, onBusyChange])
  useEffect(() => { onReady(Boolean(api && selected && !groups.isError && !editor && !busy)) }, [api, selected, groups.isError, editor, busy, onReady])
  async function edit() {
    if (!api || !value || busy) return
    setBusy(true); setError('')
    try {
      const group = await api.permissionGroup(value)
      setEditor({ id: group.id, draft: { name: group.name, description: group.description, rules: cManagerFeatureCodes.map(featureCode => group.rules.find(rule => rule.featureCode === featureCode) ?? { featureCode, canRead: false, canCreate: false, canUpdate: false, canDelete: false }) } })
    } catch { setError('권한 그룹을 조회하지 못했습니다. 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }
  function toggle(featureCode: CManagerPermissionRuleDto['featureCode'], action: typeof actions[number]['key']) {
    setEditor(current => current ? { ...current, draft: { ...current.draft, rules: current.draft.rules.map(rule => rule.featureCode === featureCode ? { ...rule, [action]: !rule[action] } : rule) } } : null)
  }
  async function save() {
    if (!api || !editor || busy || !editor.draft.name.trim()) return
    setBusy(true); setError('')
    try {
      const saved = editor.id ? await api.updatePermissionGroup(editor.id, editor.draft) : await api.createPermissionGroup(editor.draft)
      client.setQueryData<CManagerPermissionGroupSummaryDto[]>(key, previous => [...(previous ?? []).filter(group => group.id !== saved.id), { ...saved, assignedMemberCount: previous?.find(group => group.id === saved.id)?.assignedMemberCount ?? 0 }])
      onChange(saved.id); setEditor(null)
      void client.invalidateQueries({ queryKey: ['my-account', 'snapshot'] })
      void client.invalidateQueries({ queryKey: key })
    } catch {
      void client.invalidateQueries({ queryKey: key })
      setError('권한 그룹 저장 결과를 확인하지 못했습니다. 그룹 편집을 취소하고 목록을 확인한 뒤 다시 시도해 주세요.')
    }
    finally { setBusy(false) }
  }
  return <section className="manager-permission-groups" aria-label="담당자 권한 그룹">
    <label>권한 그룹<select aria-label="권한 그룹" value={value ?? ''} disabled={disabled || busy || Boolean(editor) || !api || groups.isPending || groups.isError} onChange={event => onChange(Number(event.target.value))}>
      <option value="" disabled>권한 그룹을 선택해 주세요.</option>
      {groups.data?.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
    </select></label>
    <p>담당자가 이용할 기능을 정한 권한 그룹을 선택해 주세요. RCPC 배정은 별도로 진행합니다.</p>
    {!api || groups.isError ? <p role="alert">권한 그룹을 조회하지 못했습니다. {api ? <Button onClick={() => void groups.refetch()}>다시 조회</Button> : null}</p> : null}
    {groups.isPending && api ? <p role="status">권한 그룹을 조회하고 있습니다.</p> : null}
    {!groups.isPending && !groups.isError && groups.data?.length === 0 ? <p>권한 그룹을 먼저 만들어 주세요.</p> : null}
    {!editor ? <div className="manager-permission-groups__buttons"><Button disabled={disabled || busy || !api || groups.isPending || groups.isError} onClick={() => { setError(''); setEditor({ draft: emptyDraft() }) }}>권한 그룹 만들기</Button><Button disabled={disabled || busy || !selected || groups.isError} onClick={() => void edit()}>선택 그룹 확인·수정</Button></div> : <div className="manager-permission-groups__editor">
      <h3>{editor.id ? '권한 그룹 수정' : '권한 그룹 만들기'}</h3>
      <label>그룹 이름<input aria-label="권한 그룹 이름" maxLength={100} value={editor.draft.name} disabled={busy} onChange={event => { const name = event.target.value; setEditor(current => current ? { ...current, draft: { ...current.draft, name } } : null) }} /></label>
      <label>설명<textarea aria-label="권한 그룹 설명" maxLength={500} value={editor.draft.description ?? ''} disabled={busy} onChange={event => { const description = event.target.value; setEditor(current => current ? { ...current, draft: { ...current.draft, description } } : null) }} /></label>
      <div className="manager-permission-groups__table"><table><caption>허용할 기능을 선택해 주세요.</caption><thead><tr><th>기능</th>{actions.map(action => <th key={action.key}>{action.label}</th>)}</tr></thead><tbody>{editor.draft.rules.map(rule => <tr key={rule.featureCode}><th scope="row">{featureLabels[rule.featureCode]}</th>{actions.map(action => <td key={action.key}><input type="checkbox" aria-label={`${featureLabels[rule.featureCode]} ${action.label}`} checked={rule[action.key]} disabled={busy} onChange={() => toggle(rule.featureCode, action.key)} /></td>)}</tr>)}</tbody></table></div>
      <p>RCPC의 수정 권한은 재부팅을 허용합니다. 원격 접속정보의 조회 권한은 접속 ID·비밀번호·WAN IP의 보기와 복사를 허용합니다.</p>
      {editor.id ? <p>그룹을 저장하면 이 그룹을 사용 중인 모든 담당자의 권한이 즉시 변경됩니다.</p> : <p>선택하지 않은 권한은 허용되지 않습니다.</p>}
      <div className="manager-permission-groups__buttons"><Button disabled={busy} onClick={() => { setEditor(null); setError('') }}>그룹 편집 취소</Button><Button disabled={busy || !editor.draft.name.trim()} onClick={() => void save()}>{busy ? '저장 중' : '권한 그룹 저장'}</Button></div>
    </div>}
    {error ? <p role="alert">{error}</p> : null}
  </section>
}

import { useServices } from '@/app/ServiceProvider'
import { HttpStoragePage } from './-components/http/HttpAccountPages'

export function StoragePage() {
  const { myAccount } = useServices()
  if (!myAccount.readApi) throw new Error('보관함 API가 설정되지 않았습니다.')
  return <HttpStoragePage api={myAccount.readApi} />
}

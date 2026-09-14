import { DialogActions } from '../../../../components/ui/DialogActionsControl'
import { NativeSelect } from '../../../../components/ui/SelectControl'

export function FavoritesVisualComposite() {
  return (
    <div aria-hidden="true" className="favorites-modal-layer is-composite" inert>
      <section className="favorites-group-dialog favorites-group-dialog--settings">
        <h2>즐겨찾기 설정</h2>
        <label>즐겨찾기 그룹<NativeSelect><option>미분류</option></NativeSelect></label>
        <button className="favorites-group-dialog__new" type="button">＋ 새 그룹 만들기</button>
        <DialogActions><button type="button">취소</button><button type="button">완료</button></DialogActions>
      </section>
      <section className="favorites-group-dialog favorites-group-dialog--empty">
        <h2>새 즐겨찾기 그룹</h2>
        <label>상위그룹<NativeSelect><option>없음</option></NativeSelect><small>* 상위그룹을 선택하지 않으면 이 그룹이 상위그룹으로 추가됩니다.</small></label>
        <label>그룹명<input placeholder="그룹명을 입력해 주세요." /></label>
        <DialogActions><button type="button">취소</button><button disabled type="button">추가</button></DialogActions>
      </section>
      <section className="favorites-group-dialog favorites-group-dialog--filled">
        <h2>새 즐겨찾기 그룹</h2>
        <label>상위그룹<NativeSelect><option>없음</option></NativeSelect><small>* 상위그룹을 선택하지 않으면 이 그룹이 상위그룹으로 추가됩니다.</small></label>
        <label>그룹명<input defaultValue="사무실" /><small className="is-error">* 그룹명은 최대 30자까지 입력할 수 있습니다.</small></label>
        <DialogActions><button type="button">취소</button><button type="button">추가</button></DialogActions>
      </section>
    </div>
  )
}

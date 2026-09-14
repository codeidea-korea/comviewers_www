# ComViewers WWW Frontend Agent Instructions

이 폴더는 ComViewers 사용자 서비스 프론트다. 2026-09-07 사용자 요청에 따라 ADR 0024의 React + TypeScript + Vite + React Router + TanStack Query + Zod 기반을 적용했다. 2026-09-08 서비스 src를 모두 TS/TSX로 전환하고 allowJs/checkJs를 제거했다. `VITE_API_BASE_URL` opt-in에서 실제 인증·refresh·조직 capability, 상품·장바구니·주문 견적과 마이페이지 주요 조회 API를 사용한다. 프로필 지원 필드 PATCH, RCPC 별명·즐겨찾기, 서버 그룹 ID 기반 그룹 편집·배정, 구매확정 렌탈을 선택하는 상품후기 저장을 연결했다. 실제 주문 생성·결제는 미연결이다. 기존 프리뷰는 `legacy-preview`에 보존했다.

새 데이터·상태 코드는 strict TypeScript로 작성한다. 화면은 repository 구현 대신 기능 훅을 사용하고 `app/ServiceProvider`에서 mock 구현을 주입한다. 서비스 src 전체는 strict TypeScript 검사 대상이다. `npm run typecheck`, `npm run lint`, `npm run build`는 명시 요청 시에만 실행한다. `../comviewers-pub`는 퍼블리싱 원본으로 보존한다. 현재 전환 범위는 README를 따른다.

프론트 작업 시에는 상위 `../AGENTS.md`를 먼저 따르고, 컴포넌트 구조는 이 파일의 규칙을 추가로 따른다. 단독 workspace로 이 폴더를 열었더라도 `../HANDOFF.md`, `../AGENTS.md`, `../docs/INDEX.md`를 먼저 확인하고, `../docs/INDEX.md`가 지정하는 메뉴/요구사항 문서를 읽은 뒤 작업한다.

## Startup Context

프론트 작업 전 확인 순서:

1. `../HANDOFF.md`
2. `../AGENTS.md`
3. `../docs/INDEX.md`
4. `../docs/requirements/README.md`
5. `../docs/requirements/comviewers-menu-structure.md`
6. `../docs/requirements/comviewers-requirements-definition.md`
7. 쇼핑몰·고객 마이페이지 화면 작업이면 `../docs/handoff/comviewers-shopping-wireframe.md`
8. Figma 디자인 구현·퍼블리싱 작업이면 `FIGMA_IMPLEMENTATION_STANDARD.md`
9. 현재 작업할 화면/컴포넌트 관련 파일

프론트 기술 스택이 확정되거나 화면 요구사항 문서가 추가되면 `../docs/INDEX.md`와 이 파일을 함께 갱신한다.

## Figma Design-To-Code Quality Gate

Figma 화면 구현의 목표는 80% 수준의 시각 시안이 아니라, 별도 퍼블리셔 작업 없이 개발자가 상태·API·비즈니스 로직을 이어서 구현할 수 있는 디자인 일치 코드다.

Figma 디자인 구현 요청에서는 `FIGMA_IMPLEMENTATION_STANDARD.md`를 반드시 전부 읽고 그 완료 정의와 시각 검수 게이트를 적용한다.

강제 기준:

- 대상 Figma file, frame, node ID와 기준 크기를 먼저 확인한다.
- Figma design context와 screenshot을 확인한 뒤 구현한다.
- Figma 수치를 눈대중으로 추정하거나 유사 asset과 대체 font로 핵심 디자인을 대신하지 않는다.
- 기준 viewport뿐 아니라 더 넓은 viewport에서도 이미지와 레이아웃이 늘어나거나 찌그러지지 않는지 확인한다.
- Figma screenshot과 구현 screenshot을 동일 viewport에서 비교한다.
- 핵심 section, grid, card, CTA의 DOM 실제 치수를 측정해 Figma와 대조한다.
- 색상·타이포그래피·간격·반경·상태는 Figma에 정의된 token과 component만 코드에 연결한다. 정의되지 않은 token·variant·상태는 새로 만들지 않는다.
- 정적 시안에 머물지 않고 데이터·상태·이벤트를 연결할 수 있는 컴포넌트 경계를 유지한다.
- 접근성, responsive, interaction state, console, lint, typecheck, test, build를 완료 조건으로 본다.
- Figma에 없는 반응형·상태·토큰·이미지 처리·인터랙션은 미결 디자인 결정으로 사용자에게 확인한다. 사용자 또는 디자이너의 명시 결정 전에는 임의 구현하지 않는다.

현재 디자인 참고 파일은 작업 중인 시각 자료이며 제품 정책 source of truth가 아니다. 업무 문구와 정책은 승인된 ADR과 `../docs/requirements`를 따른다.

## Component Structure Baseline

컴포넌트 구조는 `C:\Users\devco\IdeaProjects\namu-bid-system-www`의 컴포넌트 배치 방식을 참고한다. 단, API, Zod, domain 계층은 이 지침의 범위가 아니다. 이 파일은 컴포넌트 폴더링과 컴포넌트 분해 기준만 다룬다.

기본 구조:

```text
src/
├─ components/
│  ├─ ui/
│  ├─ common/
│  └─ layout/
└─ routes/
   └─ ...
      └─ -components/
         ├─ modals/
         ├─ hooks/
         └─ ...
```

## Global Components

### `src/components/ui`

순수 UI primitive만 둔다.

예시:

- `Button`
- `Input`
- `Select`
- `Checkbox`
- `Radio`
- `Modal`
- `Table`
- `Tabs`
- `Badge`
- `Tooltip`
- `Pagination`
- `DateRangePicker`

규칙:

- 특정 업무 도메인 이름을 넣지 않는다.
- API 호출, 라우터 이동, 전역 store 의존을 넣지 않는다.
- props는 UI 상태와 이벤트 콜백 중심으로 유지한다.
- 여러 화면에서 반복되는 스타일/상태/variant는 이 계층으로 끌어올린다.
- 특정 화면에서만 쓰는 조합 UI는 `ui`에 두지 않는다.

### `src/components/common`

여러 화면에서 재사용되는 앱 공통 컴포넌트를 둔다.

예시:

- `AlertModal`
- `ConfirmModal`
- `SearchBar`
- `EmptyState`
- `PageHeader`
- `TableToolbar`

규칙:

- 두 개 이상의 큰 화면에서 실제로 공유될 때만 둔다.
- 화면별 문구나 도메인별 컬럼 구조가 강하게 박히면 route-local 컴포넌트로 둔다.
- common이 커지면 `components/common/{component-name}/`처럼 폴더 단위로 분리한다.

### `src/components/layout`

앱 전체 레이아웃만 둔다.

예시:

- `AppLayout`
- `Topbar`
- `SideNav`
- `Footer`

규칙:

- 페이지별 업무 로직을 넣지 않는다.
- 인증 상태 표시, 메뉴 활성화, 기본 shell 구성 정도만 책임진다.
- layout 컴포넌트가 특정 화면의 필터/테이블/폼 상태를 알면 구조가 잘못된 것이다.

## Route-Local Components

특정 라우트나 기능 묶음에서만 쓰는 컴포넌트는 해당 route 근처의 `-components` 폴더에 둔다.

예시:

```text
src/routes/_authenticated/products/
├─ index.tsx
├─ $id.tsx
└─ -components/
   ├─ ProductListTable.tsx
   ├─ ProductSearchPanel.tsx
   ├─ ProductStatusBadge.tsx
   └─ modals/
      ├─ ProductVisibilityModal.tsx
      └─ ProductDeleteConfirmModal.tsx
```

규칙:

- 해당 라우트/기능에서만 쓰는 컴포넌트는 `src/components`로 올리지 않는다.
- route 파일은 라우팅, search param, guard, 큰 조립 역할 중심으로 유지한다.
- 화면 UI는 `-components` 아래의 section/table/form/modal 컴포넌트로 분리한다.
- 모달은 `-components/modals`에 둔다.
- 화면 전용 hook은 `-components/hooks`에 둔다.
- 복잡한 한 화면은 폴더로 묶고 내부에 `components/`를 둔다.

예시:

```text
src/routes/_authenticated/rentals/-components/RentalDetailPage/
├─ index.tsx
└─ components/
   ├─ RentalSummaryPanel.tsx
   ├─ RentalPaymentHistoryTable.tsx
   ├─ RentalPcAssetPanel.tsx
   └─ RentalActionBar.tsx
```

## Splitting Rules

컴포넌트가 다음 기준에 걸리면 분리를 검토한다.

- 파일이 400~500줄을 넘는다.
- props가 15개 이상이다.
- 한 컴포넌트 안에 검색, 테이블, 폼, 모달, 상세 패널이 모두 들어 있다.
- JSX 중첩이 깊어서 화면 구조를 한눈에 읽기 어렵다.
- 같은 버튼/테이블/필터 조합이 여러 화면에 반복된다.

분리 우선순위:

1. 반복 UI를 `components/ui` 또는 `components/common`으로 이동
2. 화면 section을 route-local `-components`로 분리
3. 모달을 `-components/modals`로 분리
4. 화면 상태/이벤트 묶음을 `-components/hooks`로 분리
5. 큰 테이블은 `Table`, `Row`, `Toolbar`, `EmptyState`, `Pagination` 단위로 분리

## Naming Rules

- React 컴포넌트 파일은 `PascalCase.tsx`
- hook 파일은 `useSomething.ts`
- route-local 컴포넌트는 기능명이 드러나게 짓는다.
- 애매한 이름을 피한다.
  - 나쁨: `List.tsx`, `Item.tsx`, `Modal.tsx`
  - 좋음: `RentalListTable.tsx`, `PcAssetRow.tsx`, `RefundConfirmModal.tsx`
- `index.ts` barrel export는 작고 명확한 묶음에만 사용한다. 무분별한 거대 export 허브를 만들지 않는다.

## Promotion Rules

처음에는 route-local로 둔다. 재사용이 확인되면 위로 올린다.

- 한 라우트에서만 사용: `routes/.../-components`
- 같은 기능 묶음 안 여러 라우트에서 사용: 해당 기능의 `-components`
- 서로 다른 기능 2개 이상에서 사용: `components/common`
- 도메인 의미가 없는 순수 UI primitive: `components/ui`

성급하게 공통화하지 않는다. 공통화는 실제 반복과 변경 비용이 확인된 뒤에 한다.

## Anti-Patterns

- 특정 화면 전용 컴포넌트를 `components/ui`에 넣지 않는다.
- 모든 컴포넌트를 `components/` 한 곳에 평면적으로 쌓지 않는다.
- route 파일 하나에 전체 화면 JSX와 모든 이벤트 핸들러를 몰아넣지 않는다.
- props drilling이 심한 상태를 방치하지 않는다.
- 단순히 줄 수를 줄이려고 의미 없는 wrapper 컴포넌트를 만들지 않는다.
- UI primitive 안에서 API 호출이나 라우팅을 하지 않는다.

## ComViewers Screen Guidance

ComViewers는 고객 화면, 관리자 화면, PC 자산/렌탈/정산/회계/ComBar 연동 화면이 섞일 수 있다. 화면별 컴포넌트는 처음부터 기능 경계에 붙여 둔다.

예상 예시:

```text
src/routes/_authenticated/pc-assets/-components/
src/routes/_authenticated/rentals/-components/
src/routes/_authenticated/orders/-components/
src/routes/_authenticated/settlements/-components/
src/routes/_authenticated/tax-invoices/-components/
src/routes/_authenticated/combar/-components/
```

관리자 화면에서 위험 동작이 있는 컴포넌트는 이름에 의도를 드러낸다.

예시:

- `RefundApproveConfirmModal`
- `SettlementConfirmActionBar`
- `PcAssetExecutableAppHistoryTable`
- `ComBarRecoveryStatusPanel`

## Verification

프론트 코드가 생성된 뒤에는 가능한 범위에서 다음을 확인한다.

- component import 경로가 route-local, common, ui 경계를 어기지 않는지 확인
- Figma 기준 viewport의 screenshot 비교와 핵심 DOM 치수 대조
- 기준보다 넓은 viewport에서 canvas, image, card, CTA의 비율 보존 확인
- 대표 desktop/mobile viewport의 horizontal overflow와 줄바꿈 확인
- browser console warning/error 확인
- lint
- typecheck
- unit/component test와 주요 flow E2E
- coverage 80% 이상
- build
- 주요 화면의 desktop/mobile 레이아웃 확인
- 버튼 텍스트, 테이블 셀, 모달 내용이 작은 화면에서 깨지지 않는지 확인

Figma 구현 작업은 `FIGMA_IMPLEMENTATION_STANDARD.md`의 완료 정의를 추가로 따른다. 검증을 실행하지 못하면 이유와 남은 시각적 차이를 보고한다.

## Lightweight Change Policy

  다음 작업은 사용자가 명시적으로 요청하지 않는 한 테스트·컴파일 검증을 수행하지 않는다.

  - 문서, 프롬프트, 스킬 설명, 설정 안내 등 비실행 산출물의 단순 수정
  - 기존 기능 동작을 변경하지 않는 텍스트·메타데이터 수정

  기본 규칙:

  1. 문서 수정에 대해 테스트를 작성하거나 실행하지 않는다.
  2. 컴파일, 빌드, 타입체크, 린트는 사용자가 요청했거나 빌드 오류를 해결하는 작업이 아닌 한 실행하지 않는다.
  3. 기능 테스트 파일(Unit/Integration/E2E)을 새로 만들거나 수정하지 않는다. 단, 사용자가 테스트 추가·수정을 명시적으로
  요청한 경우에는 예외로 한다.
  4. 코드 기능 변경 작업은 테스트가 필요할 수 있음을 사용자에게 간단히 알리되, 명시적 승인 없이 테스트 파일을 추가하지
  않는다.
  5. 기존 테스트를 깨뜨릴 가능성이 높은 변경은 테스트 미실행 사실을 최종 응답에 명시한다.


## Execution Selection Harness

이 섹션은 이 파일의 일반적인 TDD, 테스트, 빌드, 컴파일, lint, typecheck, 검증 규칙보다 우선한다. 매 작업 시작 시 변경을 아래 등급으로 분류하고, 완료 보고에 등급과 수행한 정적 확인만 짧게 남긴다.

| 등급 | 대상 | 기본 실행 정책 |
|---|---|---|
| L0 | 문서, 프롬프트, 에이전트 지침, 스킬 설명 | 실행 검증 없이 diff와 링크·경로·Markdown 정합성만 확인 |
| L1 | 동작을 바꾸지 않는 설정, 메타데이터, 정적 자산 참조 | 실행 검증 없이 diff와 참조 정합성만 확인 |
| L2 | 기능 코드와 API 계약 변경 | 테스트·컴파일·빌드·lint·typecheck와 새/수정 기능 테스트 파일은 사용자의 명시 요청이 있을 때만 수행 |
| L3 | 보안, 인증/권한, DB migration, 결제·정산, 배포 | 자동 실행하지 않는다. 필요한 검증과 위험을 제시하고 사용자의 지시를 받은 범위에서만 수행 |

### Diff-Only Review

- L0/L1 변경은 `git diff` 또는 동등한 변경 비교와 수정 파일의 인접 문맥 확인으로 마무리한다.
- 문서에서는 링크, 경로, 앵커, 날짜, 상호 참조처럼 실행 없이 확인 가능한 항목만 점검한다.
- 테스트, 컴파일, 빌드, lint, typecheck 명령은 기본 검증 단계에 포함하지 않는다.

### External Action Boundary

- 커밋, push, PR 생성·병합, 배포, 패키지 설치·업데이트, 외부 서비스 설정 변경, 운영 데이터 변경은 사용자가 명시적으로 요청한 경우에만 수행한다.

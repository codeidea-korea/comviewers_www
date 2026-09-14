# ComViewers Figma 구현 품질 표준

최종 업데이트: 2026-07-24

## 1. 목적

이 문서는 ComViewers Figma 화면을 프론트엔드 코드로 구현할 때 모든 세션이 동일한 품질 기준을 적용하도록 하는 강제 품질 게이트다.

목표는 “약 80% 유사한 퍼블리싱 시안”이 아니다. 별도의 퍼블리셔가 다시 마크업과 스타일을 정리하지 않아도 개발자가 상태, API, 비즈니스 로직을 이어서 구현할 수 있는 **퍼블리셔 대체 수준의 디자인 일치 코드**를 만든다.

이 기준은 React 등 특정 프레임워크를 최종 스택으로 확정하지 않는다. 사용자가 명시적으로 요청하지 않은 scaffold를 만들지 않는다는 `AGENTS.md` 규칙은 그대로 유지한다.

## 2. 기준 자료와 우선순위

시각 구현과 제품 정책을 분리한다.

- 레이아웃, 크기, 간격, 색상, 타이포그래피, 이미지 crop, 컴포넌트 모양: 대상 Figma의 현재 확정 프레임
- 메뉴, 기능 범위, 업무 문구와 정책: `../docs/requirements`, 승인된 ADR, 관련 handoff
- 현재 구현 동작: 실제 코드와 테스트
- Figma에 있는 샘플 값과 `정책 확인 후 업데이트 예정` 문구: 확정 정책으로 사용하지 않음

자료가 충돌하면 임의로 섞지 않는다. 시각 차이와 정책 차이를 분리해 보고하고, 관련 문서의 source-of-truth 우선순위에 따라 처리한다.

### 디자인 결정 권한과 확인 절차

Figma에 없는 시각·상태·인터랙션·반응형 규칙은 구현자가 창작하거나 보완할 대상이 아니다. 해당 항목은 **미결 디자인 결정**으로 분류한다.

- 정의되지 않은 color, typography, spacing, radius, shadow, icon, image crop, hover/focus/disabled/loading/error state, breakpoint, empty/error 화면은 임의로 정하지 않는다.
- 기존 디자인 시스템에 token·component·variant가 없으면 새 token 또는 variant를 코드에 독자적으로 만들지 않는다.
- 구현을 계속하려면 대상 Figma node, 빠진 항목, 화면 영향, 선택지와 각각의 영향만 간결히 정리해 사용자에게 결정을 요청한다.
- 사용자가 디자이너 확인을 요청하면, 디자이너가 Figma 또는 디자인 시스템에 반영한 값을 기준으로 구현한다.
- 사용자가 명시적으로 가정을 승인한 경우에만 그 범위를 문서화하고 구현한다. 승인된 가정은 새 디자인 기준이 아니라 해당 작업의 제한적 결정이다.
- semantic HTML, 키보드 접근성처럼 시각 규격을 바꾸지 않는 구현 품질은 적용할 수 있지만, 표시 결과가 달라지는 선택은 이 절차를 따른다.

### 현재 시각 디자인 참고 파일

- [ICT 디바이스 쇼핑몰 구축 컴뷰어스 디자인](https://www.figma.com/design/MlM5yHJYk6qwwHsi9Icl84/ICT-%EB%94%94%EB%B0%94%EC%9D%B4%EC%8A%A4-%EC%87%BC%ED%95%91%EB%AA%B0-%EA%B5%AC%EC%B6%95_%EC%BB%B4%EB%B7%B0%EC%96%B4%EC%8A%A4_%EB%94%94%EC%9E%90%EC%9D%B8?node-id=0-1)

이 파일은 디자이너가 작업 중인 시각 참고 자료다. 최종 완료 확인 전에는 제품 정책의 source of truth 또는 전체 화면의 동결된 구현 기준으로 보지 않는다. 구현 시점마다 대상 node ID와 현재 상태를 다시 확인한다.

### 2026-07-24 품질 검증용 프리뷰 기준

- 대상: `L page > main`
- 메인 프레임: node `235:1837`, `1920 × 6571`
- 3단 배너: node `235:1970`, 전체 `1920 × 489`
  - 좌우 padding `12px`
  - 카드 `624 × 489` 3개
  - 카드 간격 `12px`
- 하단 CTA: node `235:2254`, `1920 × 608`

이 수치는 현재 품질 검증용 프리뷰의 회귀 기준이며, 디자이너가 Figma를 수정하면 새 값으로 다시 측정한다.

## 3. 완료 정의

다음 조건을 모두 만족해야 Figma 구현을 완료로 처리한다.

1. 대상 Figma node를 직접 조회하고 프레임 크기와 구조를 확인했다.
2. Figma screenshot과 구현 screenshot을 동일 viewport에서 비교했다.
3. 주요 섹션의 실제 DOM 치수를 측정해 Figma 값과 대조했다.
4. 원본 이미지, 아이콘, 폰트 또는 승인된 프로젝트 자산을 사용했다.
5. 임의의 유사 이미지, 대체 폰트, 눈대중 간격으로 핵심 디자인을 대신하지 않았다.
6. 화면이 더 넓거나 좁아져도 이미지와 콘텐츠가 비정상적으로 늘어나거나 찌그러지지 않는다.
7. 디자인 시스템 자산은 재사용 가능한 token과 component로 연결했다.
8. 실제 개발을 이어갈 수 있도록 데이터, 상태, 이벤트 경계를 가진 컴포넌트 구조로 작성했다.
9. 접근성, 키보드 focus, semantic element, interactive state를 확인했다.
10. lint, typecheck, test, build와 브라우저 console 검증을 통과했다.

정적 이미지만 비슷하게 보이거나, 한 viewport에서만 우연히 맞거나, 하드코딩된 단일 페이지라서 이후 개발이 어려우면 완료가 아니다.

## 4. 필수 구현 절차

### 4.1 대상 고정

구현 전에 다음을 기록한다.

- Figma file URL 또는 file key
- page와 frame 이름
- 대상 node ID
- frame의 기준 width와 height
- desktop/mobile 별도 프레임 존재 여부
- Figma가 작업 중인지 완료·승인 상태인지

node ID를 모르면 페이지 전체를 추측해 구현하지 않는다. 먼저 Figma 구조에서 정확한 대상을 찾는다.

### 4.2 구조와 실측 확인

대상 frame과 핵심 section/component에 대해 Figma design context와 screenshot을 확인한다.

최소 확인 항목:

- frame과 section의 width/height
- container max width와 정렬 방식
- padding, gap, margin
- grid column 수와 각 item 크기
- font family, size, weight, line-height, letter-spacing
- color, border, radius, shadow, opacity
- image fill 방식, crop 위치, object position
- auto layout, constraints, fill/hug/fixed 관계
- component variant와 interactive state

Figma 코드 출력을 그대로 붙이지 않는다. 프로젝트의 컴포넌트 구조와 CSS 방식으로 변환하되 측정값은 보존한다.

### 4.3 캔버스와 반응형

- desktop 기준은 대상 Figma frame의 실제 width다. 모든 화면을 무조건 `1920px`로 가정하지 않는다.
- 기준보다 넓은 viewport에서 full-width section이 자동 확대되는지는 Figma constraints와 디자인 의도로 판단한다.
- 기준보다 넓은 viewport의 동작이 Figma constraints에 명시되지 않았다면 구현을 확정하지 않고, 확대·고정 canvas·별도 breakpoint 중 어떤 정책인지 결정 요청한다.
- 모바일 또는 tablet Figma가 있으면 해당 frame을 독립 기준으로 구현한다.
- 모바일 Figma가 없으면 임의의 responsive fallback을 구현하지 않는다. 필요한 breakpoint, 정보 우선순위, overflow 정책을 미결 디자인 결정으로 올린다.
- desktop, ultrawide, tablet, mobile에서 horizontal overflow와 잘린 interactive element를 확인한다.

현재 메인 프리뷰는 `1920px` 디자인 캔버스를 기준으로 하며, 그보다 넓은 화면에서는 캔버스를 중앙 정렬하고 디자인 내부를 확대하지 않는다.

### 4.4 이미지와 폰트

- 원본 asset을 사용하고 다운로드 가능한 Figma asset은 프로젝트에 안정적으로 보관한다.
- 임시 만료 URL을 런타임 source로 남기지 않는다.
- 이미지 비율을 강제로 늘리지 않는다.
- `cover`, `contain`, 고정 crop 중 어떤 방식인지 Figma와 대조하고 `object-position` 또는 절대 위치까지 맞춘다.
- 배경 이미지 위 텍스트가 있으면 gradient, overlay, contrast도 Figma 값으로 구현한다.
- font family와 실제 font file을 일치시킨다.
- 폰트 로딩 전후로 줄바꿈과 section 높이가 달라지지 않는지 확인한다.

### 4.5 디자인 시스템과 컴포넌트

- Figma에 정의된 Color system, typography, spacing, radius, shadow만 코드 token으로 옮긴다. 빠진 token은 새로 설계하지 않고 결정 요청한다.
- Figma component와 variant는 가능한 한 코드의 공용 component와 variant prop으로 연결한다.
- 한 화면 전용 조합은 route-local component로 유지한다.
- Figma에 정의된 hover, focus, pressed, selected, disabled, loading, error 상태를 정확히 옮긴다. 정의되지 않은 상태는 임의로 보완하지 않고 미결 디자인 결정으로 올린다.
- 반복되는 수치라도 의미가 다르면 성급하게 하나의 token으로 합치지 않는다.

컴포넌트 배치는 `AGENTS.md`의 `ui`, `common`, `layout`, route-local 경계를 따른다.

### 4.6 개발 가능한 구조

- 리스트, 상품, 공지, 배너를 JSX에 복제하지 않고 data model을 통해 렌더링한다.
- 링크와 버튼을 구분하고 향후 router/API handler를 연결할 수 있는 event 경계를 둔다.
- loading, empty, error, permission, offline 상태가 필요한 화면은 기본 구조에 포함한다.
- 위험 동작은 confirmation, 권한, 중복 요청 방지와 감사 로그 전제를 UI 상태에 반영한다.
- 임시 프리뷰 데이터는 명백한 fixture로 분리하고 실제 개인정보를 사용하지 않는다.

## 5. 시각 검수 게이트

### 5.1 필수 viewport

대상별로 최소 다음을 확인한다.

1. Figma 기준 frame과 동일한 content viewport
2. 기준보다 넓은 viewport 한 개
3. 대표 desktop 또는 laptop viewport
4. Figma mobile frame 또는 프로젝트의 대표 mobile viewport

현재 `L page > main` 프리뷰의 최소 확인 예:

- Figma 기준 content width `1920px`
- ultrawide `2048px`
- desktop `1440px`
- mobile `390px`

### 5.2 DOM 실측

브라우저에서 핵심 요소의 `getBoundingClientRect()` 결과를 확인한다.

- page canvas
- header와 hero
- container
- grid와 card
- full-width banner
- CTA
- footer

기준 viewport에서 구조적 width, height, gap, padding은 브라우저 subpixel rounding을 제외하고 Figma 값과 일치해야 한다. 일반 허용 범위는 `±1px`이며, 그보다 큰 차이는 원인과 승인 근거를 남긴다.

### 5.3 screenshot 비교

- Figma screenshot과 브라우저 screenshot을 동일 크기로 맞춘다.
- 나란히 비교만 하지 말고 필요하면 반투명 overlay 또는 pixel diff를 사용한다.
- 레이아웃 위치, 이미지 crop, 줄바꿈, 시각적 무게, 색상과 여백을 확인한다.
- 동일 OS·브라우저·font 환경에서 자동 pixel diff를 운영할 경우 기본 차이율은 `1% 이하`를 목표로 한다. anti-aliasing과 동적 콘텐츠 영역은 명시적으로 mask할 수 있다.
- 차이율만 통과하고 육안상 중요한 불일치가 있으면 실패다.

### 5.4 기능·품질 검증

- keyboard focus와 tab order
- button/link accessible name
- image alt 정책
- menu, modal, tab, carousel 등 상호작용
- browser console warning/error 없음
- horizontal overflow 없음
- layout shift와 font fallback 확인
- lint
- typecheck
- unit/component test
- 주요 flow E2E
- production build
- 프로젝트 기준 coverage 80% 이상

## 6. 완료 보고 형식

Figma 구현 완료 보고에는 다음 근거를 포함한다.

- 구현한 Figma file/frame/node
- 기준 viewport와 추가 검증 viewport
- Figma와 일치시킨 핵심 실측값
- 사용한 원본 asset과 font
- screenshot 또는 visual regression 결과
- 실행한 lint/typecheck/test/build
- console 오류 여부
- 미결 디자인 결정 목록과 결정자(사용자 또는 디자이너)
- 사용자에게 명시 승인받아 적용한 가정의 범위
- 남은 불일치와 후속 작업

“대략 비슷하게 구현했다” 또는 퍼센트 추정만으로 완료를 보고하지 않는다.

## 7. 예외 처리

- Figma가 작업 중이면 확정된 node만 구현하고 WIP임을 표시한다.
- source asset이나 font를 얻을 수 없으면 임의 대체 전에 사용자에게 차이를 보고한다.
- Figma constraints, breakpoint, 상태 규칙이 모호하면 구현 선택을 하지 않고 결정 요청한다.
- 브라우저 렌더링 차이로 정확한 pixel 일치가 불가능하면 구조적 실측값을 먼저 맞추고 남은 차이를 구체적으로 기록한다.
- 디자인이 접근성이나 실제 데이터 길이를 수용하지 못하면 조용히 디자인을 바꾸지 말고 충돌과 권장안을 보고한다.

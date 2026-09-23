# ComViewers 사용자 서비스 프론트

## 2026-09-23 담당자 운영 흐름 연결

담당자 등록·수정에 권한 그룹 선택·생성·수정을 연결했다. 원격정보 조회 권한은 ID·비밀번호·WAN 보기/복사, RCPC 수정 권한은 재부팅을 뜻하며 현재 배정·기간 검사는 유지한다. 계정과 그룹은 API에서 원자 저장한다. 담당자 관리 RCPC 목록은 서버의 전체 페이지를 읽고 건수 변경·중복·조회 실패를 불완전한 성공 목록으로 표시하지 않는다. 활성 담당자가 남은 대표 탈퇴는 기존 제한 사유 UI로 안내한다.

API와 함께 반영해야 한다. 후속 사용자 테스트 요청으로 전체 테스트 91/91, typecheck, build 통과와 lint 오류 0·기존 경고 2건을 확인했다. 신규 회귀 7건에는 실제 Chromium에서 권한 그룹 생성·실패·선택·담당자 저장이 포함되며 API는 메모리 fake다. 201대 전체 조회·부분 조회 실패를 검증했고 테스트 브라우저·서버·고유 임시 캐시를 정리했다. 실제 MySQL·배포 판정은 [상세 수정·실행 관문](../docs/handoff/comviewers-structural-flow-fixes-2026-09-23.md)을 따른다.

ComViewers 사용자용 웹 애플리케이션이다. React, TypeScript, Vite를 기반으로 하며 사용자 인증, 상품 탐색, 장바구니·주문, 마이페이지, 문의·커뮤니티 화면을 제공한다.

## 기술 스택

2026-09-21 에디터 통일: 사용자·관리자 앱은 `src/components/ui/RichTextEditorCore.tsx`, `richTextEditor.css`, `editor-icons/`의 동일 구현을 사용한다. 독립 저장소의 자체 빌드를 위해 각각 포함하므로 변경 시 양쪽을 함께 동기화한다. 사용자 `RichTextEditorControl`은 공통 구현을 내보내며 HTML/JSON 콜백을 유지한다. 한글 메뉴·서식·전체화면·링크 입력 UI를 통일했고, 본문 이미지 버튼은 기존 첨부 안내 단계다. 이번 확인은 정적 검토이며 브라우저·빌드·테스트 검증은 미실시다.

- React 19
- TypeScript 5.9
- Vite 6
- React Router 8
- TanStack Query 5
- Zod 4
- TipTap 3

## 요구 환경

- Node.js 22.13 이상
- npm

## 설치 및 로컬 실행

```bash
npm ci
npm run dev
```

기본 개발 주소는 `http://127.0.0.1:5301`이다.

## Google 웹사이트 번역 위젯 로컬 시험 (2026-09-18)

- 2026-09-21 공통·중요 문구 적용: [검토용 표·확인 범위](../docs/handoff/comviewers-translation-table.md), [데이터 원본](src/i18n/translation-overrides.ts). 사용자 화면 160개 문구/800개 번역 셀을 DEV 화면에 연결했다. 공개 화면은 Google 선택 언어와 수동 문구를 동기화하고, 나머지 사용자 경로는 Google 스크립트 없는 수동 번역표 선택기를 쓴다(모바일 마이페이지는 메뉴 내부). 동일 탭의 언어 유지·한국어 복원을 지원한다. 관리자 제외·원어민 미검수이며 미등록 문구는 자동번역 또는 원문이다. 상품의 5개 언어 수·가격, 표 전환·안내 모달·복원·모바일 폭, 로그인 화면 수동 선택/새로고침을 확인했다. 실제 인증된 결제·환불 번역 흐름은 미검수다. L2 정적/UI 확인만 수행했고 테스트·빌드·배포는 하지 않았다.

- 개발 모드(`import.meta.env.DEV`)의 공개 화면에서 로그인 여부와 관계없이 상단 `페이지 번역`을 눌러 기존 Google Website Translator를 로드한다. 언어는 영어·일본어·중국어 간체/번체·베트남어다. Cloud Translation API 키는 사용하지 않는다.
- Google 위젯 허용 경로는 홈, 상품 목록/상세, 고객센터 목록/상세, 회사소개, 약관, 개인정보처리방침이다. 로그인·결제·마이페이지에서는 Google 위젯 대신 수동 번역표 선택기를 표시한다. production 빌드에서는 두 선택기 모두 표시하지 않는다. 운영 기능 확정이 아닌 사용자 요청에 따른 시험이다.
- 번역 활성 중 내부 링크는 문서 전체 이동을 사용한다. 다음 공개 페이지에서도 `페이지 번역`을 다시 눌러야 하며, 종료 시 번역 쿠키를 지우고 원문으로 새로고침한다. 번역기 DOM과 React 갱신 충돌을 줄이기 위한 실험 범위 제한이다.
- Google 상단 바가 상품 필터 drawer 닫기 버튼을 가리지 않도록 시험용 CSS에서 body top 값을 반영한다.
- 2026-09-21 배치 수정: 데스크톱 번역 버튼을 장바구니·회원정보와 같은 정보 줄에 두되 화면 오른쪽 끝에서 16px 안쪽에 정렬한다. 넓은 화면의 사용자 메뉴는 기존 본문 폭 끝에 유지하고, 좁은 화면에서는 번역 버튼과 12px 간격을 확보한다. 모바일은 기존 정보 메뉴를 숨기되 로고 줄 아래에 번역 버튼을 표시한다. 로컬 `/products`의 1920px/1280px/390px 화면에서 버튼 위치를 확인했으며 이번 변경에서는 번역 실행을 재검증하지 않았다.
- 위젯 로딩 후 줄바꿈 보완: 언어 선택 컨테이너와 Google 로고를 위젯 내부에서만 inline-block으로 표시하고 줄바꿈을 막는다. 제공 표시는 유지한다. 비로그인 공개 상품 페이지에서 실제 위젯 로딩 후 1280px/320px 한 줄 표시를 확인했다. 언어 선택을 통한 본문 번역은 이번 배치 보완에서 재검증하지 않았다.
- 후속 수정: 로그인 상태 상품 화면에서 버튼이 숨겨지던 anonymous 조건을 제거했다. 헤더 사용자 메뉴와 모바일 계정 메뉴는 `notranslate`/`translate="no"`로 번역 대상에서 제외한다. 이는 제3자 스크립트의 DOM 접근을 격리하는 보안 경계가 아니다. 컴포넌트 해제 시에도 번역 쿠키를 지운다. 같은 Chrome의 로그인된 `/products`에서 버튼 표시를 확인했으며, 로그인 상태 번역 실행 클릭은 계정 정보 외부 전달 가능성을 이유로 자동 승인 검토가 거부해 실행하지 않았다.
- 브라우저에서 홈·상품 목록의 영어 번역, 동적 필터 팝업 번역·닫기, 카드→표 전환 후 번역, 번역 종료 후 한국어 복구, 번역 중 로그인 이동 후 위젯/스크립트 미로드를 확인했다. 관찰한 브라우저 console error는 0건이다. `총 → gun`, `개 → dog`, `원 → one` 같은 문맥 오역이 관찰되었다. 전체 화면/언어 QA 통과를 의미하지 않는다.
- Google 공식 공지의 2026-09-01 업데이트는 **2026-10-01 위젯 지원 종료**를 안내한다: https://developers.google.com/search/blog/2020/05/google-translates-website-translator
- 변경 등급 L2. diff·초기화/종료·DEV/세션/경로 조건 정적 검토 및 사용자가 요청한 로컬 브라우저 시험만 수행했다. 테스트 파일 추가, 자동테스트, typecheck, lint, build, 배포는 하지 않았다.

## 환경변수

`.env.example`을 참고해 로컬 또는 배포 환경에 맞게 설정한다.

| 변수 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | ComViewers API 주소. 지정하지 않으면 현재 origin의 `/api/...`를 사용한다. |

API 주소 예시:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8080
```

환경변수에는 비밀번호, JWT, API secret 등 서버 비밀값을 넣지 않는다. `VITE_` 변수는 브라우저 번들에 포함될 수 있다.

## 명령어

```bash
npm run dev
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run preview
```

## 빌드 및 배포

```bash
npm ci
npm run build
```

빌드 결과는 `dist/`에 생성된다. 개발 서버의 배포 경로는 다음과 같다.

```text
/home/comviewers_www/user/dist
```

운영 기준 사용자 URL은 다음과 같다.

```text
https://comviewers.codeidea.io/
```

SPA route 새로고침을 지원하도록 Nginx에서 존재하지 않는 경로를 `/index.html`로 fallback해야 한다.

## 주요 디렉터리

```text
src/
  api/          HTTP API client와 DTO
  app/          provider와 애플리케이션 설정
  components/   공통 UI와 layout
  domain/       도메인별 service와 model
  routes/       화면과 route-local component
public/         정적 파일
tests/          단위 테스트
```

## 저장소 원칙

- 사용자 서비스 구현만 관리한다.
- 관리자 프론트, API, ComBar는 각각 별도 저장소에서 관리한다.
- 실제 비밀값과 로컬 `.env`는 커밋하지 않는다.
- 내부 검수 기록, 진행률 및 요구사항 변경 이력은 이 저장소 README에 누적하지 않는다.

## 2026-09-23 추가 구조 검토 10~15

상품·약관·공지·커뮤니티 본문 이미지 조회와 커뮤니티 작성 이미지 업로드를 연결했다. 저장 문서는 attachmentId를 참조하며 미리보기 blob URL은 저장하지 않는다. 실행 결과·테스트 데이터 정리·운영 적용 경계는 [추가 구조 검토 인수인계](../docs/handoff/comviewers-structural-flow-followup-2026-09-23.md)를 따른다.

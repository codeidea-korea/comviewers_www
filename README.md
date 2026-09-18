# ComViewers 사용자 서비스 프론트

ComViewers 사용자용 웹 애플리케이션이다. React, TypeScript, Vite를 기반으로 하며 사용자 인증, 상품 탐색, 장바구니·주문, 마이페이지, 문의·커뮤니티 화면을 제공한다.

## 기술 스택

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

- 개발 모드(`import.meta.env.DEV`)의 공개 화면에서 로그인 여부와 관계없이 상단 `페이지 번역`을 눌러 기존 Google Website Translator를 로드한다. 언어는 영어·일본어·중국어 간체/번체·베트남어다. Cloud Translation API 키는 사용하지 않는다.
- 허용 경로는 홈, 상품 목록/상세, 고객센터 목록/상세, 회사소개, 약관, 개인정보처리방침이다. 로그인·결제·마이페이지와 production 빌드에서는 위젯을 표시하거나 로드하지 않는다. 운영 기능 확정이 아닌 사용자 요청에 따른 시험이다.
- 번역 활성 중 내부 링크는 문서 전체 이동을 사용한다. 다음 공개 페이지에서도 `페이지 번역`을 다시 눌러야 하며, 종료 시 번역 쿠키를 지우고 원문으로 새로고침한다. 번역기 DOM과 React 갱신 충돌을 줄이기 위한 실험 범위 제한이다.
- Google 상단 바가 상품 필터 drawer 닫기 버튼을 가리지 않도록 시험용 CSS에서 body top 값을 반영한다.
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

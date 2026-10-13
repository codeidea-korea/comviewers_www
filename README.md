# ComViewers 사용자 서비스 프론트

## 2026-10-13 쿠폰 최대 할인금액 표시

보유·다운로드 가능 정률 쿠폰의 `maximumDiscountAmount`를 조회해 기존 혜택 문구에 최대 할인금액을 표시한다. 기존 NULL/누락 응답은 종전 문구를 유지한다. 실제 상한은 API의 공통 주문 견적에서 적용하며 V186·API 반영이 필요하다. L2/L0 정적 diff·응답/표시 계약만 확인했고 테스트·타입체크·빌드·브라우저·DB 적용·배포는 미실행이다. [쿠폰 정책](../docs/decisions/0015-figma-pm-policy-baseline.md#상품장바구니주문-가격-모델)을 따른다.

ComViewers 사용자용 웹 애플리케이션이다. 인증, 상품 탐색, 장바구니·주문, 마이페이지, 문의·커뮤니티 화면을 제공한다. 작업 이력과 검증 범위는 [전체 인수인계](../HANDOFF.md), 기능별 정책은 [문서 인덱스](../docs/INDEX.md)에서 확인한다.

입점 신청은 동일 사업자의 추가 신청과 한 번의 복수 서버실 제출을 지원한다. 공통 사업자·담당자·증빙·약관을 입력하고 Figma v1.5의 `+ 서버실 추가`로 서버실명·상담 메신저를 입력한다. 최초 영역은 유지하며 추가 영역만 X로 삭제한다. 입력 순서와 서버실별 값은 제출·재시도에 포함되고 API는 각 서버실을 독립 심사 건으로 저장한다. 이번 복수 신청 변경은 L2/L3 정적 확인 범위이며 실제 화면·API·테스트·빌드·DB 적용·배포는 미검증이다. [입점 정책](../docs/decisions/0015-figma-pm-policy-baseline.md#주문입점-동의와-시점-스냅샷)을 따른다.

## 기술 스택

- React 19, TypeScript 5.9, Vite 6
- React Router 8, TanStack Query 5, Zod 4
- TipTap 3

사용자·관리자 앱은 `src/components/ui/RichTextEditorCore.tsx`, `richTextEditor.css`, `editor-icons/`의 공통 에디터 구현을 각 저장소에 포함한다. 에디터를 수정할 때는 두 앱의 구현을 함께 확인한다.

## 요구 환경 및 로컬 실행

- Node.js 22.13 이상
- npm

```bash
npm ci
npm run dev
```

기본 개발 주소는 `http://127.0.0.1:5301`이다.

## 환경변수

`.env.example`을 참고해 로컬 또는 배포 환경에 맞게 설정한다.

| 변수 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | ComViewers API 주소. 지정하지 않으면 현재 origin의 `/api/...`를 사용한다. |

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8080
```

비밀번호, JWT, API secret 등 서버 비밀값을 `VITE_` 환경변수에 넣지 않는다. 해당 값은 브라우저 번들에 포함될 수 있다.

## 번역

사용자 헤더의 장바구니 옆 `Language` 메뉴에서 한국어·영어·일본어·중국어 간체·번체를 선택할 수 있다. 공개 화면은 Google 웹사이트 번역 위젯을 사용하고, 로그인·결제·마이페이지 등에서는 수동 번역표를 사용한다. 관리자 앱은 대상이 아니다.

Google 위젯 허용 경로는 홈, 상품 목록·상세, 고객센터 목록·상세, 회사소개, 약관, 개인정보처리방침, 공개 게시글 목록·상세와 후기 목록이다. 게시글 작성·수정은 제외한다. 선택 언어는 같은 탭에서 유지되며 한국어를 선택하면 번역 쿠키를 지우고 원문으로 복귀한다.

수동 번역 데이터는 [translation-overrides.ts](src/i18n/translation-overrides.ts), 번역표의 검토 범위는 [번역 적용 기록](../docs/handoff/comviewers-translation-table.md)을 따른다. Google 위젯은 외부 서비스이므로 공개 화면의 내용이 번역 서비스에 전달될 수 있다.

## RCPC 교체 비용 결제

부품·디바이스 교체 비용은 담당자가 동일 금액으로 등록한 임시 상품을 고객이 기존 상품 구매·주문·결제 흐름으로 구매하여 수납한다. 고객의 교체 전용 견적·결제 화면은 제공하지 않는다. `교체 이용` 주문 필터는 교체가 완료된 새 장비를 뜻한다. 교체 처리와 검증 범위는 [전체 인수인계](../HANDOFF.md)를 따른다.

## 개발 명령어

```bash
npm run dev
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run preview
```

테스트 종류와 실행 조건은 [tests/README.md](tests/README.md)를 따른다.

## 빌드 및 배포

```bash
npm ci
npm run build
```

빌드 결과는 `dist/`에 생성된다. 개발 서버의 배포 경로는 `/home/comviewers_www/user/dist`이고, 사용자 서비스 URL은 `https://comviewers.codeidea.io/`이다. SPA 경로 새로고침을 위해 Nginx에서 존재하지 않는 경로를 `/index.html`로 fallback한다.

## 주요 디렉터리

```text
src/
  api/          HTTP API client와 DTO
  app/          provider와 애플리케이션 설정
  components/   공통 UI와 layout
  domain/       도메인별 service와 model
  routes/       화면과 route-local component
public/         정적 파일
tests/          테스트
```

## 저장소 원칙

- 사용자 서비스 구현만 관리한다. 관리자 프론트, API, ComBar는 각각 별도 저장소에서 관리한다.
- 실제 비밀값과 로컬 `.env`는 커밋하지 않는다.
- 작업 이력, 진행률, 검증 기록은 README에 누적하지 않고 관련 인수인계 문서에 기록한다.

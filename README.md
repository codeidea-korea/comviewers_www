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

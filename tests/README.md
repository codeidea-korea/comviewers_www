# 테스트 실행 범위

| 명령 | 확인하는 내용 |
|---|---|
| `npm run test:unit` | 실제 함수, API fake, schema, QueryClient, React SSR 렌더 결과 |
| `npm run test:contracts` | `[source contract]`로 표시한 소스 문구·참조·CSS 선언 검사 |
| `npm run test:browser` | `[browser]`로 표시한 기존 Python Playwright의 클릭·입력·화면 검사 |
| `npm run test:all` | 위 세 종류 모두 |

브라우저 테스트는 `PYTHON` 환경변수로 지정한 Python 또는 기존 Python 설치에 Playwright와 브라우저가 준비되어 있어야 한다. 미설치 환경에서 실패를 통과로 처리하거나 자동으로 설치하지 않는다. 모든 테스트는 외부 실 API 대신 fake를 사용하며 운영 DB·PG·장비에 요청하지 않는다.

정적 계약은 해당 문자열·선택자가 소스에 있는지만 보장한다. SSR 검사는 실제 React 렌더 결과를 확인하지만 픽셀 배치나 클릭을 보장하지 않는다. 회원가입 focus helper 테스트도 제출 폼의 올바른 요소에 focus/scroll 명령이 전달되는지 확인하며 브라우저의 최종 화면 위치는 브라우저 검사 대상이다.

2026-10-02 구조 수정 회귀:

- `structure-boundaries.test.mjs`: refresh 시 scope 유지·조직 전환과 권한 회수 시 이전 서비스 차단, 상품 cache 소유권, 담당자 조회 경계, 숫자 정렬·혜택 표 렌더.
- `http-client-auth-failure.test.mjs`: 이전 토큰 요청·다운로드의 늦은 401이 현재 세션을 종료하지 않는지 확인.
- `manager-operational-flows.test.mjs`: 전용 담당자 reader가 201대 전체 페이지를 보존하고 페이지 실패·중복·건수 변경을 부분 성공으로 반환하지 않는지 확인.
- `signup-pdf-contract.test.mjs`, `mypage-presentation.test.mjs`: 비밀번호·확인 schema, invalid field focus helper, 별명 유무에 따른 실제 모바일 카드 렌더 결과. 문구·CSS 선언의 정적 계약은 별도 이름으로 표시한다.

Node 버전에 따라 필터로 모든 사례가 제외된 파일 자체가 통과 항목으로 집계될 수 있다. `test:unit`과 `test:contracts`의 표시 건수를 단순 합산해 전체 테스트 수로 사용하지 않는다.

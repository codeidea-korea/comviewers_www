# comviewers-www

ComViewers 웹 프론트엔드 작업 공간이다.

현재의 React/Vite 코드는 Figma `L page > main`을 검증하기 위한 퍼블리싱 프리뷰다. 제품의 최종 프론트엔드 기술 스택을 확정한 결과로 간주하지 않는다.

Figma 화면 구현은 [FIGMA_IMPLEMENTATION_STANDARD.md](./FIGMA_IMPLEMENTATION_STANDARD.md)의 퍼블리셔 대체 수준 완료 정의와 시각 검수 게이트를 따른다. `AGENTS.md`는 다른 세션도 이 문서를 필수로 읽도록 규정한다.

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm test
npm run test:coverage
npm run build
```

- React + TypeScript + Vite
- CSS 기반 반응형 구현
- Figma 원본 에셋은 `public/assets`에 로컬 보관
- 컴포넌트 테스트 커버리지 기준 80% 이상

최종 스택이 확정되면 `AGENTS.md`와 이 문서의 빌드·테스트·컴포넌트 규칙을 다시 정리한다.


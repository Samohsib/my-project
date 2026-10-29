# my-project

Vite + React + TypeScript로 만든 웹앱 뼈대입니다.

## 시작하기

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev      # 개발 서버 실행 (http://localhost:5173)
```

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행. 파일을 저장하면 화면이 바로 바뀝니다 |
| `npm test` | 테스트 한 번 실행 (Vitest) |
| `npm run test:watch` | 파일이 바뀔 때마다 테스트 다시 실행 |
| `npm run lint` | 린트 검사 (oxlint) |
| `npm run build` | 타입 검사 후 `dist/`에 배포용 빌드 생성 |
| `npm run preview` | 빌드 결과를 로컬에서 미리 보기 |

## 구조

```
src/
  main.tsx              # 앱 진입점
  App.tsx               # 최상위 화면
  index.css             # 전역 스타일 (라이트/다크 모드)
  components/
    Counter.tsx         # 예시 컴포넌트
    Counter.test.tsx    # 예시 테스트
  test/setup.ts         # 테스트 환경 설정
.github/workflows/ci.yml  # 푸시와 PR마다 린트, 테스트, 빌드 실행
```

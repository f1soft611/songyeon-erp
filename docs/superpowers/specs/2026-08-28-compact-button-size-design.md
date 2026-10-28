# ERP 공통 버튼 크기 축소 설계

## 목표

현재 프로젝트 테마의 공통 `MuiButton` 세로 여백을 줄여 ERP 업무 화면의 정보 밀도를 높인다.

## 범위

- 대상: `frontend/src/theme/theme.ts`의 `MuiButton.styleOverrides.root`
- 변경: `paddingTop`, `paddingBottom`을 `12px`에서 `8px`로 조정
- 제외: `IconButton`, 메뉴 항목, 버튼 색상, 글꼴, 모서리, 가로 여백, 동작

## 설계

MUI `ThemeProvider`가 제공하는 공통 `MuiButton` 토큰만 수정한다. 기존 버튼 컴포넌트는 별도 스타일을 덮어쓰지 않는 한 동일하게 약 8px 낮아지며, 아이콘 전용 버튼과 드롭다운 메뉴에는 영향이 없다.

## 검증

- `npm run test -- tests/theme-settings.test.tsx`로 테마 설정 회귀 확인
- `npm run build`로 타입 검사 및 번들 생성 확인
- 브라우저에서 대시보드의 일반 버튼 높이와 아이콘 버튼 크기가 의도대로 분리되어 있는지 확인

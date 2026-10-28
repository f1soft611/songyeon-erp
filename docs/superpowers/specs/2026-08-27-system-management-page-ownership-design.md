# 시스템 관리 페이지 소유권 정리 설계

## 목표

환경설정 > 시스템 관리의 권한관리와 메뉴관리 화면에 필요한 타입, 샘플 데이터, 화면 패널을 각 페이지 폴더가 소유하도록 정리한다. 대시보드는 셸, 라우팅, 공통 메뉴 트리와 요약 콘텐츠만 담당한다.

## 구조

- `frontend/src/pages/settings/system/roles`
  - `RoleManagementPage.tsx`: 페이지 헤더와 패널 조립
  - `RoleManagementPanel.tsx`: 역할 목록과 권한 상세 UI
  - `roleManagement.data.ts`: 역할 샘플 데이터
  - `roleManagement.types.ts`: 역할 행과 권한 타입
- `frontend/src/pages/settings/system/menus`
  - `MenuManagementPage.tsx`: 페이지 헤더와 패널 조립
  - `MenuManagementPanel.tsx`: 메뉴 목록과 기본정보 UI
  - `menuManagement.data.ts`: 메뉴 샘플 데이터
  - `menuManagement.types.ts`: 메뉴 행 타입
- `frontend/src/pages/dashboard`
  - 관리 페이지 전용 패널, 행 타입, 샘플 배열 제거
  - `DashboardContent`의 페이지 분기와 대시보드 공통 콘텐츠는 유지

## 동작 보존

기존 URL, 헤더, 테이블, 상세 패널, 샘플 표시, 테마 처리는 변경하지 않는다. 페이지 컴포넌트는 기존 `selectedModule`, `currentMenuName`, `content` 계약을 유지한다.

## 검증

페이지별 데이터 모듈에서 권한 3개 이상과 메뉴 샘플 행을 직접 검증하고, 기존 대시보드 사이드바 렌더링 테스트와 `npm run build`, `npm run test`를 실행한다.

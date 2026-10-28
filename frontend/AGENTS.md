# AGENTS

## 프론트엔드 작업 가이드

이 파일은 [frontend](../frontend) 영역에서 작업할 때 AI 에이전트가 따라야 할 규칙을 정리한 문서입니다.

## 기본 원칙

- 작업 전에 [docs](../docs) 의 요구사항 문서와 작업지시서를 먼저 확인합니다.
- 구현은 문서 기준으로 수행하고, 화면 동작을 추측하지 않습니다.
- 변경 범위는 [frontend/src](src) 와 관련 설정으로만 제한합니다.
- 기존 구조와 네이밍을 우선 따르며, 불필요한 리팩터링을 하지 않습니다.

## 작업 순서

1. 작업지시서와 요구사항 문서 확인
2. [docs/plan](../docs/plan) 에서 계획 수립
3. [docs/spec](../docs/spec) 에서 화면/기능/검증 기준 정의
4. 실제 구현
5. 결과 문서와 스크린샷 정리

## 프론트엔드 개발 규칙

## 반응형 브라우저 대응 규칙

- 화면 구현 전 모바일, 태블릿, 데스크톱 레이아웃을 함께 고려합니다.
- 최소 375px, 768px, 1280px 뷰포트에서 레이아웃을 확인합니다.
- 고정 너비로 인해 의도하지 않은 가로 스크롤이 발생하지 않도록 합니다.
- 테이블, 검색 영역, 필터, 버튼 그룹은 좁은 화면에서 줄바꿈, 내부 스크롤, 접힘 중 적절한 방식을 적용합니다.
- 텍스트, 버튼, 아이콘, 입력 요소가 겹치거나 잘리지 않도록 합니다.
- 기존 스타일 체계에 맞춰 유동적인 너비, 미디어 쿼리, `minmax` 등을 사용합니다.
- DOM 테스트만으로 반응형 검증을 끝내지 않고 실제 브라우저 렌더링을 확인합니다.
- 화면 변경 후 필요한 경우 모바일 및 데스크톱 스크린샷을 결과 문서에 포함합니다.

## 페이지 생성 시 구조 예시

페이지를 새로 만들 때는 아래와 같은 수준으로 정리하는 것을 원칙으로 합니다.

```text
src/
  pages/
    settings/
      system/
        menus/
          MenuManagementPage.tsx
          components/
          hooks/
          services/
          types/
          constants/
          data/
        roles/
          RoleManagementPage.tsx
          components/
          hooks/
          services/
          types/
          data/
    dashboard/
      DashboardPage.tsx
      components/
      hooks/
      services/
      types/
      data/
    groupware/
      DocumentsPage.tsx
      OverviewPage.tsx
  shared/
    components/
      f1-grid/
      layout/
      PageHeader.tsx
      PageSearchArea.tsx
    hooks/
      usePagination.ts
      useDebouncedSearch.ts
    services/
      apiClient.ts
      authService.ts
    context/
    types/
  routes/
  theme/
```

원칙:

- 페이지 파일(`XxxPage.tsx`)은 화면 조립과 주요 흐름을 담당하고, `pages/<도메인>/<기능>/` 폴더 바로 아래에 둡니다.
- 해당 기능 안에서만 쓰이는 UI, 훅, API 호출, 타입은 같은 기능 폴더 하위의 `components/`, `hooks/`, `services/`, `types/`로 분리합니다.
- 정적 목록, 옵션 데이터 등은 필요할 때 같은 위치에 `data/` 또는 `constants/`로 분리합니다.
- 여러 페이지/도메인에서 공통으로 재사용되는 컴포넌트, 훅, 서비스, 컨텍스트, 타입만 `src/shared` 아래로 승격합니다. 한 기능에서만 쓰이는 코드를 `shared`로 옮기지 않습니다.
- 한 페이지 안에서 단순한 UI만 있는 경우, 하위 폴더를 과도하게 만드는 대신 같은 파일에 두는 것이 더 적절할 수 있습니다.
- 너무 작은 파일 단위로 쪼개지 말고, 재사용 여부와 복잡도 기준으로 분리합니다.
- `hook`은 여러 컴포넌트에서 재사용되거나 로직이 복잡할 때만 만들고, 페이지 한 곳에서만 쓰이면 오히려 같은 파일에 두는 것을 우선합니다.

## F1-Grid 공통 규칙

- **모든 그리드의 첫 칸은 순번**으로 한다(S_ERP 그리드와 같음). 아래 정의를 그대로 쓴다.

```ts
{
  field: 'id',            // 행 키 필드
  type: 'rownumber',
  width: 60,
  headerName: '순번',
  headerAlign: 'center',
  align: 'center',
  pinned: 'left',
},
```

## 검증 기준

```bash
cd frontend
npm install
npm run dev
npm run build
npm run test
```

- `npm run dev`: Vite 개발 서버 실행
- `npm run build`: TypeScript + Vite 빌드
- `npm run test`: Vitest 단일 실행

## 브라우저 테스트 서버 정리

- 브라우저 테스트를 위해 개발 서버를 직접 실행한 경우, 테스트 완료 여부와 관계없이 테스트 종료 후 해당 서버를 종료하고 사용한 포트가 해제되었는지 확인합니다.
- 테스트가 실패하거나 중단된 경우에도 동일하게 정리합니다. 자동화 스크립트에서는 성공·실패 경로 모두에서 종료 처리가 실행되도록 합니다.
- 기존에 실행 중이던 서버를 재사용한 경우에는 해당 서버를 종료하지 않습니다.

## 금지 사항

- 문서 없이 화면 동작을 임의로 추가하지 않습니다.
- 인접 기능과 무관한 수정이나 대규모 리팩터링을 하지 않습니다.
- 결과 문서와 스크린샷 없이 작업을 완료로 간주하지 않습니다.

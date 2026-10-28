# 대시보드 사이드바 반응형 접힘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중앙 콘텐츠가 부족할 때 92px 모듈 선택 레일은 유지하고 메뉴 패널만 자동 접힘하며, 데스크톱/모바일 수동 토글과 375px, 768px, 1280px 전체 화면 반응형을 제공한다.

**Architecture:** `DashboardPage`가 메뉴 패널의 반응형 상태와 토글을 소유하고 `DashboardSidebar`가 92px 모듈 레일과 메뉴 패널의 데스크톱/모바일 표현을 조립한다. 중앙 콘텐츠는 `minWidth: 0`을 유지하고 F1-GRID과 넓은 표는 내부 스크롤 경계를 유지한다. 콘텐츠 폭 감지는 중앙 flex item의 `ResizeObserver`로 수행하고 사용자의 수동 상태는 현재 화면 크기에서만 유지한다.

**Tech Stack:** React 19, TypeScript, MUI 9, Vitest, Testing Library, Playwright

---

### Task 1: 메뉴 패널 반응형 상태 훅과 앱 셸 계약 정의

**Files:**

- Create: `frontend/src/pages/dashboard/hooks/useDashboardResponsive.ts`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Test: `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: 상태 계약을 검증하는 실패 테스트 작성**

`DashboardPage`를 테스트하고, 메뉴 패널 토글 버튼의 `aria-expanded`와 92px 모듈 레일의 모듈 접근성을 검증한다. 테스트 환경에서 `matchMedia`와 `ResizeObserver`를 제어할 수 있는 작은 테스트 헬퍼를 테스트 파일에 둔다.

```tsx
it('toggles the desktop menu panel while keeping the module rail visible', async () => {
  render(<App />);
  await loginAsAdmin();

  const toggle = screen.getByRole('button', { name: /메뉴 패널 접기/i });
  expect(toggle).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(toggle);

  expect(
    screen.getByRole('button', { name: /메뉴 패널 펼치기/i }),
  ).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('button', { name: /그룹웨어/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인**

Run: `npm run test -- tests/dashboard-sidebar.test.tsx`

Expected: 접기 버튼이 아직 없어 접근성 역할 조회가 실패한다.

- [ ] **Step 3: 최소 상태 훅 구현**

`useDashboardResponsive`에 `isMobile`, `isContentConstrained`, `isMenuPanelCollapsed`, `isMobileMenuOpen`, `toggleMenuPanel`, `closeMobileMenu`, 중앙 콘텐츠 ref를 정의한다. `matchMedia('(max-width: 767px)')`는 모바일 판정에만 사용하고, `ResizeObserver`는 중앙 콘텐츠 폭을 관찰한다. 데스크톱 수동 토글은 `manualOverride`로 보존하되 `isMobile` 전환 시 모바일 메뉴 열림 상태를 닫는다.

```ts
export type DashboardResponsiveState = {
  isMobile: boolean;
  isContentConstrained: boolean;
  isMenuPanelCollapsed: boolean;
  isMobileMenuOpen: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
  toggleMenuPanel: () => void;
  closeMobileMenu: () => void;
};
```

콘텐츠 제약 판정은 중앙 콘텐츠의 `clientWidth`가 92px 모듈 레일과 메뉴 패널을 함께 둔 상태에서 필요한 최소 폭보다 작은지를 기준으로 하며, 자동 접힘 이후 사용자의 수동 토글이 있으면 현재 화면 크기에서 그 선택을 유지한다. 초기 렌더링과 ResizeObserver 콜백 모두 같은 판정 함수를 사용한다.

- [ ] **Step 4: `DashboardPage`에 상태 훅 연결**

중앙 콘텐츠 `Box`에 `ref={contentRef}`를 연결하고 `DashboardSidebar`에 `isMobile`, `isMenuPanelCollapsed`, `isMobileMenuOpen`, `onToggleMenu`, `onCloseMobileMenu`를 전달한다. 모듈 레일은 항상 렌더링하고 모바일 메뉴 열기 버튼은 AppBar 내부에 배치하며 기존 컨트롤이 좁은 폭에서 줄바꿈할 수 있는 구조를 보존한다.

- [ ] **Step 5: 동일 테스트를 통과시키고 타입 검사**

Run: `npm run test -- tests/dashboard-sidebar.test.tsx`

Expected: 기존 메뉴 전환 테스트와 새 접힘 테스트가 PASS.

Run: `npm run build`

Expected: TypeScript 및 Vite build PASS.

### Task 2: 데스크톱 메뉴 패널 접힘 구현

**Files:**

- Modify: `frontend/src/pages/dashboard/components/DashboardSidebar.tsx`
- Modify: `frontend/src/pages/dashboard/components/DashboardModuleSection.tsx`
- Modify: `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`
- Test: `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: 레일 상태의 표시 규칙 테스트 추가**

접힌 상태에서 메뉴 트리의 텍스트 헤더가 표시되지 않고 모듈 버튼의 accessible name이 유지되는지 확인한다. 펼침 상태에서 모듈 이름과 메뉴 트리가 다시 표시되는지도 검증한다.

```tsx
it('hides the menu tree while preserving module access in the collapsed rail', async () => {
  render(<App />);
  await loginAsAdmin();
  fireEvent.click(screen.getByRole('button', { name: /메뉴 패널 접기/i }));

  expect(screen.getByRole('button', { name: /그룹웨어/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /메뉴 패널 펼치기/i }));
  expect(screen.getByText(/모듈 선택/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: `DashboardModuleSection`에 collapsed 표시 추가**

모듈 선택 레일은 기존 92px 폭과 S-ERP 제목/모듈 라벨을 유지한다. 메뉴 패널의 접힘 상태는 `DashboardSidebar`가 `DashboardMenuTree`에 전달한다.

- [ ] **Step 3: `DashboardMenuTree`에 collapsed 표시 추가**

`collapsed` prop이 true이면 메뉴 트리 영역을 렌더링하지 않고, false이면 기존 트리와 사용자 카드 표시를 유지한다. 선택 모듈 전환 및 리프 라우팅 로직은 변경하지 않는다.

- [ ] **Step 4: `DashboardSidebar` Drawer 폭과 토글 버튼 연결**

92px 모듈 레일은 고정하고 메뉴 패널만 표시하거나 숨긴다. 메뉴 패널 토글 버튼은 메뉴 패널 헤더에 배치하고 `aria-label`과 `aria-expanded`를 설정한다. MUI Drawer의 paper와 내부 flex child에 `minWidth: 0`을 적용해 메뉴 패널 전환 시 페이지 폭이 늘어나지 않게 한다.

- [ ] **Step 5: 데스크톱 사이드바 테스트 실행**

Run: `npm run test -- tests/dashboard-sidebar.test.tsx`

Expected: 사이드바 표시/접힘/모듈 선택/메뉴 선택 테스트 PASS.

### Task 3: 모바일 메뉴 Drawer와 자동 접힘 연결

**Files:**

- Modify: `frontend/src/pages/dashboard/components/DashboardSidebar.tsx`
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Test: `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: 모바일 열기/닫기 실패 테스트 작성**

`window.matchMedia`가 375px 조건을 반환하도록 설정하고, 모바일에서 92px 모듈 레일은 보이는 상태로 유지한 뒤 AppBar의 메뉴 열기 버튼으로 메뉴 패널을 열고 닫는지 검증한다.

```tsx
it('opens and closes the sidebar on mobile', async () => {
  setViewportMatch(true);
  render(<App />);
  await loginAsAdmin();

  expect(screen.getByRole('button', { name: /그룹웨어/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /메뉴 열기/i }));
  expect(screen.getByText(/모듈 선택/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /메뉴 닫기/i }));
  expect(screen.queryByRole('tree')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 모바일 Drawer 표현 구현**

`isMobile`에서는 92px 모듈 레일을 permanent 영역으로 유지하고 메뉴 패널만 temporary Drawer로 표시한다. 모바일 메뉴 열기 버튼은 중앙 콘텐츠 AppBar에 표시하고, Drawer close/Backdrop click으로 `closeMobileMenu`를 호출한다. 모바일 Drawer 폭은 280px 이하의 유동 폭으로 설정해 375px 뷰포트에서 콘텐츠를 넘기지 않게 한다.

- [ ] **Step 3: 콘텐츠 기반 자동 접힘 연결**

ResizeObserver가 중앙 콘텐츠 폭 부족을 감지하면 데스크톱에서 메뉴 패널을 접는다. 사용자가 수동으로 펼치거나 접은 경우에는 현재 화면 크기에서 해당 선택을 보존하고, 모바일 전환 시에는 메뉴 패널 숨김 정책을 우선한다. 모듈 레일은 모든 상태에서 유지한다.

- [ ] **Step 4: 모바일/자동 접힘 테스트 실행**

Run: `npm run test -- tests/dashboard-sidebar.test.tsx`

Expected: 모바일 Drawer와 데스크톱 자동/수동 상태 테스트 PASS.

### Task 4: 모든 화면의 반응형 오버플로우 국소 수정

**Files:**

- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify: 실제 브라우저 측정에서 오버플로우가 확인된 `frontend/src/pages/**` 화면 파일만 수정
- Test: 해당 화면의 기존 테스트와 `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: 375px, 768px, 1280px에서 오버플로우 측정 추가**

Playwright 캡처 스크립트 또는 신규 `frontend/scripts/capture-dashboard-responsive.js`에서 각 뷰포트에 로그인하고 다음을 측정한다.

```js
const metrics = await page.evaluate(() => ({
  documentScrollWidth: document.documentElement.scrollWidth,
  viewportWidth: window.innerWidth,
  bodyScrollWidth: document.body.scrollWidth,
}));
if (metrics.documentScrollWidth > metrics.viewportWidth) {
  throw new Error(`Document overflow: ${JSON.stringify(metrics)}`);
}
```

- [ ] **Step 2: 확인된 화면의 필터/버튼/표만 수정**

고정 폭 컨테이너에는 `min-width: 0`, 반복 그리드에는 `minmax(0, 1fr)`, 버튼/필터 그룹에는 `flex-wrap: wrap`을 적용한다. 넓은 표는 페이지 전체가 아닌 가장 가까운 표 컨테이너에 `overflow-x: auto`를 둔다. 텍스트와 컨트롤은 375px에서 잘리지 않도록 확인한다.

- [ ] **Step 3: 관련 화면 테스트 실행**

Run: `npm run test -- tests/dashboard-sidebar.test.tsx tests/f1-grid.test.tsx tests/menu-management-f1-grid.test.tsx`

Expected: 관련 Vitest PASS.

### Task 5: 브라우저 검증과 결과 문서

**Files:**

- Create: `frontend/scripts/capture-dashboard-responsive.js` if existing capture script cannot cover all states
- Create: `docs/result/20260828/dashboard-sidebar-responsive/20260828_009_대시보드_사이드바_반응형_결과.md`
- Create: `docs/result/20260828/dashboard-sidebar-responsive/screenshots/`

- [ ] **Step 1: 브라우저 캡처 스크립트 작성**

Playwright로 375px, 768px, 1280px을 순회하며 모듈 레일 유지 여부, 메뉴 패널 상태, 열기/닫기 접근성 이름, 문서 전체 overflow, F1-GRID 내부 overflow를 기록하고 각 뷰포트의 스크린샷을 저장한다.

- [ ] **Step 2: 개발 서버 실행 및 캡처**

Run: `npm run dev`

별도 터미널에서 Run: `node scripts/capture-dashboard-responsive.js`

Expected: 세 뷰포트 스크린샷이 생성되고 문서 전체 가로 오버플로우 검증이 PASS.

- [ ] **Step 3: 전체 프론트엔드 검증**

Run: `npm run test`

Expected: 전체 Vitest PASS.

Run: `npm run build`

Expected: TypeScript 및 Vite build PASS.

- [ ] **Step 4: 결과 문서 작성**

검증한 뷰포트, 자동/수동 접힘 결과, 문서 및 F1-GRID 스크롤 측정값, 실행 명령과 스크린샷 파일을 결과 문서에 기록한다. 결과 문서는 요구사항에 없는 화면 동작을 포함하지 않았음을 명시한다.

---

## Self-review

- 설계의 메뉴 패널 자동 접힘, 92px 모듈 레일 유지, 모바일 메뉴 Drawer, 현재 화면 크기에서의 수동 상태 유지 항목은 Task 1~3에서 구현한다.
- 전체 화면 반응형 규칙과 실제 브라우저 검증은 Task 4~5에서 375px, 768px, 1280px 모두 측정한다.
- F1-GRID 자체 컬럼 폭 정책은 변경하지 않고 기존 내부 수평 스크롤을 Task 4~5에서 회귀 검증한다.
- 서버/API/DB 변경과 localStorage 저장은 범위에서 제외한다.
- 미정 파일은 브라우저 측정 결과에 따라 실제 오버플로우 화면으로 좁혀 수정하며, 그 외 파일은 변경하지 않는다.

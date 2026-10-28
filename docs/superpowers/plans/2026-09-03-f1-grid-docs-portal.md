# F1-Grid Developer Docs Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 공유 가능한 F1-Grid 문서 포털과 S-ERP 내부 진입점을 제공하고, 문서별 옵션 기반 Playground로 실제 Grid 동작을 확인할 수 있게 한다.

**Architecture:** 정적 `F1GridDoc` 데이터가 문서 목차, 본문, 코드, Playground 설정을 제공한다. 문서 페이지는 반응형 사이드바/본문 셸을 담당하고, Playground는 기존 `F1Grid`를 샘플 데이터와 옵션 state에 연결한다. 공개 라우트는 독립 렌더링하며 내부 대시보드 메뉴는 같은 페이지 컴포넌트를 재사용한다.

**Tech Stack:** React 19, TypeScript, Vite, React Router 7, MUI 9, Vitest, Testing Library, Playwright

---

### Task 1: 문서 페이지의 실패 테스트 작성

**Files:**

- Create: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: 공개 라우트와 문서 상호작용 테스트 작성**

테스트는 로그인 상태와 백엔드 API를 사용하지 않고 `F1GridDocsPage`를 직접 렌더링한다. 다음을 검증한다.

```tsx
it('renders the overview document and navigation items', () => {
  render(<F1GridDocsPage />);
  expect(screen.getByRole('heading', { name: 'F1-Grid' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Editing' })).toBeInTheDocument();
});

it('switches documents from the sidebar', async () => {
  const user = userEvent.setup();
  render(<F1GridDocsPage />);
  await user.click(screen.getByRole('button', { name: 'Editing' }));
  expect(
    screen.getByRole('heading', { name: 'Cell Editing' }),
  ).toBeInTheDocument();
  expect(screen.getByTestId('f1-grid-doc-playground')).toBeInTheDocument();
});

it('updates the playground and reports code copy state', async () => {
  const user = userEvent.setup();
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  render(<F1GridDocsPage initialDocumentId="row-height" />);
  await user.click(screen.getByRole('button', { name: 'Increase row height' }));
  expect(screen.getByText('48px')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Copy code' }));
  expect(screen.getByText('Copied')).toBeInTheDocument();
});
```

- [ ] **Step 2: RED 검증**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
Expected: FAIL because the page and document modules do not exist.

### Task 2: 정적 문서 계약과 콘텐츠 데이터 구현

**Files:**

- Create: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Create: `frontend/src/pages/f1-grid-docs/types.ts`

- [ ] **Step 1: 문서 타입과 목록 정의**

`F1GridDoc`, `DocSection`, `PlaygroundConfig`를 정의하고, 사양서의 12개 문서 ID를 `docs` 배열로 제공한다. 각 문서는 제목, category, 설명, 최소 한 개의 prose/code 섹션을 포함한다. Playground가 필요한 문서에는 `row-height`, `editing`, `selection`, `layout`, `row-merge`, `tree` 중 하나의 kind를 지정한다.

- [ ] **Step 2: 문서 데이터 단위 검증**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
Expected: FAIL only on missing page rendering; document IDs and labels are available to the implementation.

### Task 3: 문서 본문과 공통 코드 블록 구현

**Files:**

- Create: `frontend/src/pages/f1-grid-docs/components/DocCodeBlock.tsx`
- Create: `frontend/src/pages/f1-grid-docs/components/DocContent.tsx`

- [ ] **Step 1: 코드 블록 복사 상태 구현**

`DocCodeBlock`은 `navigator.clipboard.writeText(code)`를 호출하고 성공 시 `Copied`, 실패 시 `Copy failed` 상태를 표시한다. 클립보드 API가 없는 환경에서는 실패 상태를 표시하며 렌더링을 중단하지 않는다.

- [ ] **Step 2: 문서 섹션 렌더링 구현**

`DocContent`는 prose, code, api, related 블록을 렌더링하고 code 블록마다 `DocCodeBlock`을 사용한다. 코드 블록의 복사 버튼 접근성 이름은 `Copy code`로 고정한다.

- [ ] **Step 3: 좁은 범위 테스트 실행**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
Expected: 코드 복사 테스트가 통과하고 페이지 미구현 테스트만 실패한다.

### Task 4: 문서별 Playground 구현

**Files:**

- Create: `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx`
- Create: `frontend/src/pages/f1-grid-docs/components/PlaygroundControls.tsx`
- Create: `frontend/src/pages/f1-grid-docs/components/f1GridDocs.css`

- [ ] **Step 1: Playground state와 샘플 데이터 연결**

`F1GridPlayground`는 `F1Grid`와 기존 `ItemRow`에 의존하지 않는 문서용 샘플 행을 정의한다. `kind`별로 최소 동작을 제공한다.

- `row-height`: 초기 40px, `Increase row height`/`Decrease row height`, wrap 토글
- `editing`: editable 셀, validate 결과 표시
- `selection`: row selection과 변경 상태 표시
- `layout`: 컬럼 고정/표시/리사이즈 토글
- `row-merge`: 동일 값 연속 행 병합
- `tree`: `F1Tree` 또는 기존 트리 API를 사용한 펼침 예제

옵션은 실제 `F1Grid` props로 전달하고, 현재 값은 `data-testid="f1-grid-doc-playground"` 내부에 표시한다.

- [ ] **Step 2: 반응형 Playground 스타일 구현**

데스크톱에서는 controls와 Grid를 280px/1fr로 배치하고, 768px 이하에서는 단일 열로 바꾼다. Grid 컨테이너는 `min-width: 0`과 내부 overflow를 사용해 본문 전체의 의도하지 않은 가로 스크롤을 방지한다.

- [ ] **Step 3: Playground 테스트 재실행**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
Expected: row-height 옵션 변경과 Playground 렌더링 테스트가 통과한다.

### Task 5: 문서 페이지 셸과 라우팅 구현

**Files:**

- Create: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx`
- Create: `frontend/src/pages/f1-grid-docs/F1GridDocsPage.css`
- Modify: `frontend/src/routes/AppRouter.tsx`
- Modify: `frontend/src/pages/dashboard/components/DashboardContent.tsx`
- Modify: `frontend/src/pages/dashboard/data/adminUserMenus.json`
- Modify: `frontend/src/pages/dashboard/services/dashboardData.tsx`

- [ ] **Step 1: 페이지 셸 구현**

`F1GridDocsPage`는 selected document state, 모바일 메뉴 open state, breadcrumb, 고정 사이드바, 본문, Playground를 조립한다. `initialDocumentId` prop을 지원해 테스트와 내부 메뉴에서 기본 문서를 지정할 수 있게 한다. 문서가 없으면 `overview`로 fallback한다.

- [ ] **Step 2: 공개 라우트 추가**

`AppRouter`에서 `/f1-grid-docs`를 `ProtectedRoute` 바깥에 배치해 로그인 없이 `F1GridDocsPage`를 렌더링한다. 기존 `/dashboard/*`와 wildcard redirect의 동작은 유지한다.

- [ ] **Step 3: 내부 메뉴 연결**

대시보드의 메뉴 데이터에 `f1-grid-docs` page key를 추가하고 `DashboardContent`에서 해당 key를 만나면 `F1GridDocsPage`를 렌더링한다. 기존 `f1-grid-test` 메뉴와 페이지는 삭제하지 않는다.

- [ ] **Step 4: 페이지 테스트 실행**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
Expected: 신규 문서 포털 테스트 전체 PASS.

### Task 6: TDD 리팩터링과 회귀 검증

**Files:**

- Modify: files created in Tasks 2-5 only

- [ ] **Step 1: 중복 및 타입 정리**

문서 조회 함수, Playground 공통 샘플 컬럼, CSS breakpoint를 중복 없이 정리한다. 공개 컴포넌트의 props와 기존 F1-Grid 타입을 변경하지 않는다.

- [ ] **Step 2: 신규 및 기존 테스트 실행**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
Run: `cd frontend; npm run test -- tests/f1-grid.test.tsx`
Expected: 두 명령 모두 PASS.

- [ ] **Step 3: 전체 빌드 실행**

Run: `cd frontend; npm run build`
Expected: TypeScript와 Vite build가 오류 없이 완료.

### Task 7: 실제 브라우저 반응형 검증 및 결과 문서

**Files:**

- Create: `frontend/scripts/capture-f1-grid-docs-portal.js`
- Create: `docs/result/20260903/f1-grid-docs-portal/README.md`
- Create: `docs/result/20260903/f1-grid-docs-portal/screenshots/`

- [ ] **Step 1: 개발 서버 실행**

Run: `cd frontend; npm run dev`
Expected: `http://127.0.0.1:4173`에서 Vite 서버가 실행.

- [ ] **Step 2: Playwright 검증**

공개 URL `/f1-grid-docs`에서 1280px, 768px, 375px를 캡처하고 다음을 확인한다.

```js
await page.goto(`${baseUrl}/f1-grid-docs`);
await expect(page.getByRole('heading', { name: 'F1-Grid' })).toBeVisible();
await page.getByRole('button', { name: 'Editing' }).click();
await expect(page.getByTestId('f1-grid-doc-playground')).toBeVisible();
```

사이드바 접힘, 문서 전환, Playground 옵션 변경, 코드 복사 상태를 확인하고 스크린샷을 결과 폴더에 저장한다.

- [ ] **Step 3: 결과 문서 작성**

결과 문서에 구현 범위, 검증 명령 결과, 공개 URL, 캡처 뷰포트, 알려진 제한사항(임의 코드 실행 미지원)을 기록한다.

---

## Plan Self-Review

- 공개 URL, 내부 메뉴, 정적 문서, 코드 복사, 옵션 기반 Playground, 반응형 기준을 Tasks 2-7에서 모두 다룬다.
- DB와 백엔드 변경은 요구사항에서 제외했으며 관련 파일/스크립트를 계획하지 않았다.
- `TBD`, `TODO`, vague placeholder를 사용하지 않았다.
- 테스트는 페이지 직접 렌더링으로 공개 라우트의 인증 의존성을 분리하고, 라우팅 연결은 빌드와 브라우저 검증에서 확인한다.

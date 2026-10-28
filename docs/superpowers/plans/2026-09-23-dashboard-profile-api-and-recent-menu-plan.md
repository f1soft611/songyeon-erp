# Dashboard Profile API and Recent Menu UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing authenticated menu response with dynamic user profile data and refine the AppBar profile popover and sidebar recent-menu presentation.

**Architecture:** Reuse `GET /api/v1/menus/my` instead of creating a new profile endpoint. Add nullable display claims to JWT, restore them into the authenticated `LoginVO`, pass them through `MyMenuResponseVO.UserSummary`, and let `DashboardPage` render profile data with fallbacks. Keep recent-menu persistence and routing unchanged while improving only its sidebar presentation.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot/eGovFrame, JWT, MyBatis XML, Maven.

---

### Task 1: Lock the API contract in tests and types

**Files:**

- Modify: `frontend/src/pages/dashboard/types/dashboard.ts`
- Modify: `frontend/src/pages/dashboard/services/menuService.ts`
- Test: `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Extend the frontend user response type**

Add optional nullable fields to `UserMenuResponse.user`: `name`, `email`, `profileImage`, `groupName`, and `roleName`. Keep `userId` and `roles` required because existing menu routing uses them.

- [ ] **Step 2: Add a focused failing UI contract test**

Render the dashboard with the existing mocked menu response extended with user profile data. Assert the profile trigger opens a menu containing the returned name, email, and group/role label rather than a hard-coded `A` or `관리자`.

- [ ] **Step 3: Run the focused test**

Run from `frontend`:

```powershell
npx vitest run tests/dashboard-sidebar.test.tsx -t "dynamic profile"
```

Expected: FAIL because the current dashboard does not retain or render profile fields.

---

### Task 2: Extend backend authenticated profile data

**Files:**

- Modify: `backend/src/main/java/egovframework/com/jwt/EgovJwtTokenUtil.java`
- Modify: `backend/src/main/java/egovframework/com/jwt/JwtAuthenticationFilter.java`
- Modify: `backend/src/main/java/egovframework/let/system/menus/domain/model/MyMenuResponseVO.java`
- Modify: `backend/src/main/java/egovframework/let/system/menus/service/SystemMenuService.java`
- Modify: `backend/src/main/java/egovframework/let/system/menus/service/impl/SystemMenuServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/system/menus/controller/MyMenuApiController.java`
- Test: `backend/src/test/java/**` nearest existing JWT/menu controller test location

- [ ] **Step 1: Add nullable profile claims to access and refresh JWTs**

Include only `name`, `email`, `profileImage`, `groupNm`, and `roleCode`-compatible display data already present in `LoginVO`. Do not include password, signature image, stamp image, or other sensitive fields.

- [ ] **Step 2: Restore new claims in JWT authentication**

When building the authenticated `LoginVO`, read the new claims defensively so old tokens without them continue to authenticate with null display values.

- [ ] **Step 3: Expand `UserSummary`**

Add nullable fields with schema descriptions for `name`, `email`, `profileImage`, `groupName`, and `roleName`.

- [ ] **Step 4: Pass principal display data into the menu service response**

Update the service/controller boundary so `getMyMenuTree` receives the authenticated display values or a small profile object. Populate `UserSummary` while preserving existing user ID and role code behavior.

- [ ] **Step 5: Add or update a backend test**

Verify that a valid authenticated user produces the expanded summary and that missing optional claims do not fail the response.

- [ ] **Step 6: Run the focused backend test**

Run from `backend` using Java 8-compatible test syntax:

```powershell
mvn "-Dtest=MyMenuApiControllerTest" test
```

Use the nearest existing test class name if the repository uses a different menu controller test. Expected: PASS.

---

### Task 3: Connect dynamic profile data to the dashboard UI

**Files:**

- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/pages/dashboard/components/DashboardSidebar.tsx` only if prop forwarding is needed
- Modify: `frontend/src/pages/dashboard/services/menuService.ts`
- Test: `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Retain the `user` profile from `fetchMyMenus`**

Add dashboard state for the optional profile summary and set it from the menu response without blocking module/menu rendering when the fields are absent.

- [ ] **Step 2: Replace hard-coded profile values**

Use `profileImage` when present, otherwise derive the first visible character from `name` or `userId`. Display `name`, `email`, and `groupName`/`roleName` with fallbacks.

- [ ] **Step 3: Preserve existing actions**

Keep `내 정보 관리`, `보안 설정`, and `로그아웃` action behavior wired to the existing handlers. Do not move the profile control back into the module rail.

- [ ] **Step 4: Run the focused frontend test**

Run:

```powershell
npx vitest run tests/dashboard-sidebar.test.tsx -t "dynamic profile"
```

Expected: PASS.

---

### Task 4: Refine the profile popover visual design

**Files:**

- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Test: `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Add profile header layout**

Use a compact MUI `Popover`/`Menu`-compatible surface with avatar, name, role/group, and email. Match the supplied reference with a white/dark themed card, rounded corners, subtle border/shadow, and an internal divider.

- [ ] **Step 2: Add action icons and hierarchy**

Use existing MUI icons for profile management, security, and logout actions. Keep labels readable and make the entire row keyboard accessible.

- [ ] **Step 3: Add responsive anchoring**

Anchor to the AppBar avatar at bottom-right and transform from top-right, constrain width on small screens, and avoid viewport overflow.

- [ ] **Step 4: Run the focused dashboard tests**

Run:

```powershell
npx vitest run tests/dashboard-sidebar.test.tsx -t "profile|sidebar footer"
```

Expected: PASS.

---

### Task 5: Refine the recent-menu sidebar area

**Files:**

- Modify: `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`
- Test: `frontend/tests/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Improve section header**

Show `최근 사용` with a compact count indicator, preserving the lower sidebar placement and theme colors.

- [ ] **Step 2: Improve recent item rows**

Render menu label as the primary line and module label as secondary metadata. Add a stable leading visual marker, compact padding, ellipsis, hover, focus-visible, and selected states. Keep click behavior bound to `onRecentMenuSelect(item.path)`.

- [ ] **Step 3: Preserve empty state and constraints**

Keep the empty message, maximum five entries, order, duplicate removal, and sessionStorage logic unchanged.

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npx vitest run tests/dashboard-sidebar.test.tsx -t "recent menu"
```

Expected: PASS.

---

### Task 6: Verify the complete change and document the result

**Files:**

- Create: `docs/result/20260923/dashboard-profile-api-recent-menu/README.md`
- Create: `docs/result/20260923/dashboard-profile-api-recent-menu/screenshots/` when browser capture is available

- [ ] **Step 1: Run frontend verification**

```powershell
cd frontend
npm run build
npx vitest run tests/dashboard-sidebar.test.tsx
```

Record any unrelated pre-existing test failures separately from failures caused by this change.

- [ ] **Step 2: Run backend verification**

```powershell
cd backend
mvn test
```

- [ ] **Step 3: Verify responsive rendering**

Use the existing dev-server/browser workflow at 375px, 768px, and 1280px. Confirm the profile popover stays within the viewport and the recent-menu rows do not overlap or introduce page-level horizontal scrolling.

- [ ] **Step 4: Write the result document**

Record changed files, API response fields, fallback behavior, test commands/results, and any browser screenshots. Do not include tokens, credentials, or personal data.

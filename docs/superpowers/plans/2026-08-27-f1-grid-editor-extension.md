# F1-GRID Editor Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** F1-GRID를 책임별 모듈로 분리하고 date/select 에디터와 행별 편집 제어를 제공한다.

**Architecture:** `core/F1Grid`가 상태와 ref를 조합한다. `editing`은 표시값과 에디터를 분리하고, `selection`, `keyboard`, `utils`, `types`는 순수 판정과 공통 계약을 제공한다. API 옵션 조회는 소비자 서비스가 수행한다.

**Tech Stack:** React 19, TypeScript, MUI 9, Vitest, Testing Library

---

### Task 1: Editor contract tests

**Files:**

- Create: `frontend/src/shared/components/f1-grid/types/f1Grid.types.ts`
- Modify: `frontend/tests/f1-grid.test.tsx`

- [ ] 날짜 입력, select의 label/value 저장, 행별 읽기 전용을 검증하는 실패 테스트를 작성한다.
- [ ] `npm exec vitest run tests/f1-grid.test.tsx`를 실행하여 새 동작 부재로 실패를 확인한다.
- [ ] `F1GridOption`, `date`, `select`, Boolean 또는 predicate `editable` 계약을 정의한다.

### Task 2: Module extraction and editors

**Files:**

- Create: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Create: `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`
- Create: `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- Create: `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- Create: `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- Create: `frontend/src/shared/components/f1-grid/editing/CellEditor.tsx`
- Create: `frontend/src/shared/components/f1-grid/editing/TextEditor.tsx`
- Create: `frontend/src/shared/components/f1-grid/editing/NumberEditor.tsx`
- Create: `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`
- Create: `frontend/src/shared/components/f1-grid/editing/SelectEditor.tsx`
- Create: `frontend/src/shared/components/f1-grid/selection/gridSelection.ts`
- Create: `frontend/src/shared/components/f1-grid/keyboard/gridKeyboard.ts`
- Create: `frontend/src/shared/components/f1-grid/utils/f1Grid.utils.ts`
- Modify: `frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx`

- [ ] 기존 상태와 ref 조합을 `core/F1Grid.tsx`로 이동한다.
- [ ] 헤더, 본문, 행, 셀, 에디터, 선택, 키보드, 공통 계산을 각 모듈로 위임한다.
- [ ] date에는 `input[type=date]`, select에는 MUI Select를 사용하고 비편집 상태에서는 옵션 label을 표시한다.
- [ ] 편집 시작과 checkbox 변경 전 Boolean/predicate 편집 가능 여부를 확인한다.
- [ ] 메뉴관리 import를 새 core 컴포넌트로 변경한다.
- [ ] `npm exec vitest run tests/f1-grid.test.tsx`가 통과하는지 확인한다.

### Task 3: Verify and document

**Files:**

- Modify: `docs/spec/20260827/20260827_009_F1-GRID_입력코어_사양.md`
- Modify: `docs/result/20260827/f1-grid-input-core/20260827_009_F1-GRID_입력코어_결과.md`

- [ ] Git Bash에서 `npm run build`, `npm run test`를 실행한다.
- [ ] 지원 타입, 옵션 주입 책임, 조건부 편집, 변경 경로, 검증 결과를 기록한다.

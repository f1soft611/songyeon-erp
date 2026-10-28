# F1-GRID Row Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compact ellipsis display and Excel-like per-row height resizing with wrapping to the reusable F1-GRID.

**Architecture:** Keep row-height ownership in `core/F1Grid.tsx`, pass a row-id keyed height map through `GridBody` and `GridRow`, and keep cell overflow styling in `GridCell`. Use a small pure utility for clamping and keyboard increments so behavior is testable without a browser; pointer interaction remains in the row component.

**Tech Stack:** React 19, TypeScript, MUI 9, Vitest, Testing Library, Vite.

---

## Files and responsibilities

- Modify `frontend/src/shared/components/f1-grid/types/grid.types.ts`: add `wrapText` and row-resize props/types.
- Create `frontend/src/shared/components/f1-grid/layout/GridRowHeight.ts`: clamp and keyboard-step helpers.
- Modify `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: own normalized height settings and row-height state; pass callbacks.
- Modify `frontend/src/shared/components/f1-grid/core/GridBody.tsx`: build explicit per-row CSS grid tracks and pass height data.
- Modify `frontend/src/shared/components/f1-grid/core/GridRow.tsx`: apply row height and render pointer/keyboard resize handle.
- Modify `frontend/src/shared/components/f1-grid/core/GridCell.tsx`: apply ellipsis/wrapping display policy and title for full text.
- Modify `frontend/src/shared/components/f1-grid/index.ts`: export layout helpers.
- Modify `frontend/tests/f1-grid.test.tsx`: add pure helper and interaction regression tests.
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`: document row-height and text display API.
- Create `docs/result/20260828/f1-grid-row-height/20260828_004_F1-GRID_행높이조절_결과.md`: record validation commands and result evidence.

### Task 1: Define and test row-height rules

**Files:**
- Create: `frontend/src/shared/components/f1-grid/layout/GridRowHeight.ts`
- Modify: `frontend/src/shared/components/f1-grid/index.ts`
- Test: `frontend/tests/f1-grid.test.tsx`

- [ ] **Step 1: Add failing tests**

Add a `describe('F1-GRID row height')` block asserting:

```ts
expect(clampGridRowHeight(12, 40, 300)).toBe(40);
expect(clampGridRowHeight(420, 40, 300)).toBe(300);
expect(getGridRowHeightByKey(40, 'ArrowDown', 40, 300, 4)).toBe(44);
expect(getGridRowHeightByKey(40, 'ArrowUp', 40, 300, 4)).toBe(40);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run from WSL/Git Bash:

```bash
cd /mnt/d/f1soft/dev/react/S-ERP/frontend
npm exec -- vitest run tests/f1-grid.test.tsx
```

Expected: FAIL because the layout helpers are not exported.

- [ ] **Step 3: Implement the pure helpers**

Implement `clampGridRowHeight(value, min, max)` with normalized bounds and `getGridRowHeightByKey(current, key, min, max, step)` returning a clamped `ArrowUp`/`ArrowDown` value or the current value for other keys. Export both through `f1-grid/index.ts`.

- [ ] **Step 4: Re-run the focused test**

Expected: PASS for the new row-height helper tests and no regression in the existing file.

### Task 2: Add public contracts and state ownership

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

- [ ] **Step 1: Add the contract before implementation tests**

Add `wrapText?: boolean` to `F1GridColumn<T>`. Add these props to `F1GridProps<T>`:

```ts
rowHeight?: number;
minRowHeight?: number;
maxRowHeight?: number;
resizableRows?: boolean;
```

- [ ] **Step 2: Normalize settings and store heights**

Use defaults `40`, `40`, `300`, and `true`. Normalize `minRowHeight` and `maxRowHeight` so the maximum is never below the minimum. Keep `rowHeights` as `Record<string, number>` keyed by `String(rowId)`, and provide a callback that clamps every update before storing it.

- [ ] **Step 3: Pass the layout contract to `GridBody`**

Pass `defaultRowHeight`, `minRowHeight`, `maxRowHeight`, `rowHeights`, `resizableRows`, and the row-height update callback. Do not alter selection, editing, clipboard, or row-state operations.

### Task 3: Render explicit row tracks and resize handles

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridRow.tsx`

- [ ] **Step 1: Add interaction tests**

Render two rows with `resizableRows` and a long `wrapText` column. Assert two handles exist, the first handle has `aria-valuenow="40"`, ArrowDown changes it to `44` without changing the second handle, and a pointer move updates only the first row while respecting `maxRowHeight`.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```bash
cd /mnt/d/f1soft/dev/react/S-ERP/frontend
npm exec -- vitest run tests/f1-grid.test.tsx
```

Expected: FAIL because resize handles and row-height props do not exist yet.

- [ ] **Step 3: Use explicit CSS Grid tracks**

In `GridBody`, build `gridTemplateRows` from `rowHeights` with the default fallback, and keep the selection column plus configured column widths unchanged. Pass `rowHeight`, min/max bounds, and the update callback to each `GridRow`.

- [ ] **Step 4: Implement the handle behavior**

In `GridRow`, render a bottom-positioned `button` only when `resizableRows` is true. On `pointerdown`, prevent propagation, capture the pointer, and calculate `startHeight + (clientY - startClientY)`; clamp before calling the parent callback. On `keydown`, prevent default for ArrowUp/ArrowDown and apply a 4px step. Set `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` from the current row height.

- [ ] **Step 5: Re-run the focused tests**

Expected: PASS for drag, keyboard, clamping, and per-row isolation.

### Task 4: Apply ellipsis and wrapping in cells

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- Modify: `frontend/tests/f1-grid.test.tsx`

- [ ] **Step 1: Add display-policy tests**

Assert a long cell has `title` equal to the full value and a display wrapper with `whiteSpace: nowrap` at the default height. Resize that row above 40 and assert a `wrapText` column changes to `whiteSpace: normal` while a non-wrapping column stays `nowrap`.

- [ ] **Step 2: Run the focused tests and confirm failure**

Expected: FAIL because displayed values are currently direct text nodes without overflow policy or title.

- [ ] **Step 3: Add a display wrapper**

Wrap only non-editing, non-checkbox display values in a block-level element with `minWidth: 0`, `overflow: hidden`, `textOverflow: ellipsis`, and `whiteSpace` determined by `column.wrapText && rowHeight > defaultRowHeight`. Set `overflowWrap: anywhere` when wrapping and `title` to the full display value. Preserve alignment and editor layout on the outer cell.

- [ ] **Step 4: Re-run the focused tests**

Expected: PASS with existing editor, merge, alignment, and error tests.

### Task 5: Update guide, result record, and validate the slice

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20260828/f1-grid-row-height/20260828_004_F1-GRID_행높이조절_결과.md`

- [ ] **Step 1: Document the new API and interaction**

Add the row-height props, `wrapText`, defaults, ellipsis behavior, resize-handle keyboard behavior, bounds, and the fact that heights are runtime-only and not persisted.

- [ ] **Step 2: Run the focused test**

```bash
cd /mnt/d/f1soft/dev/react/S-ERP/frontend
npm exec -- vitest run tests/f1-grid.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run the complete frontend validation**

```bash
cd /mnt/d/f1soft/dev/react/S-ERP/frontend
npm run test
npm run build
```

Expected: all Vitest tests pass and TypeScript/Vite build exits successfully.

- [ ] **Step 4: Record evidence**

Write the actual command outcomes, changed files, and any screenshot limitation in the result document. Do not claim a screenshot was captured unless a browser validation produced one.

## Self-review

- Spec coverage: public props, row-local state, pointer drag, keyboard resize, clamping, ellipsis, wrapping, title accessibility, existing behavior preservation, tests, guide, and result record are covered by Tasks 1-5.
- Placeholder scan: no implementation step depends on TBD/TODO or unspecified behavior.
- Type consistency: row IDs are normalized to strings for height maps; all height callbacks use one numeric height contract and the helper uses the same min/max/step values.
- Scope: no backend, database, external grid library, persistence, or unrelated page changes are included.


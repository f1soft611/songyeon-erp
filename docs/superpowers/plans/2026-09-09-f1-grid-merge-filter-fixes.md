# F1-Grid Merge and Filter Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the bottom boundary of merged cells and keep column filter menus anchored to the selected header button.

**Architecture:** Keep the existing CSS grid and MUI `Menu` architecture. Make the merged start cell render its span boundary, and preserve the header menu button as the filter menu anchor instead of the transient menu item.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

### Task 1: Merge Span Bottom Boundary

**Files:**

- Modify: `frontend/tests/f1-grid.test.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridCell.tsx`

- [x] **Step 1: Write the failing test**

Render a two-row `mergeRows` column, locate the first cell, and assert its computed MUI style contains a 1px bottom border.

```tsx
expect(mergedCell).toHaveStyle({ borderBottom: '1px solid' });
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/f1-grid.test.tsx -t "renders a bottom boundary for a merged span"`

Expected: FAIL because the merged start cell is not the grid's final row and currently receives `borderBottom: 0`.

- [x] **Step 3: Write minimal implementation**

Make the existing `borderBottom` condition render `1` when the cell is a visible merged start cell, while retaining the current last-row behavior for other cells.

```tsx
borderBottom: isLastRow || (merged && mergeInfo?.isStart) ? 1 : merged ? 0 : undefined,
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/f1-grid.test.tsx -t "row merge"`

Expected: PASS, including existing parent merge group tests.

### Task 2: Stable Column Filter Anchor

**Files:**

- Modify: `frontend/tests/f1-grid.test.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`

- [x] **Step 1: Write the failing test**

Open a column menu, click `필터`, and assert the rendered filter menu uses a still-mounted header menu button as its anchor rather than the clicked `MenuItem`.

```tsx
expect(filterMenu).toHaveAttribute('data-anchor-column', 'code');
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/f1-grid.test.tsx -t "anchors the column filter menu to its header button"`

Expected: FAIL because `openFilterPopover` assigns its transient menu item to `filterAnchor`.

- [x] **Step 3: Write minimal implementation**

Store the header menu button supplied to `openColumnMenu` and assign it to `filterAnchor` when opening the filter.

```tsx
setMenuAnchor(event.currentTarget);
setFilterAnchor(event.currentTarget);
```

Clear the stored filter anchor whenever `closeMenus` runs.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/f1-grid.test.tsx -t "column filter"`

Expected: PASS with the filter popover anchored to the matching header button.

### Task 3: Documentation and Browser Validation

**Files:**

- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20260909/f1grid-merge-filter-position-fix/README.md`
- Create: `docs/result/20260909/f1grid-merge-filter-position-fix/screenshots/desktop.png`

- [x] **Step 1: Document the behavior**

Add concise Row Merge and column filter notes documenting that a merged range draws its lower boundary and that a filter is positioned under its source header button.

- [x] **Step 2: Run focused validation**

Run: `npx vitest run tests/f1-grid.test.tsx -t "row merge|column filter"`

Expected: PASS.

- [x] **Step 3: Run build validation**

Run: `npm run build`

Expected: PASS with TypeScript and Vite build success.

- [ ] **Step 4: Capture browser evidence**

Use the existing F1-Grid capture script pattern to navigate through the UI, open a filter menu, and save the desktop screenshot in the result directory.

- [x] **Step 5: Record results**

Document the reported symptoms, root causes, code changes, regression tests, build result, and screenshot location in the result README.

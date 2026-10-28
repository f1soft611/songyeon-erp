# F1-Grid/F1-Tree Row Form Modal Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in F1-Grid/F1-Tree row form modal plugin that derives typed fields and sections from existing column definitions while preserving all behavior when absent.

**Architecture:** Keep the synthetic action column outside `F1GridColumn<T>` and row data. Build form metadata with a pure mapper, render typed fields in a dedicated modal, and apply accepted drafts through existing `addGridRow` and `updateGridRow` state transitions.

**Tech Stack:** React 19, TypeScript 6, MUI 9, Vitest, Testing Library, Playwright

---

## Global Constraints

- Work in the current `socra710` checkout; do not create a worktree.
- Preserve unrelated changes in `frontend/src/pages/dashboard/DashboardPage.tsx` and `frontend/src/pages/dashboard/services/menuService.ts`.
- Follow [the approved spec](../../spec/20260910/20260910_001_f1grid_tree_form_modal_plugin_사양서.md).
- Use `rowFormPlugin` as the only activation switch. No plugin means no action column, modal, or changed add behavior.
- Use `margin="none"` for every MUI `TextField` in the grid modal.
- Do not add API, backend, database, or server-save behavior.
- Baseline is red before this work: `f1-grid.test.tsx` has an unterminated string near line 834, one F1-Tree menu assertion fails, and the full suite has 55 failures. Record these separately; do not claim they were introduced by this feature without comparison evidence.
- After the first implementation edit, immediately run the narrow Task 1 test before any further implementation.
- Each task receives specification compliance review and code quality review before the next task.

## Interfaces

Define these names once in `frontend/src/shared/components/f1-grid/types/grid.types.ts` and reuse them exactly:

```ts
export type F1GridFormMode = 'create' | 'edit';

export type F1GridColumnFormOptions<T extends object> = {
  hidden?: boolean;
  readOnly?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  label?: string;
  group?: string;
  order?: number;
  span?: 1 | 2 | 3;
};

export type F1GridRowFormContext<T extends object> = {
  mode: F1GridFormMode;
  row: T;
};

export type F1GridRowFormApplyContext<T extends object> = {
  mode: F1GridFormMode;
  originalRow?: T;
  draftRow: T;
};

export type F1GridRowFormPlugin<T extends object> = {
  id?: string;
  enabled?: boolean;
  getTitle?: (context: F1GridRowFormContext<T>) => string;
  getDescription?: (context: F1GridRowFormContext<T>) => string;
  onBeforeApply?: (context: F1GridRowFormApplyContext<T>) => boolean | void;
};
```

Add `form?: F1GridColumnFormOptions<T>` to `F1GridColumn<T>` and `rowFormPlugin?: F1GridRowFormPlugin<T>` to `F1GridProps<T>`.

## Task 1: Public Types And Pure Form Model

**Files:**

- Create: `frontend/src/shared/components/f1-grid/form/GridFormModel.ts`
- Create: `frontend/tests/f1-grid-form-modal.test.tsx`
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Modify: `frontend/src/shared/components/f1-grid/index.ts`

- [ ] **Step 1: Write the failing form-model test**

Add a test that imports `buildGridFormSections`, passes columns containing `headerGroup`, an ungrouped column, `hidden: true`, `form.hidden: false`, `form.group`, `form.order`, and `rownumber`, then asserts this exact section shape:

```ts
expect(buildGridFormSections(columns)).toEqual([
  { label: 'Override', fields: [expect.objectContaining({ field: 'active' })] },
  {
    label: '기본 정보',
    fields: [expect.objectContaining({ field: 'memo' })],
  },
  {
    label: 'Basic',
    fields: [
      expect.objectContaining({ field: 'code', span: 1 }),
      expect.objectContaining({ field: 'secret' }),
    ],
  },
]);
```

- [ ] **Step 2: Run RED for the pure model**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "builds form sections"`

Expected: FAIL because `GridFormModel` and public form types do not exist.

- [ ] **Step 3: Add the public interfaces**

Add the exact types from `Interfaces`, `F1GridColumn<T>.form`, and `F1GridProps<T>.rowFormPlugin`. Export them through the existing wildcard export in `index.ts`; do not create a second alias.

- [ ] **Step 4: Implement the minimum pure mapper**

Create `buildGridFormSections<T>(columns)` returning fields with `column`, `field`, `label`, `group`, `order`, and `span`. Exclude `rownumber` and default-hidden columns, let `form.hidden === false` override `hidden`, use group priority `form.group`, `headerGroup`, `기본 정보`, and stably sort by `form.order ?? sourceIndex`.

- [ ] **Step 5: Run GREEN for the pure model**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "builds form sections"`

Expected: PASS, one matching test.

- [ ] **Step 6: Add read-only resolution tests and implementation**

Test and implement `isGridFormFieldReadOnly(column, row, mode)` using `form.readOnly`, then `editable`, then the existing `isCellEditable` checkbox default.

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "form model"`

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```powershell
git add frontend/src/shared/components/f1-grid/types/grid.types.ts frontend/src/shared/components/f1-grid/form/GridFormModel.ts frontend/src/shared/components/f1-grid/index.ts frontend/tests/f1-grid-form-modal.test.tsx
git commit -m "feat(f1-grid): define row form plugin model"
```

## Task 2: Typed Modal Fields And Validation

**Files:**

- Create: `frontend/src/shared/components/f1-grid/form/GridFormField.tsx`
- Modify: `frontend/tests/f1-grid-form-modal.test.tsx`

- [ ] **Step 1: Write failing typed-field tests**

Render `GridFormField` for text, number, checkbox, select, autocomplete, date, datetime, time, currency, decimal, and code columns. Assert number values emit numbers, checkbox emits booleans, select preserves the option value type, every text-field root lacks `MuiFormControl-marginNormal`, and code picker merges a multi-field patch.

- [ ] **Step 2: Run RED for typed fields**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "typed form field"`

Expected: FAIL because `GridFormField` does not exist.

- [ ] **Step 3: Implement basic and numeric fields**

Use MUI `TextField margin="none"`, `Checkbox`, and input types appropriate to each column. Preserve empty numeric values as `''`; emit finite non-empty numeric values as `number`.

- [ ] **Step 4: Implement option fields**

Use MUI `Select` and `Autocomplete` with `F1GridOption`. Pass `option.value` unchanged instead of stringifying it.

- [ ] **Step 5: Implement temporal and code fields**

Use the existing normalized string contracts for date, datetime, and time. For `code`, render a read-only value and an icon button that calls `onOpenCodePicker(draftRow, applyPatch)` and merges both callback and returned patches.

- [ ] **Step 6: Run GREEN for typed fields**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "typed form field"`

Expected: all matching tests PASS.

- [ ] **Step 7: Commit Task 2**

```powershell
git add frontend/src/shared/components/f1-grid/form/GridFormField.tsx frontend/tests/f1-grid-form-modal.test.tsx
git commit -m "feat(f1-grid): render typed modal fields"
```

## Task 3: Responsive Form Modal

**Files:**

- Create: `frontend/src/shared/components/f1-grid/form/F1GridFormModal.tsx`
- Modify: `frontend/tests/f1-grid-form-modal.test.tsx`

- [ ] **Step 1: Write failing modal structure tests**

Render a modal with grouped columns and assert `role="dialog"`, title linkage, `기본 정보` and grouped headings, ordered labels, cancel/apply buttons, validation helper text, and the final-save guidance.

- [ ] **Step 2: Run RED for the modal**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "row form modal"`

Expected: FAIL because `F1GridFormModal` does not exist.

- [ ] **Step 3: Implement modal state boundaries**

Accept `open`, `mode`, `row`, `originalRow`, `columns`, `rowKey`, `plugin`, `onCancel`, and `onApply`. Clone the incoming row into local draft whenever a new modal session opens; never mutate the input row.

- [ ] **Step 4: Implement sections and responsive layout**

Use MUI `Dialog`, `DialogTitle`, `DialogContent`, and `DialogActions`; `useMediaQuery(theme.breakpoints.down('sm'))` controls `fullScreen`. Use CSS grid with 3 columns at `lg`, 2 at `sm`, and 1 below `sm`; clamp field span to available columns.

- [ ] **Step 5: Implement validation and apply guard**

Call `validateGridRow(draftRow, includedColumns)`, keep the modal open on errors, focus the first invalid field, then call `plugin.onBeforeApply`. Only call `onApply` if both checks permit it.

- [ ] **Step 6: Apply theme and accessibility contract**

Use only MUI theme tokens, 6px section radius, fixed header/actions, scrollable content with `maxHeight: '85vh'`, Tooltip labels on icon buttons, `aria-invalid`, and `aria-describedby`.

- [ ] **Step 7: Run GREEN for modal tests**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "row form modal"`

Expected: all matching tests PASS.

- [ ] **Step 8: Commit Task 3**

```powershell
git add frontend/src/shared/components/f1-grid/form/F1GridFormModal.tsx frontend/tests/f1-grid-form-modal.test.tsx
git commit -m "feat(f1-grid): add responsive row form modal"
```

## Task 4: Grid Action Column And State Integration

**Files:**

- Create: `frontend/src/shared/components/f1-grid/form/GridFormActionCell.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- Modify: `frontend/src/shared/components/f1-grid/columns/GridColumnPin.ts`
- Modify: `frontend/tests/f1-grid-form-modal.test.tsx`

- [ ] **Step 1: Write failing opt-in and action tests**

Assert no `상세` header without the plugin, no header when `enabled: false`, one `상세` header with the enabled plugin, and an `${rowId} 행 정보 수정` button per visible row.

- [ ] **Step 2: Run RED for action integration**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx -t "action column"`

Expected: FAIL because F1Grid ignores `rowFormPlugin`.

- [ ] **Step 3: Add the synthetic track and header**

Append `48px` to `columnTracks` only when active. Render a sticky right `상세` header outside the `columns.map` path so it cannot sort, filter, resize, reorder, export, or enter clipboard ranges.

- [ ] **Step 4: Add row action cells**

Pass `showRowFormAction` and `onOpenRowForm` through `GridBody` and `GridRow`. Render `GridFormActionCell` after data cells, stop event propagation, and keep its grid row aligned with the source row.

- [ ] **Step 5: Offset existing right-pinned columns**

Add an optional trailing offset to `getGridColumnPinOffsets`; pass 48 only while the plugin is active. Add a unit assertion that the rightmost pinned data column receives offset 48.

- [ ] **Step 6: Write failing draft lifecycle tests**

Assert edit cancel leaves `getRows()` and `getChanges()` unchanged, edit apply adds only the changed row to `updatedRows`, add cancel leaves `insertedRows` empty, and add apply creates one inserted row.

- [ ] **Step 7: Implement F1Grid modal sessions**

Store `{ mode, draftRow, originalRow? }` in F1Grid. Open edit from an action row copy. When active, make `handleAddRow(partial?)` open a create draft from `{ ...createRow(), ...partial }`; retain immediate add when inactive.

- [ ] **Step 8: Apply drafts through GridState**

For edit, compute changed fields with `areGridValuesEqual` and call `updateGridRow` once; close without update when empty. For create, reject duplicate row keys with a field error and call `addGridRow` only after accepted apply.

- [ ] **Step 9: Run GREEN for grid integration**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx`

Expected: all tests in the new file PASS.

- [ ] **Step 10: Commit Task 4**

```powershell
git add frontend/src/shared/components/f1-grid/form/GridFormActionCell.tsx frontend/src/shared/components/f1-grid/core/F1Grid.tsx frontend/src/shared/components/f1-grid/core/GridHeader.tsx frontend/src/shared/components/f1-grid/core/GridBody.tsx frontend/src/shared/components/f1-grid/core/GridRow.tsx frontend/src/shared/components/f1-grid/columns/GridColumnPin.ts frontend/tests/f1-grid-form-modal.test.tsx
git commit -m "feat(f1-grid): integrate row form modal"
```

## Task 5: F1-Tree Integration And Compatibility

**Files:**

- Modify: `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`
- Modify: `frontend/tests/f1-tree.test.tsx`
- Modify: `frontend/tests/f1-grid.test.tsx`

- [ ] **Step 1: Repair the baseline syntax blocker only**

Inspect the unterminated string near `frontend/tests/f1-grid.test.tsx:834`, make the smallest syntax-only correction, and run:

`cd frontend; npm run test -- tests/f1-grid.test.tsx -t "the repaired test name"`

Expected: the file parses. Record whether the repaired assertion passes or remains a pre-existing behavioral failure.

- [ ] **Step 2: Write failing F1-Tree modal tests**

Assert `addRow()` opens a root draft, `addChildRow('parent')` opens a draft containing `parentId: 'parent'`, cancel adds nothing, apply adds one child, and tree expand/collapse state remains independent.

- [ ] **Step 3: Run RED for tree integration**

Run: `cd frontend; npm run test -- tests/f1-tree.test.tsx -t "row form modal"`

Expected: FAIL until child apply and parent expansion are connected.

- [ ] **Step 4: Connect parent expansion timing**

Keep the existing `addChildRow` partial patch. Ensure the parent is expanded when a child draft is accepted, not when a canceled modal is opened. Preserve `expandRow`, `collapseRow`, and `isExpanded` semantics.

- [ ] **Step 5: Add plugin-absent compatibility tests**

In grid and tree tests, assert existing `addRow`, `addChildRow`, inline editing, selection, sorting/filtering policy, and context menu behavior when `rowFormPlugin` is absent.

- [ ] **Step 6: Run focused compatibility tests**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx tests/f1-grid.test.tsx tests/f1-tree.test.tsx`

Expected: new modal tests PASS. Any known baseline assertion still failing is listed separately with before/after evidence.

- [ ] **Step 7: Commit Task 5**

```powershell
git add frontend/src/shared/components/f1-grid/tree/F1Tree.tsx frontend/tests/f1-tree.test.tsx frontend/tests/f1-grid.test.tsx
git commit -m "feat(f1-tree): connect row form modal"
```

## Task 6: Documentation Portal And Browser Fixture

**Files:**

- Modify: `frontend/src/pages/f1-grid-docs/types.ts`
- Modify: `frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `frontend/tests/f1-grid-docs.test.tsx`

- [ ] **Step 1: Write the failing docs test**

Assert the portal includes `Row Form Modal`, `rowFormPlugin`, `form.group`, `form.span`, and a Playground entry that renders a `상세` header.

- [ ] **Step 2: Run RED for docs**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx -t "row form modal"`

Expected: FAIL because the document and Playground do not exist.

- [ ] **Step 3: Add the Playground**

Add a demo with `기본 정보` and `운영 정보` header groups, text/number/checkbox/date/select fields, a `createRow` factory, and enabled `rowFormPlugin`. Keep it as the browser capture fixture.

- [ ] **Step 4: Update API and narrative docs**

Document activation, automatic mapping, override precedence, draft/apply behavior, F1-Tree root/child behavior, responsive policy, theme behavior, exclusions, and a complete TypeScript usage example.

- [ ] **Step 5: Run GREEN for docs**

Run: `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

```powershell
git add frontend/src/pages/f1-grid-docs/types.ts frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts frontend/src/pages/f1-grid-docs/F1-GRID.md frontend/tests/f1-grid-docs.test.tsx
git commit -m "docs(f1-grid): document row form modal plugin"
```

## Task 7: Browser Evidence, Verification, And Results

**Files:**

- Create: `frontend/scripts/capture-f1-grid-form-modal.js`
- Create: `docs/result/20260910/f1grid-tree-form-modal-plugin/screenshots/light-1280.png`
- Create: `docs/result/20260910/f1grid-tree-form-modal-plugin/screenshots/dark-1280.png`
- Create: `docs/result/20260910/f1grid-tree-form-modal-plugin/screenshots/light-768.png`
- Create: `docs/result/20260910/f1grid-tree-form-modal-plugin/screenshots/light-375.png`
- Modify: `docs/result/20260910/f1grid-tree-form-modal-plugin/progress.md`
- Create: `docs/result/20260910/f1grid-tree-form-modal-plugin/result.md`

- [ ] **Step 1: Create the Playwright capture script**

Follow existing `frontend/scripts/capture-*.js` login/navigation patterns. Navigate via UI to the F1-Grid docs modal example, switch theme through the real control, open edit modal, and capture 1280px light/dark plus 768px and 375px light states.

- [ ] **Step 2: Start the dev server**

Run asynchronously: `cd frontend; npm run dev -- --no-open`

Expected: Vite reports an available local URL, using a different port if 4173 is occupied.

- [ ] **Step 3: Capture and inspect browser evidence**

Run: `cd frontend; node scripts/capture-f1-grid-form-modal.js`

Expected: four non-empty PNG files. Assert in the script that dialog bounds fit the viewport, `document.documentElement.scrollWidth <= window.innerWidth`, fields are 3/2/1 columns at 1280/768/375, and the dialog is full-screen at 375.

- [ ] **Step 4: Run focused verification**

Run: `cd frontend; npm run test -- tests/f1-grid-form-modal.test.tsx tests/f1-tree.test.tsx tests/f1-grid-docs.test.tsx`

Expected: feature tests PASS; unrelated baseline failures are not mixed into this result.

- [ ] **Step 5: Run build and full-suite verification**

Run: `cd frontend; npm run build`

Expected: exit code 0.

Run: `cd frontend; npm run test`

Expected: compare against baseline `131 passed / 55 failed`; no new failure attributable to this feature. Do not report full-suite success if failures remain.

- [ ] **Step 6: Complete the progress ledger and result document**

Record commands, timestamps, counts, baseline comparison, DB impact `해당 없음`, requirement mapping, screenshot paths, specification review, code-quality review, and unresolved pre-existing failures.

- [ ] **Step 7: Commit Task 7**

```powershell
git add frontend/scripts/capture-f1-grid-form-modal.js docs/result/20260910/f1grid-tree-form-modal-plugin frontend/src/pages/f1-grid-docs/F1-GRID.md
git commit -m "test(f1-grid): verify row form modal plugin"
```

## Review Gates

After every task:

1. Compare changed behavior against the approved spec section for that task.
2. Review only the task diff for unnecessary API surface, mutation, accessibility regressions, and plugin-absent behavior.
3. Fix Critical or Important findings and rerun the same focused command.
4. Record the review verdict in `progress.md` before beginning the next task.
5. Stop after five repair loops and report remaining findings with impact and estimated correction cost.

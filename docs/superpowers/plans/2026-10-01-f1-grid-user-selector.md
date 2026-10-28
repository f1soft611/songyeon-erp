# F1-Grid User Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable F1-Grid `user` column for single/multiple user selection in grid cells and row form modals, then apply it to drafting-form reviewer, approver, and assignee fields.

**Architecture:** Add a typed user option contract and one shared MUI-based picker consumed by both `CellEditor` and `GridFormField`. Carry scalar or array draft values through F1-Grid commit logic while restoring each ID's original string/number type. Extend the existing tenant-scoped drafting-form users endpoint with profile image and active LEVEL label, without changing database schema or saved payloads.

**Tech Stack:** React, TypeScript, MUI, Vitest/Testing Library, Spring MVC, MyBatis XML, JUnit/Mockito.

---

## File Map

- Modify `frontend/src/shared/components/f1-grid/types/grid.types.ts` for `F1GridUserOption`, `user` editor type, and `userOptions`.
- Create `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx` as the shared searchable avatar/list/chip control.
- Modify `frontend/src/shared/components/f1-grid/editing/CellEditor.tsx`, `core/F1Grid.tsx`, and `core/GridCell.tsx` for user editor wiring, scalar/array draft values, label display, type restoration, and no-op dirty handling.
- Modify `frontend/src/shared/components/f1-grid/form/GridFormField.tsx` so form mode uses raw user IDs and the same picker.
- Modify `frontend/src/shared/components/f1-grid/utils/grid.utils.ts` for default user label display.
- Test `frontend/tests/f1-grid.test.tsx` and `frontend/tests/f1-grid-form-modal.test.tsx` for cell and form behavior.
- Modify `backend/src/main/java/egovframework/let/co/workflow/form/domain/model/DraftingWorkUserOptionVO.java` and `backend/src/main/resources/egovframework/mapper/let/co/workflow/form/DraftingWork_SQL_postgresql.xml` to map profile/LEVEL labels.
- Test `backend/src/test/java/egovframework/let/co/workflow/form/controller/DraftingWorkApiControllerTest.java` response serialization and `DraftingWorkServiceImplTest.java` mapper registration.
- Modify `frontend/src/pages/co/workflow/form/types/draftFormManagement.types.ts`, `services/draftFormManagement.service.ts`, and `components/DraftFormGrid.tsx` for options and all three user columns.
- Test `frontend/tests/draft-form-management.test.tsx` for metadata mapping, column configuration, and preserved IDs.
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md`; create result evidence under `docs/result/20261001/f1-grid-user-selector/`.

## Task 1: Lock F1-Grid User Value Behavior With Tests

**Files:** Test `frontend/tests/f1-grid.test.tsx`; test `frontend/tests/f1-grid-form-modal.test.tsx`.

- [x] Add a cell test with a `user` column and options `{ value: 12, label: 'Kim', ... }`; select the option and assert the committed row stores numeric `12` and displays `Kim`.
- [x] Add a multi-cell test with values `['12']` and `['12', '13']`; select another option and assert the draft/commit is an ID array, not a comma-delimited display string.
- [x] Add a no-op cell test that opens and closes an unchanged user editor and asserts `getChanges()` remains empty.
- [x] Add a `GridFormField` test for single `null`, multi `[]`, and existing selected values; assert patch values carry only option IDs.
- [x] Run focused user tests RED/GREEN; the original failures confirmed `user` was unsupported.

## Task 2: Implement the Shared User Picker and F1-Grid Draft Path

**Files:** Modify `grid.types.ts`, `CellEditor.tsx`, `F1Grid.tsx`, `GridCell.tsx`, `GridFormField.tsx`, and `grid.utils.ts`; create `UserSelectEditor.tsx`.

- [x] Add the public option contract:

```ts
export type F1GridUserOption = {
  value: string | number;
  label: string;
  avatarUrl?: string | null;
  positionName?: string | null;
  departmentName?: string | null;
};
```

- [x] Add `user` to `F1GridEditorType`, `userOptions?: F1GridUserOption[]` to `F1GridColumn`, and derive multiplicity from `column.form?.multiple`.
- [x] Implement `UserSelectEditor` with MUI Autocomplete: search labels/position/department, render avatar/name/position/department, fallback initials, selected chips, clear values, and a viewport-aware popup.
- [x] Change edit draft plumbing to support scalar/array user values while retaining string inputs for other editors.
- [x] In `commitEdit`, restore the matching `userOptions[].value` type, call `column.onValueChange`, and skip unchanged scalar/array patches.
- [x] In the form renderer, use raw user field values so display summaries cannot replace selected IDs; preserve required/readOnly/error behavior.
- [x] Run focused cell tests (3 passed) and the complete form-modal suite (43 passed). The unfiltered Grid suite's pre-existing mojibake fixture failures remain out of scope.

## Task 3: Extend Tenant-Scoped User Option Response

**Files:** Modify `DraftingWorkUserOptionVO.java`, `DraftingWork_SQL_postgresql.xml`; test controller/service files listed in the file map.

- [x] Extend the response VO with nullable `profileImage` and `levelNm` properties.
- [x] Add MyBatis result mappings and select `la.profile_image`; left join tenant-matched active LEVEL item/group rows.
- [x] Keep the current active user/login conditions, authenticated tenant input, and stable ordering unchanged.
- [x] Extend controller JSON and mapper-loading coverage for the new response fields/query.
- [x] Run focused backend tests (18 passed) and full backend suite (150 tests, 0 failures/errors, 2 skipped).

## Task 4: Apply User Type to Drafting-Form Columns

**Files:** Modify `draftFormManagement.types.ts`, `draftFormManagement.service.ts`, `DraftFormGrid.tsx`; test `frontend/tests/draft-form-management.test.tsx`.

- [x] Add nullable `profileImage` and `levelNm` to `DraftFormUserOption` and normalize API fields without changing ID conversions.
- [x] Map API users to the common label/avatar/position/department option shape.
- [x] Change reviewer and approver to single `user` options keyed by numeric `loginId`, clearing to null.
- [x] Change assignee to a multiple `user` option keyed by string `userId`, retaining the existing array and summary.
- [x] Remove the assignee edit exclusion while retaining all other row permissions.
- [x] Add API mapping/column/payload tests; related tests pass except the pre-existing soft-delete menu test.

## Task 5: Documentation and Full Verification

**Files:** Update `frontend/src/pages/f1-grid-docs/F1-GRID.md`; create `docs/result/20261001/f1-grid-user-selector/progress.md`, `result.md`, and screenshots.

- [x] Document the `user` type, options, multiplicity, ID values, and display-only metadata.
- [x] Run the frontend build and backend full tests; record unrelated frontend failures separately.
- [x] Verify Grid cell and form picker at 375px, 768px, and 1280px with no popup clipping or page overflow.
- [x] Save viewport screenshots and record focused/full test outcomes in the result files.
- [x] Review scoped changes and preserve user modifications; no commit was requested.

# F1-GRID Initial Design

## Goal

Implement a reusable `F1-GRID` core component for ERP data entry and use it as the menu list in Settings > System Management > Menu Management.

## Scope

The initial release provides the ERP input foundation only.

- Generic column configuration with a stable `rowKey`
- Checkbox row selection, including single, Ctrl multi-select, Shift range-select, and select-all
- Cell focus and keyboard navigation with Arrow keys, Tab, Shift+Tab, Enter, Shift+Enter, F2, Escape, Insert, Delete, and Ctrl+D
- Inline text, number, and checkbox editing
- Row add, delete, restore deleted rows, and duplicate selected rows
- `normal`, `inserted`, `updated`, and `deleted` row states
- Ref API for selected rows, selected row IDs, row mutations, rows, and change sets
- Menu Management integration using existing static menu data

The initial release excludes clipboard actions, sorting, filtering, validation, aggregation, row merge, column layout, server-side querying, pagination, and virtualization. The component boundary must permit those capabilities to be added later.

## Editor Extension Scope

The next release adds `date` and `select` column types, plus per-row editing rules. Date values are displayed and stored as `YYYY-MM-DD`. Select options are injected by the feature that owns API access; F1-GRID never calls a database or API to load them.

`editable` accepts either a Boolean or a predicate receiving the row. A cell whose predicate returns `false` is read-only for double-click, Enter, F2, and checkbox changes.

```ts
type F1GridOption = {
  value: string | number | boolean;
  label: string;
};

type F1GridColumn<T extends object> = {
  type?: 'text' | 'number' | 'checkbox' | 'date' | 'select';
  editable?: boolean | ((row: T) => boolean);
  options?: F1GridOption[];
};
```

## Architecture

Create `frontend/src/shared/components/f1-grid/` with separate type, state utility, core grid, and focused rendering modules. `F1Grid` owns temporary editing, selection, focus, and row-state tracking while receiving initial rows and column definitions through typed props.

Rows remain immutable from the consumer perspective. Each mutation creates a new row collection and updates a state map keyed by `rowKey`. Deleted rows remain in the collection for `getChanges()` but are not rendered. A ref exposes imperative ERP commands without coupling the grid to API calls.

`MenuManagementPanel` owns the page-specific column definitions and passes the existing menu rows into `F1Grid<MenuManagementRow>`. The current MUI table is replaced in-place; its surrounding management-page layout and static data service remain unchanged.

The component is organized as follows:

```text
shared/components/f1-grid/
	core/       public grid and header/body/row/cell renderers
	editing/    editor dispatcher and individual text/number/date/select editors
	selection/  selection calculations
	keyboard/   keyboard action resolution
	types/      public column, option, ref, and row-state contracts
	utils/      row key, display value, and editable predicate helpers
```

Row-state utilities remain separate from rendering. Clipboard, filter, sorting, aggregation, layout, pagination, and export modules are added only when their behavior is implemented.

## Column and Editing Model

The public column contract has a field, header label, width, editable flag, editor type, alignment, and optional formatter. The Menu Management columns are `code`, `name`, `parent`, `order`, and `enabled`.

- `order` uses a number editor and right alignment.
- `enabled` uses a checkbox editor.
- Other fields use text editors.

`date` uses the native HTML date input while editing. `select` renders the option label when inactive and a MUI Select while editing. The grid preserves the option `value` in the row data.

Double-click, `Enter`, and `F2` begin editing an editable focused cell. `Enter` commits and moves down, `Tab` commits and moves horizontally, and `Escape` cancels. A changed original row becomes `updated`; an inserted row remains `inserted` after edits.

## User Interface

The grid prioritizes compact scanning and direct input. It uses the project MUI theme for colors and typography rather than hard-coded state colors. Headers are visually distinct, numeric values are right-aligned, and focused or selected cells remain clearly identifiable in both light and dark modes.

The Menu Management toolbar uses existing MUI controls for add, delete, and duplicate actions. The Grid itself owns keyboard equivalents. A compact status summary shows selected count and pending inserted, updated, and deleted rows, providing a visible check that page-level commands act on expected rows.

## Error Handling and Boundaries

Unknown row keys, non-editable columns, and invalid keyboard targets are ignored safely. The component has no API dependency and does not persist changes. Consumers retrieve `getChanges()` and choose how to validate or save data.

## Verification

Tests are written before production code and verify:

- selection behavior and selected-ID retrieval
- inline edit state and changed-row extraction
- row add, delete, restore, and duplicate behavior
- keyboard focus and edit controls
- the Menu Management screen rendering the existing menu data through `F1-GRID`

Run the focused Vitest file during each change, then execute `npm run build` and the full frontend test suite in Git Bash.

# F1-Grid Header Hover Height Design

## Problem

When a narrow F1-Grid column header is hovered, the column menu button appears and the header content gains right padding. The reduced text width can wrap the header name into multiple lines, increasing the shared header row height.

## Approved Design

- Keep the existing hover/focus menu button visibility and its placement.
- Render the header name on one line and truncate it with an ellipsis when available width is insufficient.
- Keep the complete header name available through the column header's existing accessible label.
- Do not change column sizing, row sizing, menu behavior, or application-specific grid configuration.

## Verification

- Add a focused regression test for narrow header-name truncation and retained full accessible name.
- Run the relevant F1-Grid test file and frontend build.
- Verify in a browser that hovering a narrow header does not change the header row height and that the menu remains usable.

## Scope

The implementation is limited to the shared F1-Grid header rendering, its focused test, and the F1-Grid behavior documentation.

# ERP React Grid 개발 Agent Specification

## 1. 프로젝트 목표

React + TypeScript 기반의 ERP 시스템에서 공통으로 사용할 수 있는 자체 Grid Component를 개발한다.

외부 상용 Grid 라이브러리(AG Grid, Kendo Grid, Syncfusion Grid 등)는 사용하지 않는다.

단, Grid 내부 구현에 필요한 일반적인 React 생태계 라이브러리는 필요성 검토 후 사용할 수 있다.

목표는 일반적인 DataTable이 아니라 다음 ERP 업무 특성을 만족하는 전문 Grid를 만드는 것이다.

- 대량 데이터 처리
- 대용량 조회 최적화
- Excel 중심 업무
- 빠른 키보드 입력
- 인라인 편집
- 다중 행 작업
- 행 상태 관리
- 서버사이드 조회
- 사용자별 Grid Layout
- ERP 업무에 맞는 코드/명칭 입력
- 합계/소계
- Row Merge
- Tree / Group 기능 확장

---

# 2. 기본 기술 원칙

## 기술 스택

- React
- TypeScript
- Vite
- CSS 또는 프로젝트의 공통 Styling System
- React Hooks

## 금지

다음 Grid 라이브러리를 사용하지 않는다.

- AG Grid
- MUI DataGrid
- Kendo UI Grid
- Syncfusion Grid
- DevExtreme DataGrid
- Handsontable

단순 UI 컴포넌트 라이브러리는 Grid 외부 UI에 한하여 사용할 수 있다.

Grid의 핵심 렌더링 및 상태 관리는 직접 구현한다.

---

## 체크박스 옵션 정리

현재 구현 기준으로 체크박스 관련 옵션은 의도가 다르므로 중복으로 보지 않는 것이 맞다.

- `F1GridProps.showCheckbox`: 행 선택용 체크박스 컬럼 전체 표시 여부
- `F1GridColumn.headerCheckbox`: `type: 'checkbox'` 컬럼에서 헤더 전체 선택 토글 허용
- `F1TreeProps.treeCheckbox`: 트리 노드용 체크박스 선택 토글

즉, `showCheckbox`는 Row Selector를 제어하고, `headerCheckbox`는 데이터 셀의 boolean 값을 편집하는 컬럼 동작을 제어한다.
이 둘을 혼동하면 동일한 "체크박스" 이름 때문에 문서가 헷갈리기 쉽다.

---

## 추가 반영 기능 요약 (2026-09-01 기준)

현재 구현된 `F1Grid`/`F1Tree`는 아래 기능을 실제로 지원한다.

- 헤더 메뉴에서 컬럼 정렬, 필터, 고정, 숨김/표시를 조작할 수 있다.
- 컬럼 리사이즈와 컬럼 고정 상태가 동시에 동작하며, 마지막 남은 표시 컬럼은 숨길 수 없다.
- 행 높이 조절 핸들과 키보드 `ArrowUp`/`ArrowDown`으로 `4px` 단위 조절이 가능하다.
- 셀 범위 드래그 선택 중에는 행 높이 조절 핸들이 비활성화되어 `rowresize` 동작이 발생하지 않는다.
- `wrapText: true` 옵션이 있는 컬럼은 행 높이가 커질 때 줄바꿈을 허용하고, 기본 컬럼은 한 줄 말줄임 유지한다.
- `height`, `minHeight`, `maxHeight`를 통해 Grid 컨테이너의 전체 높이와 최소/최대 높이를 제어한다.
- `columnLine` 기본값은 `true`이며, 컬럼 사이 세로 구분선을 표시한다.
- `stripeRows` 기본값은 `true`이며, 홀수 행에 스트라이프 배경을 적용해 가독성을 높인다. 고정(pinned) 컬럼에서도 동일한 규칙을 유지하며, sticky 레이어가 다른 셀과 겹치지 않도록 별도 stacking context를 유지한다.
- `rowHeight`, `minRowHeight`, `maxRowHeight`, `resizableRows`를 통해 Grid 인스턴스 단위의 행 높이를 제어한다.
- `loading` 상태를 사용해 그리드 전체 영역에 로딩 스피너를 표시하고, `minHeight`를 넘겨 부모 영역에서 내부 스크롤이 유지되도록 할 수 있다.
- `F1GridColumn.pinned` 옵션으로 초기 좌/우 고정 컬럼을 지정할 수 있다.
- `F1Tree.defaultExpandAll` 옵션으로 최초 렌더링 시 전체 트리를 펼친 상태로 시작할 수 있다.
- `showCheckbox={false}`는 Row Selector 체크박스 전체 제거용이고, `column.type === 'checkbox'`의 `headerCheckbox`는 데이터 셀 편집용으로 구분된다.
- `rowProjection`과 `cellAdornment`를 통해 Grid UI의 표시 전/후 장식을 확장할 수 있다.
- `disableSorting`, `disableFiltering` 옵션으로 특정 화면에서 정렬/필터 기능을 비활성화할 수 있다.
- 우클릭 컨텍스트 메뉴에서 `canExportExcel`, `allowAddRowInContextMenu`, `allowDuplicateRowInContextMenu`, `allowDeleteRowInContextMenu`를 조합해 각 화면에서 필요한 액션만 노출할 수 있다. `createDuplicate`를 제공하면 행 복사 액션이 동작한다.
- 선택형 `rowFormPlugin`으로 컬럼 정의 기반의 신규·수정 행 폼 모달과 우측 고정 `상세` 액션 열을 활성화할 수 있다. 플러그인이 없거나 `enabled: false`이면 기존 인라인 편집과 즉시 행 추가 동작을 유지한다.
- 값이 변경된 셀은 `data-dirty-cell="true"`와 함께 좌측 상단에 빨간 삼각형 코너 마크가 표시되며, 편집 중인 셀에서는 마크가 숨겨진다. 고정(pinned) 컬럼뿐 아니라 일반 컬럼에서도 동일하게 표시되어야 한다.
- dirty 판정은 최초 수정 시 해당 필드의 원본값만 `originalValuesById`에 저장하는 sparse 방식이다. 수정 후 다시 원본 값(빈 값 포함)으로 되돌리면 해당 필드 patch와 dirty 마크가 제거되고, 행의 모든 필드가 원본과 같아지면 행 상태도 `updated`에서 `normal`로 되돌아간다.
- 컨텍스트 메뉴 등으로 추가한 신규 행을 저장 전에 삭제하면 해당 행은 `deleted` 변경으로 남지 않는다. 행과 원본·dirty 상태를 함께 제거하므로 `getChanges()`의 inserted/updated/deleted 목록에서 모두 제외되며, 변경이 없으면 페이지 저장 액션도 비활성화할 수 있다.
- dirty 표시는 컬럼 타입에 관계없이 동일하게 적용된다(텍스트, 숫자, 체크박스, 날짜, 시간 등). 컬럼 타입별 렌더링 분기와 무관하게 셀 루트에서 공통으로 마크를 그리기 때문이다.
- `column.getValue`로 값을 파생시키는 컬럼(예: 여러 체크박스가 하나의 배열 필드를 공유하는 권한 체크박스)은 dirty 판정도 `getValue(row)`를 원본 값과 비교해 계산한다. `onValueChange`가 실제로 갱신하는 필드명이 `column.field`와 다르더라도(예: `permissionCodes` 배열을 갱신하지만 컬럼은 `readPermission`) 해당 컬럼 셀에 정확히 dirty 마크가 표시된다.

이 항목은 초기 사양서의 기본 모델을 넘어, 실제 사용 중인 구현 상태를 기준으로 정리한 요약이다.

---

## 문서 사용 안내: 구현 상태 표기 (2026-09-03 갱신)

이 문서는 최초 설계 목표 전체를 담고 있어, 아직 구현되지 않은 로드맵 항목과 실제 구현된 계약이 함께 섞여 있다. 아래 기준으로 구분해서 읽는다.

- **현재 구현됨**: `체크박스 옵션 정리`, `추가 반영 기능 요약`(위 두 섹션)과 이 섹션에서 별도로 `⚠️ 아직 미구현`으로 표시하지 않은 코드/UX 설명.
- **아직 미구현(설계 목표)**: `aggregate`, `enableRowMerge`, `mergeKey`, `mergeWhen`, `grid.refreshRowMerge()`, `grid.getRowMergeRanges()`, `addRows`, `gridId`/`editable`/`selectable`/`pagination`/`sortable`/`filterable` 형태의 Props, `F1GridToolbar`, 화면별 Context Menu Custom 확장, Aggregation Footer, Grouping, 서버사이드 Pagination/Query, Virtual Scrolling. Context Menu 기본 동작과 Excel Export(우클릭 메뉴의 `엑셀 내보내기`)는 구현되었다. 이 항목들은 아래 관련 섹션에 `⚠️ 아직 미구현` 표시를 추가했다.
- 실제 공개 계약의 최종 근거는 `frontend/src/shared/components/f1-grid/types/grid.types.ts`와 F1-Grid 문서 포털(`/f1-grid-docs`)의 API Reference이다. 이 문서와 소스가 다르면 소스를 기준으로 문서를 갱신한다.

---

# 3. 최우선 개발 원칙

ERP Grid는 다음 우선순위를 기준으로 개발한다.

1. 데이터 정확성
2. 키보드 사용성
3. Excel 호환성
4. 편집 안정성
5. 대용량 데이터 처리
6. 확장성
7. UI 커스터마이징

일반적인 웹 테이블처럼 보기 좋은 것보다 ERP 사용자가 빠르게 데이터를 입력하고 수정할 수 있는 것을 우선한다.

---

# 4. 전체 Architecture

권장 구조:

```text
src/
├── components/
│   └── grid/
│       ├── core/
│       │   ├── F1Grid.tsx
│       │   ├── GridHeader.tsx
│       │   ├── GridBody.tsx
│       │   ├── GridRow.tsx
│       │   ├── GridCell.tsx
│       │   └── GridFooter.tsx
│       │
│       ├── editing/
│       │   ├── CellEditor.tsx
│       │   ├── TextEditor.tsx
│       │   ├── NumberEditor.tsx
│       │   ├── DateEditor.tsx
│       │   ├── SelectEditor.tsx
│       │   └── AutocompleteEditor.tsx
│       │
│       ├── selection/
│       │   └── GridSelection.ts
│       │
│       ├── keyboard/
│       │   └── GridKeyboard.ts
│       │
│       ├── clipboard/
│       │   └── GridClipboard.ts
│       │
│       ├── filter/
│       │   └── GridFilter.ts
│       │
│       ├── sorting/
│       │   └── GridSort.ts
│       │
│       ├── aggregation/
│       │   └── GridAggregation.ts
│       │
│       ├── merge/
│       │   └── GridRowMerge.ts
│       │
│       ├── layout/
│       │   └── GridLayout.ts
│       │
│       ├── pagination/
│       │   └── GridPagination.tsx
│       │
│       ├── virtualization/
│       │   └── GridVirtualizer.ts
│       │
│       ├── export/
│       │   └── GridExcelExport.ts
│       │
│       ├── types/
│       │   └── grid.types.ts
│       │
│       └── utils/
│           └── grid.utils.ts
│
└── features/
    └── ...
```

기능별 책임을 분리한다.

`F1Grid.tsx` 하나에 모든 기능을 구현하지 않는다.

---

# 5. Grid Column Specification

컬럼은 설정 기반으로 동작해야 한다.

예시:

```typescript
const columns: F1GridColumn<Item>[] = [
  {
    field: 'itemCode',
    headerName: '품목코드',
    width: 120,
    type: 'autocomplete',
    editable: true,
    required: true,
  },
  {
    field: 'itemName',
    headerName: '품목명',
    width: 200,
    type: 'text',
    editable: false,
    mergeRows: true,
  },
  {
    field: 'qty',
    headerName: '수량',
    width: 100,
    type: 'number',
    editable: true,
    align: 'right',
  },
  {
    field: 'price',
    headerName: '단가',
    width: 120,
    type: 'currency',
    editable: true,
    align: 'right',
    aggregate: 'sum',
  },
];
```

기본 타입:

```typescript
type F1GridColumnType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'time'
  | 'checkbox'
  | 'select'
  | 'autocomplete'
  | 'code';

interface F1GridColumn<T> {
  field: keyof T;
  headerName: string;
  width?: number;
  flex?: number;
  editable?: boolean | ((row: T) => boolean);
  type?: F1GridEditorType;
  options?: { value: string | number | boolean; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  validate?: (value: T[keyof T], row: T) => string | boolean;
  align?: 'left' | 'center' | 'right';
  headerAlign?: 'left' | 'center' | 'right';
  wrapText?: boolean;
  mergeRows?: boolean;
  headerCheckbox?: boolean;
  hidden?: boolean;
  pinned?: 'left' | 'right';
}
```

## 컬럼 확장 API (표시 커스터마이징)

`renderCell`, `getCellStyle`, `getCellProps`는 컬럼별로 표시 영역, 동적 스타일, 셀 속성, 접근성 메타데이터를 직접 확장할 수 있게 해준다.

```typescript
type F1GridCellRenderContext<T> = {
  row: T;
  rowId: string | number;
  column: F1GridColumn<T>;
  field: keyof T;
  value: unknown;
  rowIndex: number;
};

type F1GridCellProps = {
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  'aria-label'?: string;
};

interface F1GridColumn<T> {
  renderCell?: (context: F1GridCellRenderContext<T>) => React.ReactNode;
  getCellStyle?: (
    context: F1GridCellRenderContext<T>,
  ) => React.CSSProperties | undefined;
  getCellProps?: (
    context: F1GridCellRenderContext<T>,
  ) => F1GridCellProps | undefined;
}
```

- `renderCell`은 표시 모드에서만 적용된다. 셀이 편집 모드로 전환되면 기존 `CellEditor` / editor plugin 흐름이 그대로 사용되며, `renderCell`은 무시된다.
- `getCellStyle`과 `getCellProps.style`은 문자열 CSS가 아니라 `React.CSSProperties` 객체를 반환해야 한다.
- `getCellProps`에서 반환한 `className`, `title`, `aria-label`은 셀 컨테이너의 속성으로 병합 적용되며, 기존 텍스트 표시/편집 동작을 깨지 않는다.
- 세 함수 모두 지정하지 않으면 기본 값 표시 및 기존 편집 동작을 그대로 유지한다.
- 복잡한 스타일은 `getCellProps.className`과 외부 CSS 클래스로 확장하는 것이 가장 안전하다.

예:

```typescript
const columns: F1GridColumn<Item>[] = [
  {
    field: 'status',
    headerName: '상태',
    renderCell: ({ value }) => (
      <span className={value === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}>
        {value === 'ACTIVE' ? '사용' : '미사용'}
      </span>
    ),
    getCellStyle: ({ value }) =>
      value === 'ACTIVE' ? { fontWeight: 600 } : undefined,
    getCellProps: ({ row }) => ({
      title: row.statusUpdatedAt ? `변경일: ${row.statusUpdatedAt}` : undefined,
    }),
  },
];
```

> ⚠️ 아직 미구현: 위 앞선 컬럼 예시의 `aggregate` 옵션(합계/소계)은 현재 `F1GridColumn` 타입에 없다. 실제 지원 옵션은 `frontend/src/shared/components/f1-grid/types/grid.types.ts`의 `F1GridColumn`을 기준으로 하며(예: `format`, `decimalPlaces`, `selectOnFocus`, `syncWithTreeCheckbox`는 실제 구현되어 있다), 위 인터페이스 예시는 초기 설계 목표를 단순화한 것이다.

Row Merge 설정:

```typescript
type F1GridRowMergeMode = 'none' | 'sameValue' | 'custom';

interface F1GridColumn<T> {
  field: keyof T;
  mergeRows?: boolean | F1GridRowMergeMode;
  mergeKey?: keyof T | ((row: T, rowIndex: number) => string | number | null);
  mergeWhen?: (currentRow: T, previousRow: T) => boolean;
}
```

기본 사용은 `mergeRows: true`만 지정하면 같은 컬럼의 연속 동일 값을 자동 병합한다.

실제 구현은 상위 merge 구간과 하위 merge 구간의 경계를 함께 고려한다. 즉, 이전 컬럼이 서로 다른 merge 그룹인 경우에는 값이 같아도 하위 컬럼의 병합을 이어가지 않는다. 하위 컬럼 merge span도 상위 그룹을 넘어서 확장되지 않는다.

복합 기준이 필요한 경우 `mergeKey` 또는 `mergeWhen`을 사용한다.

> ⚠️ 아직 미구현: `mergeKey`, `mergeWhen`, `enableRowMerge`, `grid.refreshRowMerge()`, `grid.getRowMergeRanges()`는 현재 타입/구현에 없는 설계 목표다. 현재 실제로 지원하는 계약은 컬럼별 `mergeRows: boolean`뿐이며, 핀 고정(pinned) 컬럼 및 셀 드래그 범위 선택과의 상호작용은 이미 구현되어 있다.

예:

```typescript
const columns: F1GridColumn<PurchaseLine>[] = [
  {
    field: 'customerName',
    headerName: '거래처',
    width: 180,
    mergeRows: true,
  },
  {
    field: 'orderNo',
    headerName: '발주번호',
    width: 140,
    mergeRows: 'custom',
    mergeKey: (row) => `${row.customerCode}:${row.orderNo}`,
  },
];
```

---

# 6. 기본 Grid 기능

다음 기능을 반드시 지원한다.

## 5.1 긴 텍스트와 행 높이

셀의 긴 내용은 기본적으로 한 줄로 표시하고, 컬럼 너비를 넘는 부분은 말줄임표(`...`)로 표시한다. 셀 표시값 전체는 `title` 속성으로 확인할 수 있다.

행 하단의 높이 조절 핸들을 드래그하면 해당 행만 높이를 변경할 수 있다. 기본 높이는 `40px`, 최소 높이는 `40px`, 최대 높이는 `300px`이며, `ArrowUp`과 `ArrowDown`으로도 `4px` 단위 조절이 가능하다.

```tsx
<F1Grid
  rows={rows}
  columns={[
    { field: 'itemName', headerName: '품목명', wrapText: true },
    { field: 'itemCode', headerName: '품목코드' },
  ]}
  rowKey="id"
  rowHeight={40}
  minRowHeight={40}
  maxRowHeight={300}
  resizableRows
/>
```

`wrapText: true`인 컬럼은 행 높이가 기본 높이보다 커지면 셀 안에서 줄바꿈한다. `wrapText`가 없는 컬럼은 행 높이가 커져도 한 줄 말줄임을 유지한다. 높이 설정은 현재 Grid 인스턴스에만 적용하며 서버나 사용자 레이아웃으로 저장하지 않는다.

## Selection

- Single Row Selection
- Multi Row Selection
- Checkbox Selection
- Select All
- Current Page Select All
- Shift Range Selection
- Ctrl Multi Selection

Grid-level checkbox column visibility is controlled by `showCheckbox` on `F1Grid`.
This is different from a data column whose type is `checkbox` and may optionally enable `headerCheckbox` for header select-all.

```tsx
<F1Grid rows={rows} columns={columns} rowKey="id" showCheckbox={false} />;

const columns: F1GridColumn<Item>[] = [
  {
    field: 'useYn',
    headerName: '사용여부',
    type: 'checkbox',
    headerCheckbox: true,
  },
];
```

`showCheckbox={false}` hides the row-selection checkbox column entirely.
`column.type === 'checkbox'` and `headerCheckbox: true` are for data editing inside the grid cell, not for toggling the row selector.

API:

```typescript
grid.getSelectedRows();
grid.getSelectedRowIds();
grid.clearSelection();
```

---

# 7. Editing

ERP Grid는 기본적으로 인라인 편집을 지원한다.

지원 Editor:

```text
Text
Number
Decimal
Currency
Date
DateTime
Time
Checkbox
Select
Autocomplete
Code Picker
```

셀 편집 시작:

```text
Double Click
Enter
F2
```

셀 편집 종료:

```text
Enter
Tab
Escape
```

코드 선택(`type: 'code'`) 컬럼은 편집 모드에서 버튼이 셀 너비를 꽉 채우도록 렌더된다. 선택 버튼은 셀 높이와 너비를 유지하면서, 다른 에디터와 동일한 여백/테두리 규칙을 따른다.

## 행 폼 모달 플러그인

`rowFormPlugin`은 많은 컬럼을 가로 셀 편집 대신 폼으로 등록·수정해야 하는 화면에서 선택적으로 사용한다. 활성 상태는 prop이 있고 `enabled !== false`인 경우이며, 이때 Grid 마지막에 폭 `48px`의 우측 고정 `상세` 열이 자동 추가된다. `상세` 열은 사용자가 해제할 수 없는 폼 플러그인 전용 우측 pin 1번 영역으로 동작하고, 사용자가 다른 컬럼을 오른쪽 고정하면 해당 컬럼은 `상세` 열 왼쪽의 2번 이후 고정 영역에 배치된다. 합성 액션 열은 컬럼 배열, 행 데이터, Excel 내보내기, 클립보드, 셀 선택 및 검증 대상에는 포함되지 않는다.

플러그인이 없거나 `enabled: false`이면 액션 열과 모달을 만들지 않는다. `addRow()`는 기존처럼 즉시 행을 추가하고 인라인 편집을 비롯한 기존 Grid/Tree 동작도 변경하지 않는다.

공개 타입:

```typescript
type F1GridFormMode = 'create' | 'edit';

type F1GridColumnFormOptions<T extends object> = {
  hidden?: boolean;
  readOnly?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  label?: string;
  group?: string;
  order?: number;
  span?: 1 | 2 | 3;
  targetField?: keyof T;
  targetLabel?: string;
};

type F1GridRowFormPlugin<T extends object> = {
  id?: string;
  enabled?: boolean;
  getTitle?: (context: { mode: F1GridFormMode; row: T }) => string;
  getDescription?: (context: { mode: F1GridFormMode; row: T }) => string;
  onBeforeApply?: (context: {
    mode: F1GridFormMode;
    originalRow?: T;
    draftRow: T;
  }) => boolean | void;
};

interface F1GridColumn<T extends object> {
  form?: F1GridColumnFormOptions<T>;
}

interface F1GridProps<T extends object> {
  rowFormPlugin?: F1GridRowFormPlugin<T>;
}
```

### 컬럼 자동 매핑과 우선순위

- `headerName`은 기본 필드 라벨이고 `headerGroup`은 기본 폼 섹션이다.
- 그룹은 `form.group` → `headerGroup` → `기본 정보` 순으로 결정한다.
- 라벨은 `form.label` → `headerName`, 순서는 `form.order` → 컬럼 선언 순서로 결정한다.
- 읽기 전용은 `form.readOnly` → `editable` 함수의 반대값 → `editable` 값의 반대값 순으로 판정한다.
- `form.span`은 데스크톱 3열 기준 점유 폭이며 기본값은 `1`이다.
- `form.targetField`와 `form.targetLabel`로 수정 모달 상단의 메타 정보(`예: 메뉴명: 홍길동`)를 재정의할 수 있으며, 기본값은 `rowKey`와 `대상`이다.
- `text`, `number`, `decimal`, `currency`, `checkbox`, `date`, `datetime`, `time`, `select`, `autocomplete`, `code` 컬럼은 대응 입력으로 변환된다.
- `rownumber`, 선택 체크박스, 합성 액션 열, 선언상 숨김 컬럼은 기본 제외한다. `form.hidden: false`이면 숨김 컬럼도 명시적으로 폼에 포함할 수 있다.

### draft 적용과 취소

- 수정 모달은 원본 행의 얕은 복사본을 draft로 사용한다. 입력 중에는 Grid 행과 변경 상태를 건드리지 않고, 적용 시 달라진 필드만 기존 dirty/updated 상태에 반영한다.
- 활성 플러그인에서 `addRow(partial?)`는 `createRow()`와 partial을 합친 신규 draft를 연다. 적용 시에만 inserted 행을 생성하고 취소 시 빈 행이나 변경 이력을 남기지 않는다.
- `required`, `min`, `max`, `validate`는 폼에 포함된 컬럼만 검증한다. 실패하면 모달을 유지하고 첫 오류 입력으로 포커스를 이동한다.
- `onBeforeApply`가 `false`를 반환하면 적용을 중단하고 모달을 유지한다.
- 취소, 닫기, `Escape`, backdrop 닫기는 모두 draft를 폐기한다.
- 모달은 API를 호출하거나 서버에 저장하지 않는다. 최종 저장은 화면이 `getChanges()`와 기존 저장 버튼 흐름으로 수행한다.

### F1-Tree와 반응형 UI

`F1TreeRef.addRow()`는 부모 기본값을 유지한 루트 draft를 열고, `addChildRow(parentId, partial?)`는 `parentKey` 값을 보존한 하위 draft를 연다. 하위 행은 적용된 뒤에만 추가되고 부모 노드가 펼쳐지며, 취소 시 펼침 상태를 바꾸지 않는다. 트리 펼침 상태와 모달 open 상태는 독립적이다.

1280px 이상에서는 최대 `960px`의 3열 폼, 768px 이상 1280px 미만에서는 2열 폼, 768px 미만에서는 full-screen 1열 폼을 사용한다. `form.span`은 각 뷰포트의 가용 열 수를 넘지 않게 제한된다. 모달은 `background`, `text`, `divider`, `primary`, `action` MUI 테마 토큰을 사용해 라이트·다크 테마에 대응한다.

```tsx
<F1Grid
  ref={gridRef}
  rows={rows}
  columns={[
    {
      field: 'name',
      headerName: '품목명',
      headerGroup: '기본 정보',
      editable: true,
      form: { span: 2 },
    },
    {
      field: 'active',
      headerName: '사용 여부',
      headerGroup: '운영 정보',
      type: 'checkbox',
      editable: true,
    },
  ]}
  rowKey="id"
  createRow={() => ({ id: crypto.randomUUID(), name: '', active: true })}
  rowFormPlugin={{ enabled: true }}
/>
```

---

# 8. Keyboard Navigation

ERP 사용성을 위해 키보드 조작을 우선한다.

필수 단축키:

```text
↑
↓
←
→

Tab
Shift + Tab

Enter
Shift + Enter

Home
End

Ctrl + C
Ctrl + V
Ctrl + X

Ctrl + A

Delete
Backspace

Escape

F2
Insert
```

기본 동작:

```text
Tab
→ 다음 셀

Shift + Tab
→ 이전 셀

Enter
→ 다음 행의 동일 컬럼

Shift + Enter
→ 이전 행의 동일 컬럼

Arrow
→ 셀 이동

F2
→ 셀 편집

Escape
→ 편집 취소
```

브라우저 기본 동작과 충돌하는 경우 Grid가 우선적으로 처리한다.

---

# 9. Excel Clipboard

ERP Grid의 핵심 기능이다.

## Excel → Grid

Excel에서 여러 셀을 복사한 뒤 Grid에서:

```text
Ctrl + V
```

하면 행/열 구조를 유지하여 붙여넣는다.

예:

```text
Excel

A001    제품A    10    10000
A002    제품B    20    20000
A003    제품C    30    30000
```

Grid:

```text
품목코드 | 품목명 | 수량 | 단가
A001     | 제품A  | 10   | 10000
A002     | 제품B  | 20   | 20000
A003     | 제품C  | 30   | 30000
```

## Grid → Excel

선택 영역 또는 선택 행을:

```text
Ctrl + C
```

하여 Excel에 붙여넣을 수 있어야 한다.

---

# 10. Row State

각 Row는 상태를 관리한다.

```typescript
type GridRowState = 'normal' | 'inserted' | 'updated' | 'deleted';
```

예:

```text
NORMAL
INSERTED
UPDATED
DELETED
```

삭제된 Row는 즉시 데이터에서 제거하지 않고 상태를 유지할 수 있어야 한다.

저장 시:

```typescript
{
  insertedRows: [],
  updatedRows: [],
  deletedRows: []
}
```

형태로 쉽게 추출할 수 있어야 한다.

API:

```typescript
grid.getChanges();
```

---

# 11. Row CRUD

필수 API:

```typescript
grid.addRow();
grid.addRows();
grid.deleteSelectedRows();
grid.restoreDeletedRows();
grid.duplicateSelectedRows();
```

단축키:

```text
Insert
→ Row 추가

Delete
→ 선택 Row 삭제

Ctrl + D
→ Row 복제
```

---

# 11-1. Row Merge

ERP 전표, 발주, 생산지시, BOM, 재고조회 화면에서 같은 값이 반복되는 컬럼을 행 단위로 병합 표시할 수 있어야 한다.

대표 사용 사례:

```text
거래처
발주번호
품목군
공정
창고
부서
프로젝트
```

기본 원칙:

- 컬럼 설정만으로 쉽게 활성화할 수 있어야 한다.
- 연속된 Row의 값이 같은 경우에만 병합한다.
- 정렬, 필터, 페이지 변경 후에는 현재 표시 Row 기준으로 다시 계산한다.
- 실제 Row 데이터는 합치지 않고 화면 표시만 병합한다.
- 병합 시작 셀은 병합 span 전체를 차지하되, 내부 그룹의 하단 경계는 다음 행의 단일 행 경계선으로 표시해 border가 겹치지 않도록 한다.
- 편집, 선택, 복사, 붙여넣기, Validation은 원본 Row 단위로 동작한다.
- 병합된 셀을 클릭하면 병합 범위의 첫 번째 Row Cell에 Focus를 둔다.
- 병합 범위의 어느 행을 클릭해도 첫 번째 Row Cell을 기준으로 병합 그룹 전체 선택 경계를 표시한다.
- 병합 그룹 선택 경계는 현재 포커스/편집 중인 셀의 컬럼에만 표시하며, 같은 행의 다른 컬럼을 클릭해도 다른 병합 컬럼을 활성화하지 않는다.
- 병합 내부의 숨은 셀은 실제 그리드 마지막 행이어도 별도 하단선을 표시하지 않아 중간 병합 그룹의 경계선이 두꺼워지지 않도록 한다.
- 병합된 영역 안에서도 마우스 드래그를 이용한 셀 범위 선택(Drag Cell Range Selection) 및 핀 고정(pinned) 컬럼과의 병합 동작을 지원한다. 드래그 중에는 개별 포커스/병합 outline을 숨기고 선택 범위 overlay만 표시한다.
- 핀 고정 컬럼이 드래그 범위에 포함되더라도 수평 스크롤 상태에서 overlay 위치가 컬럼 위치와 함께 자연스럽게 보정되며, sticky 컬럼 경계에서 좌표가 어긋나지 않는다.
- 병합된 영역 안에서도 행 선택과 체크박스 선택은 개별 Row 기준으로 유지한다.

지원 모드:

```text
sameValue
→ 같은 컬럼 값이 연속으로 반복될 때 자동 병합

custom
→ mergeKey 또는 mergeWhen 결과가 같은 경우 병합
```

Grid 전체 옵션:

```tsx
<F1Grid rows={rows} columns={columns} enableRowMerge />
```

컬럼별 옵션:

```typescript
{
  field: 'customerName',
  headerName: '거래처',
  mergeRows: true,
}
```

복합 병합 기준:

```typescript
{
  field: 'orderNo',
  headerName: '발주번호',
  mergeRows: 'custom',
  mergeKey: row => `${row.customerCode}:${row.orderNo}`,
}
```

Public API:

```typescript
grid.refreshRowMerge();
grid.getRowMergeRanges();
```

Virtual Scrolling을 사용할 경우 병합 범위 계산은 전체 Row 기준으로 수행하되, DOM 렌더링은 현재 Viewport에 필요한 Cell만 생성한다.

Excel Export 시 기본값은 병합 표시를 유지하지 않고 원본 Row 값을 반복 출력한다. 화면 표시와 동일한 병합 Excel이 필요한 경우 별도 옵션으로 제공한다.

---

# 12. Validation

컬럼별 Validation을 지원한다.

예:

```typescript
{
  field: 'qty',
  headerName: '수량',
  type: 'number',
  required: true,
  min: 1,
  max: 999999,
}
```

또는:

```typescript
{
  field: 'itemCode',
  required: true,
  validate: (value, row) => {
    if (!value) {
      return '품목코드는 필수입니다.';
    }

    return true;
  },
}
```

Validation 실패 시:

- Cell Error 표시
- Error Message 표시
- 저장 차단

---

# 13. Sorting

기본적으로 다음을 지원한다.

```text
Ascending
Descending
None
```

다중 컬럼 정렬을 지원할 수 있도록 설계한다.

예:

```typescript
[
  {
    field: 'department',
    direction: 'asc',
  },
  {
    field: 'itemCode',
    direction: 'asc',
  },
];
```

---

# 14. Filtering

기본 필터:

```text
equals
notEquals
contains
startsWith
endsWith
greaterThan
lessThan
greaterThanOrEqual
lessThanOrEqual
between
isEmpty
isNotEmpty
```

데이터 타입에 따라 적절한 필터 UI를 제공한다.

컬럼 헤더의 더보기 메뉴에서 `필터`를 선택하면 필터 창은 해당 컬럼의 헤더 메뉴 버튼 왼쪽 하단에 표시된다. 부모 메뉴가 닫힌 뒤에도 헤더 버튼을 앵커로 유지하므로 창이 화면의 다른 위치로 이동하지 않는다.

예:

```text
문자열
→ Contains

숫자
→ >= <= = Between

날짜
→ 날짜 범위

Boolean
→ Yes / No
```

---

# 15. Column Management

사용자가 다음 기능을 사용할 수 있어야 한다.

```text
Column Resize
Column Reorder
Column Hide
Column Show
Column Pin
```

Column Pin:

```text
left
right
none
```

예:

```text
품목코드 ← 고정

품목명
규격
수량
단가
금액

금액 → 고정
```

컬럼 표시 여부는 별도의 컬럼 관리 버튼을 추가하지 않고 각 컬럼 헤더 메뉴에서 관리한다. 헤더 메뉴의 `컬럼 목록` 하위 메뉴는 전체 컬럼을 체크박스로 제공하며, 체크 해제로 숨기고 다시 체크해 표시한다. 마지막으로 표시된 컬럼은 숨길 수 없다.
추가로 헤더 메뉴는 정렬/필터/고정/숨김/표시를 한 번에 제어하는 공통 UX를 제공한다.

초기 렌더링부터 특정 컬럼을 고정하려면 컬럼 옵션에 `pinned`를 지정한다. 이후 사용자는 기존 헤더 메뉴에서 고정 위치를 변경하거나 해제할 수 있다.

```typescript
const columns: F1GridColumn<Item>[] = [
  { field: 'itemCode', headerName: '품목코드', width: 130, pinned: 'left' },
  { field: 'amount', headerName: '금액', width: 140, pinned: 'right' },
];
```

---

# 16. Grid Layout 저장

ERP에서는 사용자별 Grid 설정을 저장할 수 있어야 한다.

저장 대상:

```text
Column Width
Column Order
Hidden Columns
Pinned Columns
Sort
Filter
Page Size
```

예:

```typescript
{
  gridId: 'PURCHASE_ORDER',
  userId: 'USER001',

  columns: [
    {
      field: 'itemCode',
      width: 120,
      hidden: false,
      order: 0,
      pinned: 'left',
    }
  ],

  pageSize: 50,
}
```

추후 서버 저장을 고려하여 설계한다.

---

# 17. Pagination

서버사이드 Pagination을 기본 구조로 고려한다.

Request:

```typescript
{
  page: 1,
  pageSize: 50,
}
```

Response:

```typescript
{
  rows: [],
  totalCount: 12345,
}
```

지원:

```text
10
20
50
100
200
```

페이지 크기는 설정 가능해야 한다.

---

# 18. Server-side Query

Grid 자체가 API를 호출하도록 강하게 결합하지 않는다.

다음 데이터를 외부에서 주입할 수 있도록 설계한다.

```typescript
{
  page,
  pageSize,
  sort,
  filters,
}
```

예:

```typescript
const query = grid.getQuery();

fetchItems(query);
```

Grid는 UI와 상태를 관리하고 API 통신은 Feature/Service Layer가 담당한다.

대용량 조회에서는 다음 원칙을 따른다.

- Grid는 전체 데이터를 한 번에 요청하지 않는다.
- 검색 조건, 정렬, 필터, 페이지 정보가 변경될 때만 조회 Query를 갱신한다.
- 사용자가 검색어를 빠르게 입력하는 경우 debounce 또는 명시적 조회 버튼으로 불필요한 요청을 줄인다.
- 이전 조회가 완료되기 전에 새 조회가 시작되면 이전 요청을 취소하거나 응답을 무시할 수 있어야 한다.
- `totalCount` 조회 비용이 큰 화면에서는 전체 건수 조회를 선택 옵션으로 분리할 수 있어야 한다.
- 대용량 집계, 합계, 소계는 가능하면 서버에서 계산하고 Grid는 결과 표시를 담당한다.
- 조회 결과는 `rowKey` 기준으로 안정적으로 식별하며, 페이지 변경이나 부분 갱신 시 선택/편집 상태가 잘못 섞이지 않아야 한다.

확장 Query 예:

```typescript
interface GridQuery {
  page: number;
  pageSize: number;
  sort?: GridSort[];
  filters?: GridFilter[];
  cursor?: string | null;
  includeTotalCount?: boolean;
}
```

---

# 19. Aggregation (⚠️ 아직 미구현)

Footer에서 다음 집계를 지원하는 것을 목표로 한다. 현재 `F1GridColumn`/`F1GridProps`에는 관련 옵션이 없다.

```text
SUM
AVG
MIN
MAX
COUNT
```

예:

```typescript
{
  field: 'amount',
  aggregate: 'sum',
}
```

결과:

```text
합계: 12,500,000
```

---

# 20. Grouping

2차 개발 기능으로 설계한다.

지원 예정:

```text
Department
Customer
Supplier
Item
Date
```

예:

```text
▼ 삼성전자
    제품A    10
    제품B    20
    합계     30

▼ LG전자
    제품C    15
    제품D    25
    합계     40
```

---

# 21. Tree Grid

ERP 메뉴, 조직, BOM 등에 사용할 수 있도록 Tree 구조를 확장 가능하게 설계한다.

예:

```text
구매관리
 ├─ 구매요청
 ├─ 발주관리
 │   ├─ 발주등록
 │   └─ 발주조회
 └─ 입고관리
```

Tree Grid는 일반 Grid와 별도의 컴포넌트로 분리하지 않고 Core Grid 위에서 확장 가능하도록 설계한다.

초기 렌더링 시 모든 부모 노드를 펼치려면 `defaultExpandAll` 옵션을 사용한다. 기존처럼 세부 초기 펼침 상태가 필요하면 `defaultExpanded="all"`, `defaultExpanded="root"`, 또는 특정 row id 배열을 사용할 수 있다.

```tsx
<F1Tree
  rows={rows}
  columns={columns}
  rowKey="id"
  parentKey="parentId"
  treeColumn="name"
  defaultExpandAll
/>
```

---

# 22. 대용량 데이터

다음 데이터를 고려한다.

```text
1,000 rows
10,000 rows
```

전체 데이터를 DOM에 렌더링하지 않는다.

필요한 경우:

```text
Virtual Scrolling
Server-side Pagination
```

을 사용한다.

특히 Row 수가 증가하더라도 DOM Node가 비정상적으로 증가하지 않도록 한다.

조회 최적화 요구사항:

```text
Server-side Pagination 우선
Cursor 기반 조회 확장 가능
Virtual Row Rendering
Virtual Column Rendering
Request Debounce
Request Cancellation
Stale Response Ignore
Lazy Total Count
Server-side Aggregation
Stable Row Key
Partial Row Update
```

대용량 데이터 처리 원칙:

- 초기 진입 시 필요한 페이지 또는 Viewport 범위만 조회한다.
- 필터/정렬은 클라이언트 전체 데이터 기준이 아니라 서버 Query 기준으로 동작해야 한다.
- 화면에 보이는 Row/Column만 렌더링하되 키보드 이동과 Focus는 전체 Grid 좌표를 유지한다.
- 스크롤 이동 중에는 Cell 측정, 병합 범위 계산, 집계 계산 같은 비용 큰 작업을 반복하지 않는다.
- Row 높이가 고정인 화면은 고정 높이 Virtual Scroll을 우선 사용한다.
- Row 높이가 가변인 화면은 측정 Cache를 두고, 전체 Row 재측정을 피한다.
- 대량 붙여넣기나 일괄 수정은 화면 렌더링과 데이터 변경 계산을 분리해서 처리한다.
- 서버 조회 실패 시 기존 데이터를 즉시 지우지 않고 오류 상태와 재조회 수단을 제공한다.

---

# 23. Performance

다음 사항을 반드시 고려한다.

### React Rendering

불필요한 전체 Grid Re-render를 방지한다.

가능하면:

```text
Grid
 ├── Header
 ├── Row 1
 ├── Row 2
 ├── Row 3
```

각 Row/Cell을 독립적으로 최적화한다.

필요한 경우:

```typescript
React.memo;
useMemo;
useCallback;
```

을 사용한다.

단, 무조건 사용하는 것이 아니라 실제 렌더링 비용을 고려한다.

### Large Query Performance

대용량 조회 화면은 렌더링 최적화뿐 아니라 Query 비용을 함께 관리한다.

필수 고려 사항:

```text
Query Parameter Stability
AbortController 기반 요청 취소
동일 Query 중복 요청 방지
검색 조건 변경 시 선택/편집 상태 정리
로딩 중 중복 저장/붙여넣기 차단
대량 데이터 Excel Export는 서버 Export로 분리
```

Grid 내부 상태는 조회 조건과 표시 데이터를 분리한다.

```typescript
interface GridDataState<T> {
  rows: T[];
  totalCount?: number;
  loading: boolean;
  query: GridQuery;
  lastLoadedAt?: string;
}
```

`rows` 배열이 변경되더라도 컬럼 정의, 선택 상태, 편집 상태, 레이아웃 상태가 불필요하게 함께 초기화되지 않도록 한다.

---

# 24. Grid Toolbar (⚠️ 아직 미구현)

목표로 하는 기본 Toolbar는 다음과 같다. `F1GridToolbar` 컴포넌트는 현재 구현되지 않았다.

```text
[조회] [추가] [삭제] [복제] [저장] [엑셀] [컬럼설정]
```

화면별로 버튼을 조합할 수 있도록 한다.

예:

```tsx
<F1GridToolbar
  buttons={[
    'refresh',
    'add',
    'delete',
    'duplicate',
    'save',
    'excel',
    'columnSettings',
  ]}
/>
```

---

# 25. Grid Context Menu

F1-Grid 바디 영역(체크박스 열, 데이터 셀, 빈 여백 포함)을 우클릭하면 커서 위치에 컨텍스트 메뉴가 표시된다. 헤더 영역 우클릭은 대상에서 제외되며 기존 헤더 클릭 메뉴(정렬/필터/고정/숨김)를 그대로 사용한다.

일반 F1Grid의 메뉴 구성:

```text
엑셀 내보내기            (canExportExcel=true 일 때만 표시)
컬럼 길이 자동 조정
──────────────
행 추가
행 복사                  (선택/대상 행이 없으면 비활성화)
행 삭제                  (선택/대상 행이 없으면 비활성화)
──────────────
필터 해제                (적용된 필터가 없으면 비활성화, disableFiltering이면 미표시)
정렬 해제                (적용된 정렬이 없으면 비활성화, disableSorting이면 미표시)
──────────────
설정을 기본값으로 복원
```

F1Tree는 `루트 추가` 항목이 `컬럼 길이 자동 조정` 아래, `행 추가` 위에 추가로 표시된다. F1Tree도 `F1Grid`와 동일하게 호출자가 전달한 `disableSorting`/`disableFiltering` 정책을 따르므로, 두 기능이 활성화된 화면에서는 필터 해제/정렬 해제 항목을 사용할 수 있다.

관련 Props:

- `canExportExcel?: boolean` — 엑셀 내보내기 메뉴 노출 여부. 기본값 `false`(미표시). 페이지별 엑셀 권한과 연동해서 사용한다(예: 메뉴관리 화면).
- `excelFileName?: string` — 내보낼 파일명(확장자 `.xlsx`는 자동 부여). 기본값은 `${ariaLabel}-export`.
- `allowAddRowInContextMenu?: boolean` — 우클릭 메뉴에 `행 추가`를 노출할지 여부. 기본값 `true`.
- `allowDuplicateRowInContextMenu?: boolean` — 우클릭 메뉴에 `행 복사`를 노출할지 여부. 기본값 `true`.
- `allowDeleteRowInContextMenu?: boolean` — 우클릭 메뉴에 `행 삭제`를 노출할지 여부. 기본값 `true`.
- `treeContextMenu` — `F1Tree`가 내부적으로만 주입하는 트리 전용 확장 포인트(`onAddRoot`, `onAddChild`). `F1Grid`를 직접 사용하는 화면에서는 지정하지 않는다.

동작 요약:

- **엑셀 내보내기**: 화면에 보이는 컬럼/행(필터·정렬·숨김·순서 반영) 기준으로 `.xlsx` 파일을 생성한다. `exceljs`를 클릭 시점에 동적 로딩(`await import('exceljs')`)해 초기 번들 크기에 영향을 주지 않는다. npm에 공개된 `xlsx`(SheetJS) 패키지는 미패치 상태의 High 심각도 취약점(Prototype Pollution, ReDoS)이 있어 채택하지 않았다.
- **컬럼 길이 자동 조정**: 현재 표시된 컬럼 전체에 `getAutoFitColumnWidth`를 적용해 폭을 일괄 재계산한다.
- **루트 추가**(F1Tree 전용): 우클릭 위치와 무관하게 최상위 루트 행을 추가한다.
- **행 추가**: F1Tree에서는 우클릭한 행의 자식으로 추가하고(대상이 없으면 루트로 추가), 일반 F1Grid에서는 항상 새 행을 추가한다.
- **행 복사 / 행 삭제**: 우클릭한 행이 현재 선택에 없으면 그 행만 단일 선택으로 교체한 뒤 기존 복제/삭제 로직을 재사용한다. 대상 행도 선택도 없으면 비활성화된다.
- **필터 해제 / 정렬 해제**: 각각 `setFilterState([])` / `setSortState([])`.
- **설정을 기본값으로 복원**: 컬럼 순서/폭/숨김/고정을 컬럼 정의 기준 초기값으로 되돌리고 `storageKey` 로컬 스토리지 값을 제거한다.

화면별 Custom Menu 확장은 아직 지원하지 않는다(⚠️ 아직 미구현).

컨텍스트 메뉴 닫힘/재오픈 규칙:

- 메뉴가 열린 상태에서 그리드 바깥(다른 카드, 검색 영역, 브레드크럼 등)을 좌클릭하거나 우클릭하면 메뉴는 그 자리에서 다시 열리지 않고 즉시 닫힌다.
- 메뉴가 열린 상태에서 같은 그리드 또는 다른 그리드 영역(바디 여백 또는 셀)을 다시 우클릭하면, 기존 메뉴는 닫히고 새로 클릭한 셀/행이 먼저 선택된 뒤 그 위치에 메뉴가 다시 열린다.
- 내부적으로 그리드 컨테이너의 `getBoundingClientRect()` 좌표와 클릭 좌표를 비교해 "그리드 영역 안인지"를 판정하며, DOM 트리 상 조상 관계만으로 판단하지 않는다. MUI `Menu`가 열려 있는 동안에는 전체 화면을 덮는 투명 백드롭이 렌더링되고, 이 백드롭은 React 컴포넌트 트리 상 그리드의 자식으로 포탈되어 실제 DOM 위치와 무관하게 그리드의 `onContextMenu` 핸들러로 이벤트가 버블링될 수 있다. 이 문제를 막기 위해 백드롭의 `pointerEvents`를 `none`으로 비활성화해, 클릭이 항상 실제 화면상의 요소(그리드 내부 셀 또는 그리드 바깥 요소)에 도달하도록 한다. 추가로 `document.elementsFromPoint()`를 우선 사용해 포털/백드롭 같은 비그리드 래퍼가 맨 위에 있어도 실제 그리드 셀을 우선 복원해 선택한다.

---

# 26. Status / UI

행 상태를 사용자가 쉽게 구분할 수 있어야 한다.

예:

```text
신규 Row
수정 Row
삭제 Row
Validation Error
Disabled Row
Selected Row
```

단, 특정 색상을 하드코딩하지 않는다.

프로젝트 Theme을 통해 변경 가능하도록 한다.

## 편집 가능 컬럼 헤더 표시

편집 가능한 컬럼은 헤더 하단에 강조 색상(primary.main) border로 표시된다.

판정 조건(모두 만족해야 표시):

1. 그리드에 활성화된 editor plugin이 하나 이상 존재한다.
2. 화면에 보이는 행(`visibleRows`) 중 하나 이상에서 `isCellEditable(column, row)`이 참이다. 즉 컬럼의 `editable: true` 선언만으로는 표시되지 않는다.
3. 활성 editor plugin에 `canEdit(context)`가 정의되어 있다면 그 조건도 함께 만족해야 한다.

실제 구현은 `editableColumnFields` 집합을 계산할 때 위 조건을 모두 통과한 컬럼만 `data-editable-column="true"`로 헤더에 반영한다. 헤더 하단 border 표시는 정렬 인디케이터, 필터 표시, 컬럼 고정, 드래그앤드롭 드롭 위치 표시와 공존한다.

---

# 27. 접근성

가능한 범위에서 다음을 지원한다.

```text
Keyboard Navigation
Focus Management
ARIA Role
ARIA Label
Screen Reader
```

특히 현재 Focus Cell을 명확하게 관리한다.

---

# 28. TypeScript

any 사용을 최소화한다.

금지:

```typescript
const row: any;
```

권장:

```typescript
interface F1GridRow {
  id: string | number;
  [key: string]: unknown;
}
```

Generic을 적극적으로 사용한다.

```typescript
F1Grid<T>;
F1GridColumn<T>;
```

예:

```tsx
<F1Grid<Item> rows={items} columns={columns} />
```

---

# 29. Public API (⚠️ 목표 API, 현재 구현과 다름)

최종적으로 다음과 같은 API를 제공하는 것을 목표로 한다. 아래 인터페이스는 설계 목표이며, `addRows`, `setRows`, `clearChanges`, `getQuery`, `copy`/`paste`, `refreshRowMerge`/`getRowMergeRanges`, `getLayout`/`setLayout`/`resetLayout`는 현재 `F1GridRef`에 없다. 현재 구현된 실제 `F1GridRef`/`F1TreeRef` 계약은 F1-Grid 문서 포털의 API Reference 또는 `grid.types.ts`를 따른다.

```typescript
interface F1GridRef<T> {
  // Selection
  getSelectedRows(): T[];
  getSelectedRowIds(): Array<string | number>;
  clearSelection(): void;

  // Row
  addRow(row?: Partial<T>): void;
  addRows(rows: Partial<T>[]): void;
  deleteSelectedRows(): void;
  duplicateSelectedRows(): void;

  // Editing
  startEdit(rowId: string | number, field: keyof T): void;
  stopEdit(): void;

  // Data
  getRows(): T[];
  setRows(rows: T[]): void;

  // Change
  getChanges(): GridChanges<T>;
  clearChanges(): void;

  // Query
  getQuery(): GridQuery;

  // Clipboard
  copy(): void;
  paste(): Promise<void>;

  // Row Merge
  refreshRowMerge(): void;
  getRowMergeRanges(): GridRowMergeRange<T>[];

  // Layout
  getLayout(): GridLayout;
  setLayout(layout: GridLayout): void;
  resetLayout(): void;

  // Validation
  validate(): boolean;
}
```

---

# 30. Component 사용 예 (⚠️ 목표 예시, 현재 구현과 다름)

최종 사용 형태는 다음과 같이 단순해야 한다. 아래 예시의 `gridId`, `editable`, `selectable`, `pagination`, `sortable`, `filterable`, `aggregate`, `enableRowMerge`, `mergeKey`는 현재 `F1GridProps`/`F1GridColumn`에 없는 설계 목표 표기다. 실제 현재 사용법은 이 문서 상단의 `F1Grid rows={rows} columns={columns} rowKey="id"` 형태와 F1-Grid 문서 포털 예제를 따른다.

```tsx
const columns: F1GridColumn<Item>[] = [
  {
    field: 'itemCode',
    headerName: '품목코드',
    width: 120,
    type: 'autocomplete',
    editable: true,
    required: true,
  },
  {
    field: 'itemName',
    headerName: '품목명',
    width: 200,
  },
  {
    field: 'qty',
    headerName: '수량',
    width: 100,
    type: 'number',
    editable: true,
    aggregate: 'sum',
  },
  {
    field: 'price',
    headerName: '단가',
    width: 120,
    type: 'currency',
    editable: true,
    aggregate: 'sum',
  },
];

return (
  <F1Grid
    gridId="PURCHASE_ORDER"
    rowKey="id"
    columns={columns}
    rows={rows}
    editable
    selectable="multiple"
    pagination
    sortable
    filterable
  />
);
```

Row Merge 사용 예:

```tsx
const columns: F1GridColumn<PurchaseLine>[] = [
  {
    field: 'customerName',
    headerName: '거래처',
    width: 180,
    mergeRows: true,
  },
  {
    field: 'orderNo',
    headerName: '발주번호',
    width: 140,
    mergeRows: 'custom',
    mergeKey: (row) => `${row.customerCode}:${row.orderNo}`,
  },
  {
    field: 'itemName',
    headerName: '품목명',
    width: 220,
  },
];

return (
  <F1Grid
    gridId="PURCHASE_ORDER"
    rowKey="id"
    columns={columns}
    rows={rows}
    enableRowMerge
  />
);
```

화면 개발자는 Grid 내부 구현을 알 필요가 없어야 한다.

---

# 31. 개발 순서

Agent는 모든 기능을 한 번에 구현하지 않는다.

다음 순서대로 개발한다.

## Phase 1 - Core

```text
1. Grid Types
2. Grid Component
3. Column Definition
4. Header
5. Body
6. Row
7. Cell
8. Basic Selection
```

완료 후 테스트한다.

## Phase 2 - Editing

```text
1. Cell Focus
2. Text Editor
3. Number Editor
4. Date Editor
5. Select Editor
6. Inline Editing
7. Row State
8. Validation
```

## Phase 3 - ERP Keyboard

```text
1. Arrow Navigation
2. Tab
3. Enter
4. F2
5. Insert
6. Delete
7. Ctrl+C
8. Ctrl+V
```

## Phase 4 - Excel

```text
1. Clipboard Parser
2. Excel → Grid
3. Grid → Excel
4. Multi Cell Paste
5. Validation on Paste
```

## Phase 5 - Data

```text
1. Sorting
2. Filtering
3. Pagination
4. Server Query
5. Aggregation
```

## Phase 6 - Layout

```text
1. Column Resize
2. Column Reorder
3. Column Hide
4. Column Pin
5. Column Settings
6. Layout Save/Load
```

## Phase 7 - Performance

```text
1. Render Optimization
2. Row Memoization
3. Virtual Scroll
4. Virtual Column
5. Server-side Query Optimization
6. Request Cancellation
7. Large Dataset Test
```

## Large Dataset Sample (10,000 rows)

대용량 데이터는 특별한 별도 화면이 아니라 기존 F1-Grid UX를 그대로 유지하면서 큰 데이터 집합을 다루는 방식으로 정의한다.

- 10,000 rows: 기본 대용량 검증 기준으로 사용한다.
- 1,000 rows: 빠른 로딩 검증용 미리보기 샘플로 사용한다.
- 핵심 가정: 대용량 데이터에서도 체크박스 선택, dirty 상태, 셀 편집, 필터/정렬, 키보드 이동이 기존 흐름과 동일해야 한다.
- 문서/테스트에서 함께 쓰는 샘플 값에는 품목코드, 관리담당자, 카테고리, 수량, 금액, 수정일 등 ERP 운영 데이터에 가까운 필드를 포함한다.
- 대용량 샘플 생성은 50,000 / 100,000 건처럼 과도한 데이터를 즉시 생성하지 않고, 버튼 클릭 시 공통 로딩 스피너를 노출한 뒤 1,000건 또는 10,000건 기준 데이터를 조립한다.

```ts
const createLargeDataset = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    itemCode: `ITEM-${String(index + 1).padStart(6, '0')}`,
    itemName: `대용량 시뮬레이션 품목 ${index + 1}`,
    category: ['원자재', '부자재', '반제품', '완제품'][index % 4],
    quantity: ((index * 17) % 2000) + 10,
    amount: (index + 1) * 3850 + 12500,
    status: index % 3 === 0 ? 'active' : index % 2 === 0 ? 'hold' : 'pending',
    manager: `담당자 ${String((index % 18) + 1).padStart(2, '0')}`,
    updatedAt: `2026-09-${String((index % 28) + 1).padStart(2, '0')}`,
  }));
```

대용량 시나리오 검증은 다음 순서로 진행한다.

```text
1. 1,000 rows 미리보기 로드
2. 공통 로딩 스피너 노출 확인
3. 10,000 rows 로드
4. 스크롤 및 전체 선택 상태 확인
5. 정렬/필터 조건 적용
6. 단일 행 선택, 키보드 이동, dirty 상태 유지 재검증
7. 결과를 문서와 테스트 기준선으로 기록
```

### Virtualized rendering contract

F1-Grid는 전체 데이터/선택/편집 상태와 실제 DOM 렌더 범위를 분리한다. 행 수가 200개 이상이면 row virtualization이 자동 활성화되고, 컬럼 수가 12개 이상이면서 가로 overflow가 있으면 column virtualization이 자동 활성화된다.

```tsx
<F1Grid
  rows={rows}
  columns={columns}
  rowKey="id"
  height={420}
  virtualizeRows
  virtualizeColumns
  rowOverscan={8}
  columnOverscan={2}
  fixedRowHeightThreshold={10000}
/>
```

- `virtualizeRows`, `virtualizeColumns`: 자동 활성화 판단을 호출부에서 재정의한다.
- `rowOverscan`: viewport 위/아래에 추가 렌더링할 행 수이며 기본값은 8이다.
- `columnOverscan`: viewport 좌/우에 추가 렌더링할 일반 컬럼 수이며 기본값은 2이다.
- `fixedRowHeightThreshold`: 기본값 10,000이며, 이상에서는 행 높이를 고정하고 행 리사이즈 핸들을 비활성화한다.
- pinned 컬럼, 편집 중 컬럼, 선택 범위의 anchor/focus 컬럼은 viewport 밖이어도 DOM에 유지한다.
- 스크롤 위치는 `requestAnimationFrame`당 한 번만 React state에 반영한다.
- 세로 스크롤바가 생기는 대용량 그리드에서는 본문 스크롤 영역의 scrollbar gutter 폭을 헤더 스크롤 영역 끝에도 반영해, 가로 스크롤을 마지막으로 이동해도 헤더와 데이터 셀의 최대 `scrollLeft` 기준이 일치해야 한다.
- 선택 범위는 셀마다 state를 만들지 않고 `{ anchor, focus }`로 저장한 뒤 숫자 bounds를 한 번 계산해 렌더 셀에서 비교한다.
- export, validate, 전체 선택, 정렬/필터, dirty/edit 데이터는 virtual window가 아니라 전체 visible rows를 기준으로 동작한다.

100,000행 모드에서는 고정 행 높이를 전제로 하므로 개별 행 높이 변경이 필요하면 `fixedRowHeightThreshold`를 조정해야 한다. 임계값을 지나치게 높이면 스크롤 시 가변 높이 누적 계산 비용이 증가할 수 있다.

### Data Engine v2

- 행은 `rowById`와 `rowIndexById`로 인덱싱하며 단일 행 조회는 평균 O(1)로 처리한다.
- 변경 전 전체 행 복사본을 만들지 않고 수정된 필드의 원본값과 현재 patch만 저장한다.
- 일반 행 선택은 `Set`, 전체 선택은 `allSelected + excludedIds`로 보관한다. 배열은 callback/Ref 호출처럼 실제 ID 목록이 필요할 때만 만든다.
- Tab 이동은 전체 `행 × 컬럼` 편집 가능 행렬을 만들지 않고 현재 위치부터 다음 편집 가능 셀까지만 검사한다.
- 10,000행 이상 로컬 데이터에 정렬/필터가 적용되면 Web Worker query를 사용한다. Worker를 사용할 수 없거나 `getValue` 컬럼이 있으면 동기 query로 fallback한다.
- F1Tree는 구조 index를 재사용하며 expand/collapse 시 visible row sequence만 다시 계산한다.

### Server-side data source

서버가 정렬/필터/페이지 결과를 소유해야 하는 운영 화면은 `rows` 대신 `dataSource`를 지정할 수 있다.

```tsx
<F1Grid
  columns={columns}
  rowKey="id"
  dataSource={{
    pageSize: 200,
    load: ({ offset, limit, sorts, filters, signal }) =>
      inventoryService.search({
        offset,
        limit,
        sorts,
        filters,
        signal,
      }),
  }}
  onDataSourceError={(error) => notify(error.message)}
/>
```

- 새 정렬/필터 요청은 이전 요청의 `AbortSignal`을 취소한다.
- 응답은 `{ rows, totalRowCount }` 구조를 사용한다.
- 로드된 하단 overscan 영역에 도달하면 현재 로드 건수를 `offset`으로 다음 페이지를 자동 요청한다.
- 다음 페이지를 추가하거나 서버 결과를 교체해도 local dirty row와 sparse patch는 유지한다.
- 서버 모드에서는 로컬 Worker 정렬/필터를 중복 적용하지 않는다.
- 기존 `rows` 기반 화면은 변경 없이 로컬 모드로 동작한다.

## Phase 8 - Advanced

```text
1. Row Merge
2. Grouping
3. Tree Grid
4. Undo/Redo
5. Context Menu
6. Advanced Excel
```

---

# 32. 테스트 기준

각 기능은 구현 후 반드시 테스트한다.

## 기본

```text
Grid 렌더링
Row 렌더링
Column 렌더링
```

## Selection

```text
Single
Multi
Checkbox
Shift
Ctrl
Select All
```

## Editing

```text
Text
Number
Date
Select
Autocomplete
```

## Keyboard

```text
Arrow
Tab
Enter
F2
Insert
Delete
Ctrl+C
Ctrl+V
```

## Excel

```text
1행 붙여넣기
다중행 붙여넣기
다중열 붙여넣기
빈 셀
숫자
날짜
```

## Data

```text
Sorting
Filtering
Pagination
Aggregation
```

## Row Merge

```text
같은 값 자동 병합
mergeKey 기반 복합 병합
정렬 후 병합 범위 재계산
필터 후 병합 범위 재계산
페이지 변경 후 병합 범위 재계산
병합 셀 Focus
병합 셀 선택
Virtual Scroll 병합 표시
Excel Export 원본값 반복 출력
```

## Performance

최소 다음 데이터를 테스트한다.

```text
1,000 rows
10,000 rows
```

대용량 조회 테스트:

```text
초기 조회 시 현재 Page만 요청
검색 조건 빠른 변경 시 마지막 요청만 반영
정렬 변경 시 서버 Query 재생성
필터 변경 시 서버 Query 재생성
페이지 변경 시 선택/편집 상태 오염 없음
Virtual Scroll DOM Node 수 제한
10,000건 스크롤 중 입력 지연 확인
totalCount 비활성 화면 조회 확인
서버 집계 결과 표시 확인
Excel Export 서버 분리 확인
```

---

# 33. Agent 작업 규칙

Agent는 다음 규칙을 반드시 지킨다.

### Rule 1

기존 프로젝트 구조를 먼저 확인한다.

```text
package.json
tsconfig
vite.config
src/
공통 컴포넌트
Theme
State Management
```

을 확인한 후 구현한다.

### Rule 2

기존 프로젝트에 이미 존재하는 공통 기능을 재사용한다.

중복 구현하지 않는다.

### Rule 3

하나의 파일에 지나치게 많은 코드를 작성하지 않는다.

### Rule 4

기능별로 모듈을 분리한다.

### Rule 5

새로운 라이브러리를 추가하기 전에 반드시 필요성을 검토한다.

### Rule 6

외부 Grid Library를 추가하지 않는다.

### Rule 7

기능 구현 후 테스트를 작성한다.

### Rule 8

기존 ERP 화면에서 사용하는 UX 패턴과 일관성을 유지한다.

### Rule 9

ERP 업무 특성을 고려하지 않은 일반적인 Table UI를 구현하지 않는다.

### Rule 10

성능 최적화는 기능 구현 이후가 아니라 Architecture 단계부터 고려한다.

---

# 34. Definition of Done

기능이 완료되었다고 판단하기 위한 조건:

```text
[ ] TypeScript 오류 없음
[ ] ESLint 오류 없음
[ ] Unit Test 통과
[ ] 기존 Grid 기능 영향 없음
[ ] Keyboard 동작 확인
[ ] Excel Clipboard 확인
[ ] 10,000건 테스트
[ ] 불필요한 Re-render 확인
[ ] API와 독립적인 구조
[ ] 재사용 가능한 Component
[ ] Public API 문서화
```

---

# 35. 최종 목표

최종적으로 ERP 각 화면에서 다음과 같이 사용할 수 있는 Grid를 만든다.

```tsx
<F1Grid
  gridId="SALES_ORDER"
  columns={columns}
  rows={rows}
  editable
  selectable="multiple"
  filterable
  sortable
  pagination
  onChange={handleChange}
/>
```

그리고 구매, 판매, 생산, 재고, 회계, 인사 등 모든 ERP 화면에서 동일한 Grid를 사용한다.

```text
ERP
│
├── 구매
│   ├── 구매요청
│   ├── 발주
│   └── 입고
│
├── 판매
│   ├── 견적
│   ├── 주문
│   └── 출고
│
├── 생산
│   ├── 작업지시
│   ├── BOM
│   └── 생산실적
│
├── 재고
│   ├── 재고조회
│   └── 재고이동
│
└── 회계
    ├── 전표
    └── 결산
```

모든 화면이 동일한 Grid UX를 사용하도록 한다.

**핵심 목표는 "ERP 개발자가 Grid를 개발하는 것이 아니라, Grid를 조합하여 ERP 화면을 개발하는 구조"를 만드는 것이다.**

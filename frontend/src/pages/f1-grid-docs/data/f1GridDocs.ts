import type { F1GridDoc, F1GridDocGroup } from '../types';
import { f1GridApiReferenceDoc } from './f1GridApiReference';

const code = `const columns = [
  { field: 'itemCode', headerName: '품목코드', editable: true },
  { field: 'itemName', headerName: '품목명', wrapText: true },
];

<F1Grid rows={rows} columns={columns} rowKey="id" />`;

export const f1GridDocGroups: Array<{
  id: F1GridDocGroup;
  label: string;
}> = [
  { id: 'getting-started', label: '시작하기' },
  { id: 'grid-data', label: '그리드와 데이터' },
  { id: 'editing-validation', label: '편집과 검증' },
  { id: 'selection-actions', label: '선택·클립보드·행 작업' },
  { id: 'filtering-sorting', label: '필터와 정렬' },
  { id: 'column-layout', label: '컬럼·레이아웃·행 높이' },
  { id: 'large-data', label: '대용량 데이터' },
  { id: 'tree-grid', label: '트리 그리드' },
  { id: 'row-merge', label: '행 병합' },
  { id: 'plugins', label: '플러그인과 확장' },
  { id: 'api-reference', label: 'API 참조' },
  { id: 'testing', label: '테스트' },
];

export const f1GridDocs: F1GridDoc[] = [
  {
    id: 'overview',
    title: 'F1-Grid',
    category: 'guide',
    group: 'getting-started',
    description: 'ERP 화면을 위한 키보드 중심 데이터 그리드 문서입니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Build for working data',
        body: '문서를 읽고 바로 실행 예제로 확인하세요. 모든 예제는 로컬 샘플 데이터로 동작합니다. F1-Grid는 표준 CRUD, 선택 상태, 정렬/필터, 트리 구조, 편집 플러그인까지 ERP 운영 화면에 필요한 흐름을 하나의 핵심 컴포넌트로 묶어 둡니다.',
      },
      {
        type: 'api',
        heading: 'Core capabilities',
        rows: [
          ['rows', 'T[]', '표시할 데이터 집합'],
          ['columns', 'F1GridColumn<T>[]', '필드별 표시/편집 정책'],
          ['rowKey', 'keyof T', '행마다 안정적이고 고유한 행 식별자'],
          ['editorPlugins', 'F1GridEditorPlugin<T>[]', '커스텀 편집기 확장'],
        ],
      },
      { type: 'code', heading: 'A small, typed grid', code },
    ],
  },
  {
    id: 'getting-started',
    title: '첫 그리드 만들기',
    category: 'guide',
    group: 'getting-started',
    description: '첫 Grid를 만들고 컬럼 정의를 시작합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Start with columns',
        body: '행 데이터와 컬럼 설정을 준비한 뒤 rowKey를 지정합니다. 열 폭, 고정 여부, 편집 허용 여부는 컬럼 수준에서 공통 정책으로 관리해 화면 코드가 단순해집니다.',
      },
      {
        type: 'code',
        heading: 'First grid',
        code: `const columns = [{ field: 'itemCode', headerName: '품목코드', width: 140, editable: true }];\n<F1Grid rows={rows} columns={columns} rowKey="id" />`,
      },
    ],
  },
  {
    id: 'core-grid',
    title: '기본 그리드',
    category: 'feature',
    group: 'grid-data',
    description: '정렬, 필터, 선택과 행 상태의 기본 동작을 확인합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Core behavior',
        body: 'F1-Grid는 Excel 같은 입력 흐름과 ERP 업무에 필요한 행 상태를 제공합니다. 선택된 행, 변경 여부, 항목별 필터와 정렬은 표준 인터페이스를 유지하면서도 화면에서 쉽게 재사용됩니다.',
      },
      {
        type: 'api',
        heading: 'Core props',
        rows: [
          ['rows', 'T[]', '표시할 행'],
          ['columns', 'F1GridColumn<T>[]', '컬럼 정의'],
          ['rowKey', 'keyof T', '행마다 안정적이고 고유한 행 식별자'],
          ['ariaLabel', 'string', '그리드 영역 접근성 레이블 (기본값 F1-GRID)'],
          [
            'height / minHeight / maxHeight',
            'number | string',
            '그리드 컨테이너 높이와 최소/최대 높이 제한',
          ],
          [
            'columnLine',
            'boolean',
            '컬럼 사이 세로 구분선 표시 여부 (기본값 true)',
          ],
          [
            'stripeRows',
            'boolean',
            '홀수 행 배경 스트라이프 표시 여부 (기본값 true)',
          ],
          [
            'storageKey',
            'string',
            '컬럼 레이아웃 저장 키 (그리드마다 고유한 값, 미지정 시 저장하지 않음)',
          ],
          ['showCheckbox', 'boolean', '행 선택 체크박스 표시 여부'],
          [
            'loading',
            'boolean',
            '전체 입력을 막는 테마 배경 오버레이 중앙에 34px 공통 AppLoadingSpinner를 2.4px 두께로 표시. MUI indeterminate 원호 애니메이션 사용',
          ],
          ['onSelectionChange', '(ids) => void', '선택 상태 변경 콜백'],
          [
            'onChangesChange',
            '(changes) => void',
            'insertedRows/updatedRows/deletedRows 변경 콜백',
          ],
        ],
      },
      {
        type: 'prose',
        heading: 'Row state',
        body: '각 행은 normal, inserted, updated, deleted 상태를 가지며 grid.getChanges()로 세 목록을 추출할 수 있습니다.',
      },
    ],
    playground: 'selection',
  },
  {
    id: 'editing',
    title: 'Cell Editing',
    category: 'feature',
    group: 'editing-validation',
    description: '텍스트, 숫자, 날짜, 코드 셀을 인라인으로 편집합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Edit in place',
        body: 'editable 컬럼은 셀에 초점을 맞추고 바로 값을 입력할 수 있습니다. 컬럼 타입을 지정하면 날짜, 금액, 코드, 체크박스 등 업무 형태에 맞는 편집 UI를 삽입할 수 있습니다.',
      },
      {
        type: 'api',
        heading: 'Editing options',
        rows: [
          ['editable', 'boolean | (row) => boolean', '편집 가능 여부'],
          [
            'type',
            'text | number | decimal | currency | checkbox | date | datetime | time | select | autocomplete | code | rownumber',
            '편집기 유형',
          ],
          ['options', 'F1GridOption[]', 'select/autocomplete 선택 목록'],
          ['format', 'number | decimal | currency', '숫자 컬럼 표시 형식'],
          [
            'decimalPlaces',
            'number',
            'number/decimal 기본 최대 5자리(끝의 0 생략), 지정 시 고정 표시',
          ],
          ['required / min / max', 'boolean / number', '기본 검증 규칙'],
          ['validation.unique', "boolean | 'digits'", "전체 활성 행의 고유값 검사. true는 문자열 trim, 'digits'는 숫자만 비교. 자기 행·빈 비교키 제외"],
          ['validate', '(value, row) => string | boolean', '값 검증 규칙'],
          [
            'selectOnFocus',
            'boolean (기본 true)',
            '포커스 시 입력값 전체 선택 여부',
          ],
          [
            'onOpenCodePicker',
            '(row, applyPatch) => Partial<T>',
            '코드 선택기 연동',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'Editor Plugin lifecycle',
        rows: [
          [
            'editorPlugins / editors',
            'F1GridEditorPlugin<T>[]',
            '커스텀 편집기 확장 목록 (editors는 호환 별칭)',
          ],
          ['canEdit', '(context) => boolean', '편집 가능 여부 판단'],
          ['createEditor', '(context) => ReactNode', '커스텀 편집 UI 렌더링'],
          [
            'startEdit / endEdit',
            '(context) => boolean | void',
            '편집 시작/종료 훅, false 반환 시 중단',
          ],
          [
            'onBeforeEdit / onAfterEdit',
            'F1GridEditLifecycle<T>',
            'Grid 단위 편집 전/후 훅 (beforeEdit/afterEdit는 호환 별칭)',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'Cell render hooks',
        rows: [
          [
            'renderCell',
            '(context) => ReactNode',
            '표시 모드에서만 적용되는 커스텀 셀 렌더러',
          ],
          [
            'getCellStyle',
            '(context) => CSSProperties | undefined',
            '동적 셀 스타일 반환',
          ],
          [
            'getCellProps',
            '(context) => { className, style, title, aria-label } | undefined',
            '셀 속성/ARIA/title 확장',
          ],
        ],
      },
      {
        type: 'prose',
        heading: 'Editable header indicator',
        body: '편집 가능 여부에 따른 헤더 강조선은 표시하지 않는다. 별도 아이콘이나 배경색은 추가하지 않으며 기존 셀 편집 테두리, 고정 컬럼 및 드롭 대상 그림자와 그룹 헤더 구분선은 유지된다. 테스트/디버깅용 data-editable-column 속성은 visibleRows에서 isCellEditable(column, row)와 활성 editor plugin의 canEdit(context) 조건을 모두 만족할 때 적용된다.',
      },
      { type: 'code', heading: 'Editable column', code },
      {
        type: 'code',
        heading: 'Number format column',
        code: "{ field: 'amount', headerName: '금액', type: 'number' } // 최대 5자리, 끝의 0 생략\n{ field: 'unitPrice', headerName: '단가', type: 'number', decimalPlaces: 2 } // 1.2 -> 1.20\n{ field: 'price', headerName: '가격', type: 'currency', format: 'currency' } // KRW, 기본 0자리",
      },
      {
        type: 'prose',
        heading: 'Dirty cell indicator',
        body: '값이 변경된 셀은 좌측 상단에 작은 표시가 나타나며, 편집 중인 셀에서는 표시가 숨겨집니다.',
      },
    ],
    playground: 'editing',
  },
  {
    id: 'row-form-modal',
    title: 'Row Form Modal',
    category: 'feature',
    group: 'plugins',
    description:
      '컬럼 정의에서 신규·수정 행 폼을 만들고 Grid 변경 상태에 적용합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Activate explicitly',
        body: 'rowFormPlugin을 전달하고 enabled가 false가 아닐 때만 우측 고정 상세 열과 신규·수정 모달이 활성화됩니다. 상세 열은 해제할 수 없는 폼 플러그인 전용 우측 pin 1번 영역이며, 사용자가 다른 컬럼을 오른쪽 고정하면 상세 열 왼쪽의 2번 이후 고정 영역에 배치됩니다. 플러그인이 없거나 비활성이면 인라인 편집과 즉시 행 추가를 포함한 기존 동작이 그대로 유지됩니다.',
      },
      {
        type: 'api',
        heading: 'F1GridRowFormPlugin',
        rows: [
          ['rowFormPlugin', 'F1GridRowFormPlugin<T>', '선택형 행 폼 플러그인'],
          ['enabled', 'boolean (기본 true)', '상세 열과 모달 활성화 여부'],
          [
            'getTitle / getDescription',
            '함수',
            '모드와 draft 행 기반 헤더 재정의',
          ],
          [
            'onBeforeApply',
            '(context) => boolean | void',
            'false 반환 시 적용 중단 및 모달 유지',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'F1GridColumn.form',
        rows: [
          ['form.hidden', 'boolean', '폼 포함 여부 재정의'],
          [
            'form.readOnly',
            'boolean | (row, mode) => boolean',
            '읽기 전용 재정의',
          ],
          ['form.label', 'string', 'headerName 대신 사용할 라벨'],
          [
            'form.group',
            'string',
            '그룹 우선순위: form.group → headerGroup → 기본 정보',
          ],
          ['form.order', 'number', '폼 전체 필드 정렬 순서'],
          ['form.span', '1 | 2 | 3', '데스크톱 3열 기준 점유 폭'],
        ],
      },
      {
        type: 'prose',
        heading: 'Automatic mapping and validation',
        body: 'headerName은 기본 라벨, headerGroup은 자동 섹션이 되고 text, number, decimal, currency, checkbox, date, datetime, time, select, autocomplete, code 타입은 대응 입력으로 변환됩니다. 숨김·행번호·합성 열은 기본 제외되며 required, inputFormat 자리수, min, max, validation.unique, validate는 폼 포함 컬럼에 적용됩니다. unique는 전체 활성 행을 비교하고 자기 행은 제외합니다. 폼 적용과 validate()의 실제 오류는 onValidationErrors 콜백으로 페이지 메시지에 연결할 수 있습니다. 읽기 전용은 form.readOnly, editable 함수, editable 값 순으로 판정합니다.',
      },
      {
        type: 'api',
        heading: 'Draft lifecycle',
        rows: [
          ['수정', '상세 → draft → 적용', '변경 필드만 기존 dirty 상태에 반영'],
          [
            '신규',
            'addRow() → createRow() → 적용',
            '적용할 때만 inserted 행 생성',
          ],
          ['취소 / 닫기', 'draft 폐기', 'Grid 행과 변경 이력은 그대로 유지'],
          [
            '검증 실패',
            '모달 유지',
            '오류 표시 후 첫 오류 입력으로 포커스 이동',
          ],
          [
            '서버 저장',
            '수행하지 않음',
            '기존 화면의 getChanges()와 저장 흐름이 담당',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'F1-Tree and responsive behavior',
        rows: [
          [
            '루트 추가',
            'F1TreeRef.addRow()',
            '부모 기본값을 유지한 신규 draft',
          ],
          [
            '하위 추가',
            'F1TreeRef.addChildRow(parentId)',
            'parentKey를 보존하고 적용 후 부모 펼침',
          ],
          ['1280px 이상', '최대 960px / 3열', 'form.span 1~3 적용'],
          ['768px 이상', '가용 폭 / 2열', 'span은 최대 2열로 제한'],
          [
            '768px 미만',
            'fullScreen / 1열',
            '375px부터 겹침과 페이지 가로 스크롤 방지',
          ],
          [
            'theme tokens',
            'background / text / divider / primary / action',
            '라이트·다크 테마 공통 사용',
          ],
        ],
      },
      {
        type: 'code',
        heading: 'Column-driven row form',
        code: `const columns = [
  { field: 'name', headerName: '품목명', headerGroup: '기본 정보', editable: true, form: { span: 2 } },
  { field: 'quantity', headerName: '수량', headerGroup: '기본 정보', type: 'number', editable: true },
  { field: 'active', headerName: '사용 여부', headerGroup: '운영 정보', type: 'checkbox', editable: true },
];

<F1Grid
  ref={gridRef}
  rows={rows}
  columns={columns}
  rowKey="id"
  createRow={() => ({ id: crypto.randomUUID(), name: '', quantity: 0, active: true })}
  rowFormPlugin={{ enabled: true }}
/>`,
      },
    ],
    playground: 'row-form-modal',
  },
  {
    id: 'selection',
    title: '선택과 클립보드',
    category: 'feature',
    group: 'selection-actions',
    description: '행 선택과 셀 범위 선택, 클립보드 흐름을 확인합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Move quickly',
        body: '키보드와 마우스로 범위를 선택하고 변경 상태를 확인합니다. 선택 기반 작업은 저장 전 변경 영역을 추적하고, 복사/붙여넣기 흐름을 표준화할 때 강력합니다.',
      },
      {
        type: 'api',
        heading: 'Selection props',
        rows: [
          [
            'showCheckbox',
            'boolean',
            '행 선택용 체크박스 컬럼(Row Selector) 전체 표시 여부',
          ],
          [
            'headerCheckbox',
            'F1GridColumn 옵션',
            "type: 'checkbox' 데이터 컬럼에서 헤더 클릭으로 전체 값 편집",
          ],
          ['onSelectionChange', '(ids) => void', '선택 변경 콜백'],
        ],
      },
      {
        type: 'prose',
        heading: 'showCheckbox vs headerCheckbox',
        body: 'showCheckbox는 행 선택용 체크박스 컬럼 전체를 켜고 끄고, headerCheckbox는 type이 checkbox인 데이터 컬럼에서 헤더 클릭으로 전체 값을 편집하는 기능입니다. 이름은 비슷하지만 서로 다른 책임을 가지므로 혼동하지 않아야 합니다.',
      },
      {
        type: 'api',
        heading: 'Clipboard & range selection',
        rows: [
          [
            'Ctrl+C / Ctrl+V',
            '-',
            '선택 범위 또는 셀 범위를 Excel 호환 TSV로 복사/붙여넣기',
          ],
          [
            '드래그 범위 선택',
            '-',
            '마우스 드래그로 인접 셀 범위를 선택하고 오버레이로 표시',
          ],
          [
            'dirty-cell 표시',
            '-',
            '값이 변경된 셀에 좌상단 마크 표시 (data-dirty-cell)',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'Selection Ref API',
        rows: [
          ['getSelectedRows()', 'T[]', '선택된 행 데이터 반환'],
          ['getSelectedRowIds()', 'F1GridRowId[]', '선택된 행 id 반환'],
          ['clearSelection()', 'void', '선택 상태 초기화'],
        ],
      },
    ],
    playground: 'selection',
  },
  {
    id: 'filtering-sorting',
    title: '필터와 정렬',
    category: 'feature',
    group: 'filtering-sorting',
    description: 'Grid 헤더 필터와 페이지 상세검색의 차이 및 연결 방법을 안내합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Find a row',
        body: '컬럼 헤더 메뉴를 통해 데이터를 업무 순서에 맞게 정리합니다. 기본 정렬/필터는 헤더 액션에서 바로 노출되며, 일부 화면은 disableSorting/disableFiltering로 비활성화가 가능합니다.',
      },
      {
        type: 'api',
        heading: 'Sort/filter controls',
        rows: [
          ['disableSorting', 'boolean', '개별 화면에서 정렬 비활성화'],
          ['disableFiltering', 'boolean', '개별 화면에서 필터 비활성화'],
          ['pinned', 'left | right', '고정 컬럼과 정렬 메뉴 조합 지원'],
        ],
      },
      {
        type: 'api',
        heading: 'Filter operators',
        rows: [
          ['equals', '-', '같음'],
          ['notEquals', '-', '같지 않음'],
          ['contains', '-', '포함'],
          ['startsWith', '-', '시작 문자'],
          ['endsWith', '-', '끝 문자'],
          ['greaterThan', '-', '초과'],
          ['lessThan', '-', '미만'],
          ['greaterThanOrEqual', '-', '이상'],
          ['lessThanOrEqual', '-', '이하'],
          ['between', '-', '범위'],
          ['isEmpty', '-', '비어 있음'],
          ['isNotEmpty', '-', '비어 있지 않음'],
        ],
      },
      {
        type: 'prose',
        heading: 'Multi-column sort',
        body: '정렬 상태는 F1GridSort<T>[] 배열로 다중 컬럼을 지원하며, 필터와 정렬 모두 현재 화면에 표시된 행을 기준으로 다시 계산됩니다.',
      },
      {
        type: 'code',
        heading: 'Disable when needed',
        code: '<F1Grid disableSorting disableFiltering {...props} />',
      },
      {
        type: 'prose',
        heading: '상세검색은 이렇게 연결됩니다',
        body: '먼저 두 가지 검색을 구분하세요. Grid 헤더 필터는 이미 그리드에 표시된 행을 필터링하고, PageSearchArea 상세검색은 컬럼 설정을 페이지 검색 폼에 연결해 목록 조회 조건으로 사용합니다. 전체 흐름은 F1GridColumn.search → toPageSearchFields(columns) → PageSearchArea → 페이지 필터 → 목록 API입니다. F1-Grid는 검색 폼을 만들기 위한 정보를 제공할 뿐, 업무 API를 호출하지 않습니다. 이 안내에서는 실제 기안양식 관리 화면의 분류, 등록주기, 사용여부 검색을 따라가며 일반 날짜 범위는 별도 예제로 분리합니다.',
      },
      {
        type: 'prose',
        heading: '검색 필드는 컬럼 기준으로 고릅니다',
        body: '검색 폼에 보여 줄 컬럼만 검색 메타데이터를 설정합니다. 아래는 실제 createDraftFormColumns에서 상세검색과 관련된 컬럼을 발췌한 예입니다. 양식코드와 양식명은 상세검색 폼에서 숨기지만, 별도의 기본 키워드 입력으로 검색합니다.',
      },
      {
        type: 'code',
        heading: '1단계: 검색할 컬럼 고르기',
        code: `const columns: F1GridColumn<DraftFormRow>[] = [
  {
    field: 'cataTypeCode',
    headerName: '양식코드',
    search: { hidden: true },
  },
  {
    field: 'codeName',
    headerName: '양식명',
    search: { hidden: true },
  },
  {
    field: 'categoryItemId',
    headerName: '분류',
    type: 'select',
    options: categoryItems.map((item) => ({
      value: Number(item.id),
      label: item.itemNm,
    })),
    search: { label: '분류', order: 1 },
  },
  {
    field: 'regTermId',
    headerName: '등록주기',
    type: 'select',
    options: cycleItems.map((item) => ({
      value: Number(item.id),
      label: item.itemNm,
    })),
    search: { label: '등록주기', order: 2 },
  },
  {
    field: 'useAt',
    headerName: '사용여부',
    type: 'select',
    options: [
      { value: 'Y', label: '사용' },
      { value: 'N', label: '미사용' },
    ],
    search: { label: '사용여부', order: 3 },
  },
];`,
      },
      {
        type: 'prose',
        heading: '검색 메타데이터 한눈에 보기',
        body: 'search.hidden은 검색 폼에서만 제외하며, column.hidden은 그리드에서 컬럼 자체를 숨깁니다. 실제 기안양식 화면에서는 양식코드와 양식명에 search.hidden을 사용하고 양식명/코드 키워드 검색은 기본 검색 입력이 담당합니다.',
      },
      {
        type: 'api',
        heading: '검색 필드 설정과 변환 결과',
        rows: [
          ['search.hidden', 'boolean', 'true이면 상세검색 필드에서 제외'],
          ['column.hidden', 'boolean', 'true이면 숨겨진 컬럼이므로 검색 필드에서도 제외'],
          ['search.label', 'string', '검색 필드 레이블; 생략하면 headerName 사용'],
          ['search.group', 'string', '필드 그룹 이름'],
          ['search.order', 'number', '지정한 순서대로 배치; 미지정 필드는 컬럼 순서대로 뒤에 배치'],
          ['search.span', '1 | 2 | 3 | 4 | 5', '검색 필드 너비인 searchSpan으로 변환; 기본값 1'],
          ['type / options', 'F1GridColumn', '지원 타입과 select 선택지를 컬럼에서 가져옴'],
          ['form.span', 'number', '행 편집 폼의 너비이며 search.span과 별도'],
        ],
      },
      {
        type: 'prose',
        heading: '검색 필드 설정을 준비합니다',
        body: 'toPageSearchFields(columns)는 컬럼 메타데이터를 PageSearchArea가 읽을 UI 설정으로 바꿉니다. 결과에는 field, label, type, searchSpan과 설정한 경우 group/options가 들어갑니다. 이 함수는 검색 파라미터나 서버 요청을 만들지 않습니다.',
      },
      {
        type: 'code',
        heading: '2단계: 검색 필드 만들기',
        code: `const detailFields = useMemo(
  () => toPageSearchFields(columns),
  [columns],
);`,
      },
      {
        type: 'prose',
        heading: '입력값은 페이지 상태로 관리합니다',
        body: 'PageSearchArea는 detailValues에 담긴 값을 표시하고 사용자가 입력을 바꾸면 onDetailValuesChange로 새 값을 알립니다. 상세검색 버튼을 누르면 onDetailSearch(values)가 호출됩니다. 양식코드/양식명 같은 기본 키워드는 별도 입력과 onDefaultSearch를 사용하며, 상세 조건에 합칠지는 페이지가 결정합니다.',
      },
      {
        type: 'code',
        heading: '3단계: 검색 영역에 연결하기',
        code: `<PageSearchArea
  searchField={defaultSearchInput}
  onDefaultSearch={handleDefaultSearch}
  detailFields={detailFields}
  detailValues={detailValues}
  onDetailValuesChange={setDetailValues}
  onDetailSearch={handleDetailSearch}
  detailLoading={management.loading}
/>`,
      },
      {
        type: 'prose',
        heading: '페이지에서 조회 조건을 만듭니다',
        body: '검색 입력값을 현재 화면의 필터 타입으로 바꾸는 것도 페이지의 책임입니다. 분류와 등록주기는 숫자 ID로 바꾸고, 사용여부는 Y 또는 N일 때만 넣습니다. 실제 기안양식 화면은 미저장 Grid 변경이 있으면 확인 대화상자를 먼저 보여 줍니다. 확인 후 변경을 버리고 검색을 적용하며, 목록 API 요청과 로딩/오류 처리는 페이지와 management hook/service가 맡습니다.',
      },
      {
        type: 'code',
        heading: '4단계: 조회 조건으로 바꾸기',
        code: `const selected = (value: PageSearchFieldValue | undefined) =>
  value == null || typeof value === 'object' ? '' : String(value).trim();

const handleDetailSearch = (
  values: Record<string, PageSearchFieldValue>,
) => {
  const useAt = selected(values.useAt);
  requestSearch({
    keyword: searchQuery.trim() || undefined,
    categoryItemId: selected(values.categoryItemId)
      ? Number(selected(values.categoryItemId))
      : undefined,
    regTermId: selected(values.regTermId)
      ? Number(selected(values.regTermId))
      : undefined,
    useAt: useAt === 'Y' || useAt === 'N' ? useAt : undefined,
  });
};`,
      },
      {
        type: 'prose',
        heading: '예제에서 생략한 실제 화면 맥락',
        body: '다음은 기존 DraftFormManagementPage 함수 안의 검색 연결을 한 흐름으로 묶은 예제입니다. management는 useDraftFormManagement()에서 오며 columns는 createDraftFormColumns(management.categoryItems, management.cycleItems, management.users, ...)를 useMemo로 만든 값입니다. 코드는 해당 화면의 기존 React/MUI 컴포넌트와 타입 import를 사용하는 검색 연동 발췌이며, 전체 CRUD 화면을 대체하지 않습니다. PageMessageArea는 management.error를 표시하고 실제 화면은 권한, 미저장 편집 확인, 오류 표시 및 다이얼로그 흐름을 유지합니다.',
      },
      {
        type: 'code',
        heading: '전체 예제: 기안양식 검색',
        code: `const [searchQuery, setSearchQuery] = useState('');
const [detailValues, setDetailValues] = useState<
  Record<string, PageSearchFieldValue>
>({});
const [pendingFilters, setPendingFilters] =
  useState<DraftFormFilters | null>(null);
const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);

const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

const requestSearch = (filters: DraftFormFilters) => {
  if (management.hasChanges) {
    setPendingFilters(filters);
    setRefreshConfirmOpen(true);
    return;
  }
  management.applyFilters(filters);
};

const selected = (value: PageSearchFieldValue | undefined) =>
  value == null || typeof value === 'object' ? '' : String(value).trim();

const handleDetailSearch = (
  values: Record<string, PageSearchFieldValue>,
) => {
  const useAt = selected(values.useAt);
  requestSearch({
    keyword: searchQuery.trim() || undefined,
    categoryItemId: selected(values.categoryItemId)
      ? Number(selected(values.categoryItemId))
      : undefined,
    regTermId: selected(values.regTermId)
      ? Number(selected(values.regTermId))
      : undefined,
    useAt: useAt === 'Y' || useAt === 'N' ? useAt : undefined,
  });
};

const handleDefaultSearch = () => {
  requestSearch({
    ...management.appliedFilters,
    keyword: searchQuery.trim() || undefined,
  });
};

const defaultSearchInput = (
  <TextField
    size="small"
    placeholder="양식코드/양식명 검색"
    value={searchQuery}
    onChange={(event) => setSearchQuery(event.target.value)}
  />
);

return (
  <>
    <PageSearchArea
      searchField={defaultSearchInput}
      onDefaultSearch={handleDefaultSearch}
      detailFields={detailFields}
      detailValues={detailValues}
      onDetailValuesChange={setDetailValues}
      onDetailSearch={handleDetailSearch}
      detailLoading={management.loading}
    />
    <PageMessageArea
      message={management.error}
      onClose={() => management.setError('')}
    />
    <UnsavedChangesConfirmDialog
      open={refreshConfirmOpen}
      title="저장하지 않은 변경사항"
      description="변경사항을 버리고 기안양식 목록을 다시 불러오시겠습니까?"
      cancelLabel="취소"
      continueLabel="계속"
      onCancel={() => {
        setRefreshConfirmOpen(false);
        setPendingFilters(null);
      }}
      onContinue={() => {
        const filters = pendingFilters;
        setRefreshConfirmOpen(false);
        setPendingFilters(null);
        if (!filters) return;
        management.discardChanges();
        management.applyFilters(filters);
      }}
    />
  </>
);`,
      },
      {
        type: 'prose',
        heading: '날짜 검색은 필요한 화면에 별도로 추가합니다',
        body: '현재 기안양식 관리 화면은 등록일 상세검색을 제공하지 않습니다. 아래는 날짜 범위가 필요한 다른 화면에서 사용할 수 있는 일반 예제입니다. 날짜 입력값의 모양까지만 설명하며, 서버 파라미터 이름이나 조회 동작은 각 API 계약에 맞춰 페이지에서 정해야 합니다.',
      },
      {
        type: 'code',
        heading: '날짜 범위 조건이 필요한 경우',
        code: `const dateColumns: F1GridColumn<OtherRow>[] = [
  {
    field: 'createdAt',
    headerName: '등록일',
    type: 'date',
    search: { label: '등록일', order: 1, span: 2 },
  },
];

const detailFields = toPageSearchFields(dateColumns);
const detailValues = {
  createdAt: { from: '2026-01-01', to: '2026-01-31' },
};`,
      },
      {
        type: 'prose',
        heading: '날짜 숫자 입력과 달력 선택',
        body: '공통 날짜 입력은 셀 편집기와 같은 축약 입력과 달력 선택을 지원합니다. 20261022 또는 261022는 2026-10-22로, 1022와 10-22는 올해 10월 22일로, 22는 이번 달 22일로 변환합니다. YYYY-MM-DD 입력도 가능합니다. 포커스를 옮기거나 조회할 때 실제 존재하는 날짜인지 확인해 확정합니다. 잘못된 날짜는 원문과 오류를 표시하고 조회하지 않고 검색창을 유지합니다. 빈 시작일·종료일은 해당 범위 제한이 없다는 의미입니다. 입력 중 onDetailValuesChange에는 미완성 문자열이 포함될 수 있지만 onDetailSearch에는 정규화된 값만 전달합니다. 생략한 연·월은 기존 편집기와 동일하게 브라우저 로컬 날짜를 기준으로 채우며, 서버 기준 검색 기본값·초기화·조건 복원 정책은 바꾸지 않습니다. 좁은 검색 영역에서는 시작일과 종료일을 세로로 배치합니다.',
      },
      {
        type: 'prose',
        heading: '검색 동작을 끝까지 확인합니다',
        body: '상세검색 지원 타입은 text, number, decimal, currency, date, select, checkbox입니다. 지원하지 않는 컬럼 타입은 text로 변환되고, select 옵션은 컬럼 options에서 가져옵니다. search.hidden은 상세검색 폼에서만 필드를 제외하고 column.hidden은 컬럼 자체를 숨깁니다. 검색 메타데이터가 없는 컬럼도 기본 설정으로 포함될 수 있으므로 화면에서 제외할 컬럼은 명시적으로 숨기세요. F1GridColumn.search를 포털에서 검색하면 API 참조의 관련 항목으로 이동할 수 있습니다.',
      },
      {
        type: 'api',
        heading: '빠른 참조: 설정과 주의점',
        rows: [
          ['지원 type', 'text | number | decimal | currency | date | select | checkbox', '상세검색 입력 필드 종류'],
          ['미지원 type', 'text fallback', '검색 UI에서 문자열 입력으로 처리'],
          ['select options', 'F1GridOption[]', '각 항목의 value/label을 사용'],
          ['search.order', 'number', '미지정 필드는 컬럼 순서대로 뒤에 배치'],
          ['search.span', '1–5', '검색 필드 너비(searchSpan); 기본값 1'],
          ['form.span', 'number', '행 편집 폼 너비; 검색 필드 너비와 무관'],
          ['검색 요청', 'PageSearchArea callback', '조건 변환, API 요청, 로딩과 오류 처리는 페이지 책임'],
          ['Grid 헤더 필터', 'F1-Grid', '표시 중인 행의 컬럼 필터이며 페이지 상세검색과 별도'],
        ],
      },
    ],
  },
  {
    id: 'column-layout',
    title: '컬럼 레이아웃',
    category: 'feature',
    group: 'column-layout',
    description: '컬럼 고정, 표시, 순서 변경과 너비 조절을 다룹니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Shape the workspace',
        body: '중요한 컬럼은 고정하고 나머지는 화면에 맞춰 조정합니다. 컬럼 관리와 고정 상태는 스토리지에 저장해 화면을 다시 열어도 사용자 선호를 유지할 수 있습니다.',
      },
      {
        type: 'api',
        heading: 'Layout props',
        rows: [
          ['pinned', 'left | right', '컬럼 고정'],
          ['width / maxWidth', 'number', '기본/최대 너비'],
          ['flex', 'number', '가변 비율'],
          ['headerGroup', 'string', '헤더 상단 그룹 라벨'],
          ['hidden', 'boolean', '초기 숨김 여부 (헤더 메뉴에서 표시 전환)'],
          ['resizableColumns', 'boolean', '컬럼 크기 조정 허용'],
          [
            'storageKey',
            'string',
            '레이아웃 저장 키 (그리드마다 고유한 값, 미지정 시 저장하지 않음)',
          ],
        ],
      },
      {
        type: 'prose',
        heading: 'Header menu actions',
        body: '컬럼 헤더 메뉴에서 정렬, 필터, 고정, 숨김/표시, 자동 맞춤, 드래그 순서 변경을 모두 처리합니다. 마지막으로 표시된 컬럼은 숨길 수 없습니다.',
      },
    ],
    playground: 'layout',
  },
  {
    id: 'row-height',
    title: '행 높이',
    category: 'feature',
    group: 'column-layout',
    description: '행 높이와 긴 텍스트 줄바꿈을 실제 화면에서 조절합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Give data room',
        body: '기본 행 높이를 기준으로 긴 텍스트는 wrapText 설정에 따라 줄바꿈됩니다. ERP 화면은 한 셀이 길게 늘어나도 전체 표가 비정상적으로 무너지지 않도록 세부 값을 함께 제어합니다.',
      },
      {
        type: 'api',
        heading: 'Height options',
        rows: [
          ['rowHeight', 'number', '기본 행 높이'],
          ['minRowHeight', 'number', '최소 높이'],
          ['maxRowHeight', 'number', '최대 높이'],
          ['resizableRows', 'boolean', '사용자 행 높이 조절 허용'],
        ],
      },
      {
        type: 'code',
        heading: 'Resizable rows',
        code: '<F1Grid rowHeight={40} minRowHeight={40} maxRowHeight={300} resizableRows />',
      },
    ],
    playground: 'row-height',
  },
  {
    id: 'large-data',
    title: 'Large Dataset',
    category: 'feature',
    group: 'large-data',
    description:
      '1,000건/10,000건 대용량 샘플을 클릭으로 로드해 F1-Grid의 렌더링과 선택 상태를 검증합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Scale without losing the workflow',
        body: '대용량 데이터에서도 F1-Grid는 기존 흐름을 유지해야 합니다. 기본 미리보기는 가볍게 유지하고, 사용자가 1,000건 또는 10,000건을 선택했을 때만 로딩 스피너를 노출한 뒤 데이터를 조립합니다. 스크롤, 선택, 정렬, 체크박스, dirty 표시는 해당 기준으로 동일한 UX를 유지하는 것을 확인합니다.',
      },
      {
        type: 'api',
        heading: 'Large dataset sample sizes',
        rows: [
          ['1K target', 'preview target', '빠른 로딩 검증'],
          ['10K target', 'primary target', '대용량 기준선'],
          ['selection / scroll', 'preserved', '대용량 렌더링 기준'],
        ],
      },
      {
        type: 'code',
        heading: 'Generate large sample rows',
        code: `const createLargeDataset = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: \`row-\${index + 1}\`,
    itemCode: \`ITEM-\${String(index + 1).padStart(6, '0')}\`,
    itemName: \`대용량 시뮬레이션 품목 \${index + 1}\`,
    quantity: (index * 17) % 2000 + 10,
    amount: (index + 1) * 3850 + 12500,
    status: index % 3 === 0 ? 'active' : index % 2 === 0 ? 'hold' : 'pending',
  }));`,
      },
    ],
    playground: 'large-data',
  },
  {
    id: 'row-merge',
    title: '행 병합',
    category: 'feature',
    group: 'row-merge',
    description: '연속해서 같은 값을 가진 셀을 병합합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Read grouped data',
        body: 'mergeRows를 지정하면 연속된 동일 값이 하나의 시각적 그룹으로 표시됩니다. 품목명, 그룹명, 상태처럼 연속 그룹을 위한 필드에 적합합니다.',
      },
      {
        type: 'api',
        heading: 'Merge options',
        rows: [
          [
            'mergeRows',
            'boolean',
            '이전 행과 같은 값이면 셀 병합 (현재 boolean 계약만 지원)',
          ],
          ['wrapText', 'boolean', '긴 텍스트 줄바꿈 허용'],
        ],
      },
      {
        type: 'prose',
        heading: 'Pinned columns and range selection',
        body: 'mergeRows는 핀 고정 컬럼에서도 동일한 규칙으로 병합되며, 병합된 영역에서도 셀 드래그 범위 선택이 각 행을 정상적으로 지나갑니다. 병합 시작 행이 아닌 셀을 편집하면 해당 행만 분리되어 편집됩니다. mergeKey, mergeWhen, enableRowMerge, grid.refreshRowMerge()는 아직 구현되지 않았습니다.',
      },
      {
        type: 'code',
        heading: 'Merge a column',
        code: "{ field: 'itemName', mergeRows: true, pinned: 'left' }",
      },
    ],
    playground: 'row-merge',
  },
  {
    id: 'context-menu',
    title: '컨텍스트 메뉴',
    category: 'feature',
    group: 'selection-actions',
    description:
      '바디 우클릭으로 엑셀 내보내기, 행 추가, 필터/정렬 초기화, 레이아웃 복원 등을 수행하며 전체 메뉴를 비활성화할 수도 있습니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Fast actions at the cursor',
        body: '기본적으로 F1Grid와 F1Tree의 바디 영역을 우클릭하면 커서 위치에 컨텍스트 메뉴가 열립니다. disableContextMenu를 켜면 그리드 메뉴와 브라우저 기본 메뉴를 모두 막되 우클릭 대상 셀/행 선택은 유지합니다. 헤더의 정렬/필터/고정/숨김 메뉴는 영향을 받지 않습니다.',
      },
      {
        type: 'api',
        heading: 'Context menu props',
        rows: [
          [
            'disableContextMenu',
            'boolean',
            'F1Grid/F1Tree 바디 우클릭 메뉴 전체 비활성화 여부',
          ],
          ['canExportExcel', 'boolean', '엑셀 내보내기 메뉴 노출 여부'],
          ['excelFileName', 'string', '다운로드 파일명 기본값'],
          [
            'allowAddRowInContextMenu',
            'boolean',
            '우클릭 행 추가 메뉴 표시 여부',
          ],
          [
            'allowDuplicateRowInContextMenu',
            'boolean',
            '우클릭 행 복사 메뉴 표시 여부',
          ],
          [
            'allowDeleteRowInContextMenu',
            'boolean',
            '우클릭 행 삭제 메뉴 표시 여부',
          ],
          ['createDuplicate', '(row) => T', '복사용 신규 행 생성 로직'],
          [
            'loading',
            'boolean',
            '전체 입력을 막는 테마 배경 오버레이 중앙에 34px 공통 AppLoadingSpinner를 2.4px 두께로 표시. MUI indeterminate 원호 애니메이션 사용',
          ],
          ['minHeight', 'number | string', '그리드 최소 높이 제어'],
          [
            'treeContextMenu',
            'F1GridContextMenuTreeConfig',
            'F1Tree가 내부적으로 주입하는 트리 전용 콜백',
          ],
        ],
      },
      {
        type: 'code',
        heading: 'Disable the body context menu',
        code: `const columns = [{ field: 'name', headerName: '메뉴명', width: 220, editable: true }];

<F1Grid
  rows={rows}
  columns={columns}
  rowKey="id"
  disableContextMenu
/>`,
      },
    ],
    playground: 'context-menu',
  },
  {
    id: 'tree-grid',
    title: '트리 그리드',
    category: 'feature',
    group: 'tree-grid',
    description: '상하위 관계가 있는 데이터를 계층 구조로 표시합니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Navigate hierarchy',
        body: 'parentKey와 treeColumn을 지정해 트리 데이터를 표현합니다. 메뉴, 조직도, 계정 구조처럼 부모-자식 관계를 가진 데이터는 이 영역에서 한 번에 조작할 수 있습니다.',
      },
      {
        type: 'api',
        heading: 'Tree API',
        rows: [
          ['parentKey', 'keyof T', '부모 식별자 필드'],
          ['treeColumn', 'keyof T', '트리 노드 이름 표시 필드'],
          ['defaultExpandAll', 'boolean', '최초 렌더링 시 전체 펼침'],
          [
            'defaultExpanded',
            "'all' | 'root' | F1GridRowId[]",
            '초기 펼침 대상 지정',
          ],
          ['treeCheckbox', 'boolean', '트리 노드 체크박스 활성화'],
          [
            'syncWithTreeCheckbox',
            'boolean (컬럼 옵션, 기본 true)',
            'type: checkbox 컬럼 값을 트리 체크 상태와 동기화',
          ],
          ['getRowOrder', '(row) => number', '같은 부모 하위 정렬 기준'],
          [
            'onDeleteBlocked',
            '(rowIds) => void',
            '자식이 있는 행 삭제 시도 시 콜백',
          ],
          [
            'onTreeCheckboxChange',
            '(rowIds) => void',
            '트리 체크 상태 변경 콜백',
          ],
        ],
      },
      {
        type: 'api',
        heading: 'Tree Ref API',
        rows: [
          [
            'addChildRow(parentId, row?)',
            'void',
            '특정 부모의 자식 행 추가 및 자동 펼침',
          ],
          [
            'expandRow / collapseRow',
            '(rowId) => void',
            '개별 노드 펼치기/접기',
          ],
          ['expandAll / collapseAll', '() => void', '전체 펼치기/접기'],
          ['isExpanded(rowId)', 'boolean', '펼침 상태 확인'],
        ],
      },
      {
        type: 'code',
        heading: 'Tree setup',
        code: '<F1Tree rows={rows} rowKey="id" parentKey="parentId" treeColumn="name" defaultExpandAll />',
      },
    ],
    playground: 'tree',
  },
  f1GridApiReferenceDoc,
  {
    id: 'testing-guide',
    title: '테스트 가이드',
    category: 'reference',
    group: 'testing',
    description: 'Vitest와 실제 브라우저에서 Grid를 검증하는 방법입니다.',
    sections: [
      {
        type: 'prose',
        heading: 'Test behavior',
        body: 'DOM 단위 테스트와 Playwright 브라우저 검증을 함께 사용해 실제 화면을 확인합니다. 문서 내용과 실제 데이터 계층 구조를 일치시키는 것이 가장 중요합니다.',
      },
      {
        type: 'prose',
        heading: 'Implemented vs planned',
        body: '포털 예시는 F1GridProps/F1GridColumn 등 실제 구현 계약만 사용합니다. 행/컬럼 가상화는 공용 그리드의 자동 임계값과 overscan 옵션으로 지원합니다. 집계와 서버사이드 페이지네이션은 아직 구현되지 않았으므로 포털과 Playground에 포함하지 않습니다.',
      },
      {
        type: 'code',
        heading: 'Run focused tests',
        code: 'cd frontend\nnpm run test -- tests/f1-grid-docs.test.tsx',
      },
    ],
  },
];

export function getF1GridDoc(id: string) {
  return f1GridDocs.find((doc) => doc.id === id) ?? f1GridDocs[0];
}

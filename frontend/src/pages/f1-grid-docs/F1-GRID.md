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

### 고정 병합 셀의 사용자 정의 콘텐츠 클릭 (2026-10-27)

- `mergeRows: true`인 컬럼의 `renderCell` 링크/버튼은 왼쪽·오른쪽 고정 및 가로 스크롤 후에도 클릭할 수 있다.
- 고정 병합 시작 셀의 콘텐츠만 후속 투명 셀보다 위에서 포인터를 받으며, 병합 영역의 빈 공간은 실제 상세 행 선택/드래그 동작을 유지한다.
- 일반 셀, 고정 해제 상태와 편집기의 이벤트 계약은 변경하지 않는다.

### select 편집 취소 시 셀 범위 드래그 차단 (2026-10-27)

- `type: 'select'` 셀 편집 중 목록을 열거나 다른 셀을 클릭해도 셀 범위 드래그를 시작하지 않는다.
- 다른 셀 또는 그리드 밖을 클릭하면 select 편집을 취소하고 원래 값을 유지한다.
- 목록에서 옵션을 선택하면 선택값을 기존처럼 반영한다.

### 선택 단위 옵션 (2026-10-27)

`selectionMode?: 'cell' | 'row'`로 선택 표시와 복사 단위를 정한다. 기본값은 `cell`이며 기존 편집 화면은 변경되지 않는다. 현황처럼 한 행을 확인하는 화면은 다음과 같이 설정한다.

```tsx
<F1Grid
  rows={rows}
  columns={columns}
  rowKey="id"
  selectionMode="row"
  showCheckbox={false}
/>
```

- `row`: 셀 클릭 시 행 전체를 강조하고 비편집 셀 포커스 테두리/셀 범위 드래그는 표시하지 않는다. 내부 포커스와 편집 기능은 유지한다.
- `multiSelect?: boolean` 기본값은 `false`다. `cell`/`row` 표시 모드와 독립적으로 행 선택 개수를 제한한다. 기본값에서는 Ctrl/Command/Shift 클릭이나 Shift 위/아래 키도 대상 한 행만 선택하며, checkbox 선택은 이전 행을 대체하고 재클릭하면 해제한다.
- `multiSelect={true}`일 때만 Ctrl/Command 클릭으로 행 추가/해제, Shift 클릭으로 마지막 일반 클릭 행부터 연속 행을 선택한다. 위/아래 키는 선택 행도 이동하며 Shift로 범위를 확장한다. 좌/우 이동은 다중 행 선택을 유지한다.
- 행 선택용 헤더 전체 선택 checkbox는 `multiSelect={true}`에서만 표시한다. `showCheckbox`의 컬럼 폭과 개별 행 checkbox는 유지하며 데이터 컬럼의 `headerCheckbox` 일괄 값 편집은 영향받지 않는다.
- 단일 선택에서 `initialSelectedRowIds`/ref `setSelectedRowIds`에 복수 ID를 전달하면 현재 표시 순서에서 첫 유효 행만 선택한다. 실행 중 true→false 전환도 첫 선택 행만 유지하며 다시 true로 바꿔도 이전 다중 선택을 복구하지 않는다. 콜백/ref/강조/행 복사는 같은 선택 상태를 사용한다.
- Ctrl+C는 선택된 표시 행의 모든 표시 컬럼을 TSV로 복사한다. `cell`의 기존 셀/범위 복사와 붙여넣기·편집 계약은 유지한다.
- `showCheckbox`와 독립적이다. 체크박스, `initialSelectedRowIds`, `onSelectionChange`, 선택 ref API는 동일한 행 선택 상태를 사용한다.
- 강조는 실제 행 높이 단위이므로 병합 셀 그룹 전체가 아닌 선택된 상세 행에만 표시된다. 고정 열과 가로 스크롤에서도 정렬된다. `selectRowOnContextMenu={false}`이면 우클릭으로 선택 행을 바꾸지 않는다.
- 실행 중 모드를 바꾸면 이전 셀 범위와 복사 표시를 해제하고 행 선택은 유지한다. 옵션은 수주현황·문서현황에 적용되며 다른 화면은 명시적으로 설정해야 한다.

다중 행 작업이 필요한 화면만 `<F1Grid selectionMode="row" multiSelect ... />`로 명시한다. `multiSelect`는 셀 모드의 직사각형 범위 선택·복사 및 F1Tree의 `treeCheckbox` 부모·자식 값 전파를 제한하지 않는다.

### 선택·편집 렌더 성능 (2026-10-23)

- 고정열 위치는 객체 참조가 아니라 방향·오프셋·그림자 값으로 비교한다. 동일 위치의 셀은 다른 셀을 선택해도 불필요하게 다시 표시하지 않는다.
- 편집 중 입력값은 편집 셀에만 전달한다. 100행 목록에서 한 셀을 입력할 때 다른 표시 셀을 모두 다시 렌더링하지 않는다.
- 열 가상화에서 표시할 열 인덱스가 같으면 동일한 집합을 재사용하고, 일반 행의 선택·편집 변화는 영향을 받는 행만 갱신한다. 병합 그룹의 포커스 처리는 유지한다.
- 드래그 중 행 높이 조절 비활성화는 부모 상태/CSS로 전달한다. 단순 클릭만으로 모든 행의 조절 버튼을 다시 만들지 않는다.
- 편집 문자열 변경으로 헤더를 다시 만들지 않으며, 비체크박스 열에서는 헤더 전체 선택 상태를 계산하지 않는다.
- 표시를 memo로 생략해도 이벤트는 최신 편집·선택 상태를 사용한다. Enter/Tab 확정, Escape 취소 및 셀 이동 계약은 유지한다.
- 품목·거래처 페이지는 저장 성공 응답의 해당 행만 `acceptSavedRows`로 확정한다. 저장 후 목록/옵션 재조회나 그리드 초기화 없이 서버의 최종값·실제 ID·자동 코드를 반영한다.
- 이 개선은 프론트엔드 렌더 비용에 대한 것이며, 저장 API/DB의 응답시간을 보장하지 않는다.

### 편집 확정 행 렌더 격리 (2026-10-26)

- 병합 열이 없는 그리드는 값 확정 후 전체 목록/dirty 맵 참조가 바뀌어도 무관한 행 본문을 다시 실행하지 않는다. 현재 행의 컬럼별 dirty 표시와 행 인덱스·목록 길이 등 실제 표시 영향을 비교한다.
- Enter/Tab/다른 셀 클릭 확정, 원래 값으로 복구할 때의 dirty 제거 및 생략된 행의 최신 이벤트 처리를 유지한다.
- 정렬에 따른 행 번호 변경, 필터·행 추가에 따른 마지막 행 경계는 갱신한다. 병합 열이 있는 경우 전체 목록/병합 정보 변경 감지를 그대로 유지해 병합 그룹 분리와 경계를 보존한다.
- 합성 100행 × 2열에서 편집 확정 후 비수정 행의 셀 계산은 198회에서 0회로 줄었다. 개발 브라우저 5회 React 렌더 시간은 약 59~96ms에서 약 20~26ms로 감소했다. 운영 화면/서버 지연 보장값은 아니다.
- 재현 조건·회귀 검증·스크린샷은 [결과 문서](../../../../docs/result/20261026/f1grid-edit-commit/20261026_001_f1grid_edit_commit_result.md)에 기록한다.

### 페이지 저장 중 편집 잠금 (2026-10-23)

기안양식관리, 공통코드, 권한관리, 메뉴관리, 모듈관리, 창고관리는 저장 요청부터 저장 후 조용한 재조회가 완료되거나 실패할 때까지 페이지/패널의 저장 상태로 변경을 잠근다. 화면은 이 상태를 컬럼 편집 가능 여부, `beforeEdit`, 행 폼/컨텍스트 메뉴, 검색·조회 및 대상 전환에 적용한다. Grid의 `loading`에는 일반 조회 상태만 전달해 저장 후 재조회 중 기존 행과 화면을 유지하고 전체 로딩 오버레이를 표시하지 않는다. 이 동작은 화면별 책임이며 공통 F1-Grid/F1-Tree의 전역 동작을 바꾸지 않는다.

### 저장 결과 행 확정 API (2026-10-23)

`F1GridRef<T>.acceptSavedRows(savedRows: F1GridSavedRow<T>[]): T[]`는 서버 저장 성공 이후 호출하는 공통 API다. `setCellValue`와 달리 새 dirty 변경을 만들지 않는다.

```ts
type F1GridSavedRow<T extends object> = {
  previousRowId: string | number;
  row: T;
};

// 이름이나 응답 순서가 아니라 서버의 명시적 ID 매핑으로 연결한다.
const savedRows = resolveSavedGridRows(
  [...changes.insertedRows, ...changes.updatedRows],
  response.materials,
  response.rowIdMappings,
  'materialId',
);
const currentRows = grid.acceptSavedRows(savedRows);
```

- 변경된 행만 서버 최종 객체로 교체하고 해당 행의 dirty/original/patch/new 상태를 해제한다. 나머지 행 객체와 미저장 변경은 유지한다.
- 신규행의 임시 ID는 실제 ID로 바뀌며 체크 선택·포커스·셀/복사 범위·행 높이의 ID도 전환한다. 부모가 반환된 현재 행 배열을 `rows`에 반영해도 선택을 초기화하지 않는다.
- 반환값은 **현재 전체 행 스냅샷**이다. 부분 저장으로 남은 dirty 행이 있는 경우 이 배열을 모두 서버 기준값으로 간주하여 변경 폐기에 사용하면 안 된다. 현재 거래처·품목은 편집을 잠근 상태에서 전체 변경 집합을 저장하므로 반환 배열을 새 기준 목록으로 보관할 수 있다.
- 모든 매핑은 상태 변경 전에 검증한다. 없는 원본, 삭제 행, 중복 원본/대상 또는 다른 행과 충돌하는 ID는 예외를 발생시키며 일부만 적용하지 않는다. 인라인/행 폼 편집 중 호출도 거부한다.
- `resolveSavedGridRows`는 양수 안전 정수 서버 ID를 쓰는 배치 API용 검증이다. 요청/응답/매핑의 행 집합이 정확히 일치해야 하며 누락·중복·추가 응답에 순서 기반 대체 처리를 하지 않는다.
- 거래처·품목 응답은 기존 `customers`/`materials` 목록과 함께 `rowIdMappings: { "new-...": 201, "12": 12 }`를 반환한다. 다른 화면의 저장 흐름은 바꾸지 않는다.
- 저장 실패 시 입력을 유지한다. 서버 성공 후 매핑/화면 반영 실패는 별도 메시지를 표시하고 재저장을 막는다. 사용자가 조회를 성공시킨 뒤 다시 저장할 수 있다.
- 두 화면의 서버 검색 조건은 다음 조회 때 다시 적용한다. 저장한 행은 검색 조건에서 벗어나도 자동 제거하지 않는다. Grid 자체의 로컬 정렬/필터 규칙은 기존대로 적용하므로 표시 위치/가시성은 그 규칙의 영향을 받을 수 있다.
- 서버 페이징의 전체 건수나 서버 집계를 이 API가 보정하지는 않는다. 해당 화면은 별도의 조회 정책을 설계해야 한다. `F1TreeRef`도 메서드를 전달하지만 트리 저장 화면에는 이번 작업에서 적용하지 않는다.

현재 구현된 `F1Grid`/`F1Tree`는 아래 기능을 실제로 지원한다.

- 헤더 메뉴에서 컬럼 정렬, 필터, 고정, 숨김/표시를 조작할 수 있다.
- 좁은 컬럼 헤더의 제목은 한 줄로 표시되며, 공간이 부족하면 말줄임표로 축약된다. 전체 제목은 접근성 라벨에 유지되고 hover 시 헤더 높이가 늘어나지 않는다.
- 컬럼 리사이즈와 컬럼 고정 상태가 동시에 동작하며, 마지막 남은 표시 컬럼은 숨길 수 없다.
- 행 높이 조절 핸들과 키보드 `ArrowUp`/`ArrowDown`으로 `4px` 단위 조절이 가능하다.
- 셀 범위 드래그 선택 중에는 행 높이 조절 핸들이 비활성화되어 `rowresize` 동작이 발생하지 않는다.
- `wrapText: true` 옵션이 있는 컬럼은 행 높이가 커질 때 줄바꿈을 허용하고, 기본 컬럼은 한 줄 말줄임 유지한다.
- `height`, `minHeight`, `maxHeight`를 통해 Grid 컨테이너의 전체 높이와 최소/최대 높이를 제어한다.
- `columnLine` 기본값은 `true`이며, 컬럼 사이 세로 구분선을 표시한다.
- `stripeRows` 기본값은 `true`이며, 홀수 행에 스트라이프 배경을 적용해 가독성을 높인다. 고정(pinned) 컬럼에서도 동일한 규칙을 유지하며, sticky 레이어가 다른 셀과 겹치지 않도록 별도 stacking context를 유지한다.
- `rowHeight`, `minRowHeight`, `maxRowHeight`, `resizableRows`를 통해 Grid 인스턴스 단위의 행 높이를 제어한다.
- `loading` 상태에서는 그리드 전체 입력을 막는 오버레이의 중앙에 공통 `AppLoadingSpinner`를 34px·2.4px 두께로 표시한다. 색상은 테마 기본값을 사용하고, 오버레이는 테마 `background.default`를 84% 불투명도로 적용한다. 스피너는 MUI 기본 indeterminate 애니메이션을 사용해 원호 길이가 변하면서 회전한다. F1Grid/F1Tree와 다른 기본 로딩 화면은 같은 2.4px 기본 두께를 사용한다. 앱 첫 접속 로더만 기존 외형 보존을 위해 3.6px를 명시한다. F1Tree의 `loading`도 내부 F1Grid로 전달된다. 화면별 loading 정책은 변경하지 않는다. `minHeight`를 넘겨 부모 영역에서 내부 스크롤을 유지할 수 있다.
- 외부 `loading`, 내부 조회 또는 data-source loading이 시작되면 셀 범위 선택·복사 표시와 진행 중 포인터 드래그를 초기화한다. 행 checkbox 선택, 행 데이터와 편집 변경은 유지한다. 포인터가 가리키는 행과 선택 오버레이의 행 위치는 기존 `rowIndexById` 인덱스로 조회해 드래그마다 전체 행을 선형 탐색하지 않는다.
- 부모의 조회 결과 `rows`는 내부 그리드 편집 모델에 브라우저 페인트 전에 반영한다. 조회 로딩이 종료되는 화면 프레임에 이전 빈 상태가 먼저 노출되지 않으며, API 요청과 페이지별 `loading` 상태 계약은 유지한다.
- `F1GridColumn.pinned` 옵션으로 초기 좌/우 고정 컬럼을 지정할 수 있다.
- `F1Tree.defaultExpandAll` 옵션으로 최초 렌더링 시 전체 트리를 펼친 상태로 시작할 수 있다.
- 품목·거래처 분류 설정 팝업은 `F1Tree`의 `id`/`parentId` 계층과 `name` 트리 컬럼을 사용한다. 분류명·정렬순서·사용여부를 셀에서 직접 편집하고 여러 변경 행을 저장한다. 신규 부모·자식은 부모부터 생성하고 반환된 ID로 연결하며, 기존 분류의 사용 해제는 자식부터 저장한다. 단건 API 중간 실패 시 성공한 행은 재전송하지 않고 나머지 입력을 유지한다. 추가는 화면 버튼으로만 허용하며 품목 3단계·거래처 2단계, 메뉴별 등록/수정 권한을 적용한다. 공통 F1Tree 자체의 API나 동작은 변경하지 않는다.
- 분류 트리는 `CommonDialog` 안에 표시한다. 타이틀 아래 description에 최대 단계·셀 더블클릭 편집·사용여부 해제 안내를 표시하고, 추가 버튼은 트리 위 우측에 배치한다. 헤더 X와 하단 닫기는 같은 미저장 변경 보호를 적용하며 저장 중에는 닫히지 않는다.
- 분류 설정 저장과 저장 후 목록 재조회는 조용한 로딩을 사용한다. 트리 행을 유지하고 `저장` 버튼에만 16px `AppLoadingSpinner`를 표시한다. 최초 조회/수동 재조회는 기존 트리 로딩을 유지하며, 저장 중 편집·추가·중복 저장·닫기 차단도 유지한다.
- 품목·거래처 분류 설정의 저장 버튼은 추가/수정 행 또는 편집 중 변경값이 있을 때만 활성화한다. 초기 조회·원복·저장 완료 후에는 비활성화하고 부분 실패 시 미저장 행은 재시도할 수 있다. 편집 중 저장 클릭은 먼저 셀 편집과 변경 상태를 동기 확정하여 첫 클릭 누락을 방지한다.
- `showCheckbox={false}`는 Row Selector 체크박스 전체 제거용이고, `column.type === 'checkbox'`의 `headerCheckbox`는 데이터 셀 편집용으로 구분된다.
- `rowProjection`과 `cellAdornment`를 통해 Grid UI의 표시 전/후 장식을 확장할 수 있다.
- `disableSorting`, `disableFiltering` 옵션으로 특정 화면에서 정렬/필터 기능을 비활성화할 수 있다.
- 우클릭 컨텍스트 메뉴에서 `disableContextMenu`로 전체 메뉴를 끄거나 `canExportExcel`, `allowAddRowInContextMenu`, `allowDuplicateRowInContextMenu`, `allowDeleteRowInContextMenu`로 항목별 노출을 제어할 수 있다. `createDuplicate`를 제공하면 행 복사 액션이 동작한다.
- 선택형 `rowFormPlugin`으로 컬럼 정의 기반의 신규·수정 행 폼 모달과 우측 고정 `상세` 액션 열을 활성화할 수 있다. 플러그인이 없거나 `enabled: false`이면 기존 인라인 편집과 즉시 행 추가 동작을 유지한다.
- 값이 변경된 셀은 `data-dirty-cell="true"`와 함께 좌측 상단에 빨간 삼각형 코너 마크가 표시되며, 편집 중인 셀에서는 마크가 숨겨진다. 고정(pinned) 컬럼뿐 아니라 일반 컬럼에서도 동일하게 표시되어야 한다.
- dirty 판정은 최초 수정 시 해당 필드의 원본값만 `originalValuesById`에 저장하는 sparse 방식이다. 수정 후 다시 원본 값(빈 값 포함)으로 되돌리면 해당 필드 patch와 dirty 마크가 제거되고, 행의 모든 필드가 원본과 같아지면 행 상태도 `updated`에서 `normal`로 되돌아간다.
- `type: 'select'`의 표시 label은 저장값과 `options[].value`가 같은 타입과 값으로 일치할 때 매핑된다. 숫자 ID는 행과 옵션 양쪽에서 같은 숫자 타입으로 정규화한다. null 같은 실제 저장값의 표시 문구가 옵션 값과 다르면 `renderCell`에서만 placeholder를 표현하고 저장값은 변경하지 않는다.
- 인라인 셀 편집은 commit 시 모든 편집기 타입에서 `column.onValueChange`가 있으면 반환 patch를 적용하고, 없으면 편집한 `column.field` 값만 갱신한다. select 편집은 draft 문자열을 `options[].value`의 원래 타입으로 복원한 뒤 callback을 호출한다. 같은 값을 commit하면 dirty가 생기지 않는다.
- F1-Grid는 dirty 변경 집합을 제공하지만 조회/필터 적용으로 부모가 `rows`를 교체할 때 확인창을 자동 표시하지 않는다. 페이지는 `getChanges()` 또는 `onChangesChange`로 변경 유무를 확인하고, 변경 폐기 확인을 취소하면 Grid 상태를 유지하며 계속하면 Grid 상태를 초기화한 뒤 보류한 조회를 실행해야 한다.
- 저장 뒤 목록을 재조회하는 기존 페이지는 저장 상태와 Grid `loading`을 분리한다. 품목관리와 거래처관리는 저장 후 재조회 자체를 하지 않는다. 두 화면 모두 저장 진행 아이콘·중복 저장 방지·편집 잠금을 유지하고, 최초/사용자 조회에만 Grid 로딩을 표시한다.
- 인라인 편집 중 같은 Grid의 다른 셀 또는 툴바/액션으로 이동하면 edit를 commit하고 dirty 변경 집합에 반영한다. Grid가 중첩 MUI Dialog/Modal 안에 있어도 조상 모달의 이벤트를 editor popup으로 오인하지 않는다. 실제 editor popup으로 포인터/포커스가 이동할 때만 commit을 보류한다. 따라서 폼 바깥의 저장 버튼도 편집 commit으로 갱신된 dirty 상태를 기준으로 동작한다.
- 컨텍스트 메뉴 등으로 추가한 신규 행을 저장 전에 삭제하면 해당 행은 `deleted` 변경으로 남지 않는다. 행과 원본·dirty 상태를 함께 제거하므로 `getChanges()`의 inserted/updated/deleted 목록에서 모두 제외되며, 변경이 없으면 페이지 저장 액션도 비활성화할 수 있다.
- dirty 표시는 컬럼 타입에 관계없이 동일하게 적용된다(텍스트, 숫자, 체크박스, 날짜, 시간 등). 컬럼 타입별 렌더링 분기와 무관하게 셀 루트에서 공통으로 마크를 그리기 때문이다.
- `column.getValue`로 값을 파생시키는 컬럼(예: 여러 체크박스가 하나의 배열 필드를 공유하는 권한 체크박스)은 dirty 판정도 `getValue(row)`를 원본 값과 비교해 계산한다. `onValueChange`가 실제로 갱신하는 필드명이 `column.field`와 다르더라도(예: `permissionCodes` 배열을 갱신하지만 컬럼은 `readPermission`) 해당 컬럼 셀에 정확히 dirty 마크가 표시된다.
- `type: 'user'` 컬럼은 `userOptions`의 사용자 항목(`value`, `label`, `avatarUrl`, `positionName`, `departmentName`)을 검색/선택한다. 셀 편집과 row form modal은 같은 avatar/name/position/department 선택 UI를 사용하고, `form.multiple: true`면 선택 ID 배열과 개별 chip 해제를 제공한다.
- 인라인 user picker option 클릭은 Autocomplete portal의 mousedown이 Grid outside-click commit으로 처리되지 않게 보호한다. 그렇지 않으면 option click보다 먼저 editor가 닫혀 선택값이 셀에 반영되지 않는다.
- user 값은 단일 ID/`null` 또는 다중 ID 배열/`[]`로 저장한다. 옵션에서 선택한 ID의 원래 string/number 타입을 보존하며 표시 metadata는 row 값에 저장하지 않는다. 단일·다중 선택 chip X는 해제 patch를 만들고, 동일한 선택값을 commit해도 배열 내용이 같으면 dirty로 처리하지 않는다.
- Grid cell user 편집은 내부 TextField outline/underline을 제거하고 GridCell active focus outline만 사용한다. Row form modal은 기존 form 입력처럼 outlined border를 유지한다.
- user 옵션 검색은 사용자 표시명, 직급, 부서에 적용한다. 프로필 사진이 없는 경우 이름 이니셜 avatar를 표시하고, 팝업 목록은 내부 스크롤 및 viewport 너비를 따른다. Grid cell 편집 팝업은 cell 왼쪽 경계에 맞춰 시작하며, 최대 320px에서 anchor 오른쪽에 확보 가능한 너비로 줄어든다. 좁은 viewport에서도 화면 경계를 넘지 않는다.

이 항목은 초기 사양서의 기본 모델을 넘어, 실제 사용 중인 구현 상태를 기준으로 정리한 요약이다.

---

## 개발자 문서 포털

`/f1-grid-docs` 포털은 기능 중심의 12개 그룹으로 문서를 탐색한다: 시작하기, 그리드와 데이터, 편집과 검증, 선택·클립보드·행 작업, 필터와 정렬, 컬럼·레이아웃·행 높이, 대용량 데이터, 트리 그리드, 행 병합, 플러그인과 확장, API 참조, 테스트.

- 데스크톱은 왼쪽 그룹 메뉴, 중앙 본문, 오른쪽 섹션 목차로 표시한다. 태블릿과 모바일은 목차를 접을 수 있으며, 모바일 문서 메뉴도 열고 닫을 수 있다.
- 기본 메뉴는 현재 문서가 속한 그룹만 펼친다. 그룹 제목을 선택하면 해당 그룹의 첫 문서로 이동하고, 검색 중에는 일치 문서가 있는 모든 그룹과 API 결과를 표시한다.
- 문서 제목·설명·섹션·API 이름·타입·기본값·설명을 대소문자 구분 없이 검색한다. API 검색 결과는 API 참조 문서의 해당 항목으로 이동한다.
- API 표는 이름, 타입/시그니처, 기본값, 설명/제약을 개별 항목 단위로 표시한다. 기본값은 런타임 구현을 확인해 기재하고, 설정하지 않는 항목은 미지정으로 나타낸다.
- 공개 계약은 `F1GridProps`, `F1GridColumn`, `F1TreeProps`, `F1GridRef`, `F1TreeRef`와 이들이 사용하는 공유 타입, 중첩 폼·검색 옵션, 데이터 소스, 렌더링 컨텍스트, 편집/행 폼 플러그인, 트리 메뉴 확장 타입을 포함한다. 저수준 내부 유틸리티는 사용자 API로 취급하지 않는다.
- 예제는 복사 가능한 코드와 기존 로컬 데이터 기반 Playground를 사용한다. 임의 코드 실행이나 백엔드 요청은 추가하지 않는다. 라이트/다크 테마와 기존 `/f1-grid-docs` 진입 경로를 유지한다.
- 문서 구현은 `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`와 `f1GridApiReference.ts`를 사용하고, 기능·기본값은 이 문서와 실제 공개 타입 및 컴포넌트 구현을 대조한다.

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
  validation?: { unique?: boolean | 'digits' };
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

### 행별 업무 액션

데이터 표시가 아닌 행별 업무 액션도 별도 Grid core 수정 없이 `renderCell`로 제공할 수 있다. 기안양식관리의 `hasDocument` 컬럼은 행의 문서 유무에 따라 `문서 작성`/`문서 수정` 버튼을 표시하고, callback에 해당 행을 전달한다. 권한이 없으면 버튼 대신 읽기 전용 상태를 표시한다.

```tsx
{
  field: 'hasDocument',
  headerName: '문서 양식',
  width: 140,
  pinned: 'right',
  editable: false,
  renderCell: ({ row }) => (
    <Button
      aria-label={`${row.hasDocument ? '문서 수정' : '문서 작성'}: ${row.codeName}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpenTemplate(row);
      }}
    >
      {row.hasDocument ? '문서 수정' : '문서 작성'}
    </Button>
  ),
  form: { hidden: true },
  search: { hidden: true },
}
```

- 행 액션은 페이지/업무 callback이 소유한다. `renderCell`은 메뉴 권한이나 API 저장 책임을 갖지 않는다.
- 액션 클릭은 `stopPropagation()`으로 Grid 행 선택/편집 이벤트와 분리한다.
- 기존 사용자 layout 저장값에 새 pinned 컬럼이 없을 때 페이지가 저장된 순서/폭/숨김 설정을 유지하면서 신규 action pin을 1회 migration할 수 있다. Grid core의 persisted layout 초기화는 변경하지 않는다.
- 좁은 뷰포트에서는 넓은 Grid가 내부 가로 스크롤을 사용한다. 문서 액션은 마지막 열에 두어 필요하면 내부 스크롤로 접근하며, 페이지 전체 가로 overflow를 만들지 않는다.

### 업무작성 결재선 템플릿 관리

결재선 템플릿 관리에서는 `name` 컬럼을 인라인 편집하고, 행별 `renderCell` 액션을 제공한다. 편집 내용은 Grid 변경 집합으로 추적하며, 페이지의 하단 저장 액션에서 기존 서비스 호출을 수행한다.

행 액션 버튼을 그룹으로 셀 가운데 정렬할 때는 `renderCell`의 flex wrapper에 `width: '100%'`, `justifyContent: 'center'`와 버튼 간격을 지정한다. MUI 버튼 두 개가 좁은 액션 셀을 넘치면 해당 버튼에 `minWidth: 0`과 작은 가로 패딩을 적용한다. 이는 화면별 표시 선택이며 공통 F1-Grid 동작을 변경하지 않는다.

```tsx
type TemplateRow = {
  templateId: number;
  name: string;
  actions: string;
};

const columns: F1GridColumn<TemplateRow>[] = [
  {
    field: 'name',
    headerName: '결재선명',
    flex: 1,
    editable: true,
    required: true,
    validate: (value) => {
      const name = String(value ?? '').trim();
      return (
        (name.length > 0 && name.length <= 100) ||
        '결재선 템플릿 이름은 1~100자여야 합니다.'
      );
    },
  },
  {
    field: 'actions',
    headerName: '액션',
    width: 180,
    pinned: 'right',
    editable: false,
    renderCell: ({ row }) => (
      <Button
        aria-label={`결재선 불러오기 ${row.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onLoad(row.templateId);
        }}
      >
        불러오기
      </Button>
    ),
  },
];

<F1Grid
  ref={gridRef}
  rows={templates.map((template) => ({ ...template, actions: '' }))}
  columns={columns}
  rowKey="templateId"
  ariaLabel="자주 쓰는 결재선 목록"
  showCheckbox={false}
  onChangesChange={(changes) =>
    setHasChanges(changes.updatedRows.length > 0)
  }
/>

const changedNames = gridRef.current?.getChanges().updatedRows ?? [];
```

- `onChangesChange`로 저장 버튼의 활성 상태를 유지하고, `getChanges().updatedRows`에서 수정된 행만 저장한다.
- 불러오기/삭제/닫기는 행 ID를 전달하며, 미저장 변경 폐기 확인은 Grid를 사용하는 페이지가 처리한다.
- 이름 저장의 부분 실패에서는 페이지가 성공 응답으로 Grid 기준 목록을 갱신하고, 실패한 입력만 `setCellValue`로 다시 적용해 재시도 가능 상태를 만든다.
- 이 화면은 기존 `F1Grid`, `F1GridColumn`, `F1GridRef` 공개 API를 사용한다. 같은 Grid 내부 포커스 이동 시 blur commit을 보장하는 공통 Grid 동작을 적용한다.

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

## date 컬럼 표시 형식

`type: 'date'`는 `format`으로 표시 형식을 지정한다. 미지정 또는 빈 문자열이면 기본값은 `yyyy-mm-dd`다. 문서현황의 결재신청일/최종 변경일처럼 ISO timestamp를 받는 컬럼도 기본적으로 날짜만 표시한다.

```typescript
{ field: 'submittedAt', headerName: '결재신청일', type: 'date' }
// 2026-10-20T09:21:00 -> 2026-10-20
{ field: 'updatedAt', headerName: '최종 변경일', type: 'date', format: 'yyyy/mm/dd' }
// 2026-10-20T09:21:00 -> 2026/10/20
```

지원 토큰은 `yyyy`/`YYYY`(4자리 연도), `yy`/`YY`(2자리 연도), `mm`/`MM`(2자리 월), `m`/`M`(월), `dd`/`DD`(2자리 일), `d`/`D`(일)이다. 구분자와 한글을 조합할 수 있으며, `[문자열]`은 토큰 치환 없이 표시한다. ISO 날짜/timestamp, 8자리 `yyyymmdd`, 유효한 `Date` 객체를 지원한다. Timestamp 문자열은 시간대 변환 없이 명시된 날짜를 사용한다.

빈 값은 빈 셀, 잘못된 날짜는 원문으로 표시한다. 표시 포맷은 원본 데이터, 날짜 편집기의 `YYYY-MM-DD` 값, 검색/정렬/필터 값을 변경하지 않는다. 사용자 `renderCell`이 있으면 기존처럼 우선 적용된다. 공통 표시 함수를 사용하는 자동 너비 계산과 Excel 텍스트 출력에도 같은 형식이 적용된다. 기존 숫자 `format`과 `datetime`/`time` 동작은 유지한다.

## number/decimal 컬럼 소수점 표시

`F1GridColumn.decimalPlaces`로 숫자 컬럼의 소수점 자릿수를 지정한다. `number`와 `decimal` 컬럼에서 생략하면 화면 및 Excel에서 소수점 이하 최대 5자리까지 표시하며 끝의 0과 불필요한 소수점은 생략한다. 정수 값은 불필요한 소수점 없이 `1`, 소수 값은 `1.2`, `1.234567`은 `1.23457`로 표시한다.

`decimalPlaces`를 지정하면 기존처럼 표시 소수점 자릿수를 고정한다. 예를 들어 `decimalPlaces: 2`는 `1.2`를 `1.20`으로 표시한다. 이 옵션은 편집 입력 정규화에도 사용되며, 옵션을 생략해도 편집 입력을 5자리로 제한하지 않는다.

```typescript
{ field: 'amount', headerName: '금액', type: 'number' } // 최대 5자리, 끝의 0 생략
{ field: 'unitPrice', headerName: '단가', type: 'number', decimalPlaces: 2 } // 1.2 -> 1.20
{ field: 'price', headerName: '가격', type: 'currency', format: 'currency' } // KRW, 기본 소수점 0자리
```

`format: 'currency'`의 기본 0자리 KRW 표시와 명시적 `decimalPlaces` 동작은 유지한다. Excel 숫자 서식은 기본 숫자의 정수 값에 `#,##0`, 소수 값에 `#,##0.#####`, 명시 자릿수에 고정 서식을 적용한다. 정수와 소수 값이 같은 컬럼에 있어도 셀 값별 서식을 적용한다.

## PageSearchArea 상세 검색 연결

Grid 헤더 필터와 페이지의 상세검색은 서로 다른 기능이다. 헤더 필터는 그리드에 표시된 행을 필터링하고, `PageSearchArea` 상세검색은 컬럼의 검색 설정을 페이지 조회조건에 연결한다. 흐름은 `F1GridColumn.search` → `toPageSearchFields(columns)` → `PageSearchArea` → 페이지 필터 → 목록 API 순서다. F1-Grid는 검색 필드 설정을 제공하며 업무 API를 직접 호출하지 않는다.

실제 기안양식 상세검색 필드는 분류(`categoryItemId`), 등록주기(`regTermId`), 사용여부(`useAt`)다. 분류와 등록주기는 코드 항목의 숫자 ID를 옵션 값으로 사용하고, 사용여부 값은 `'Y'`/`'N'`이다. 양식코드(`cataTypeCode`)와 양식명(`codeName`)은 `search.hidden: true`로 상세검색에서 제외하며, 양식코드/양식명 키워드는 별도의 기본 검색 입력으로 처리한다. 현재 기안양식 화면에는 등록일 상세검색이 없다.

```typescript
const detailFields = useMemo(
  () => toPageSearchFields(columns),
  [columns],
);
```

`toPageSearchFields`는 UI용 `field`, `label`, `type`, `searchSpan`, 선택적 `group`/`options`/`defaultValue`를 만든다. `search.hidden: true`인 컬럼은 제외한다. `column.hidden: true`인 컬럼은 기본적으로 제외하지만, 명시적 `search` metadata가 있으면 상세검색에 포함할 수 있다. 레이블은 `search.label`을 우선 사용한 뒤 `headerName`을 사용한다. `search.order`는 필드 순서를, `search.span`은 검색 필드 너비인 `searchSpan`을 정한다. `search.span`의 기본값은 1이며 `form.span`과는 독립적이다. `PageSearchArea`에서 연속된 같은 `search.group` 값은 새 행 안에 배치되고 다른 group이 시작되면 행도 나뉜다. Group 이름은 표시하지 않는다. `search.span`은 group 여부와 관계없이 필드 너비를 계속 제어하며, 그룹 행 안에서도 기존 5열 기준 및 반응형 축소 규칙이 적용된다. 지원 타입은 `text`, `number`, `decimal`, `currency`, `date`, `select`, `checkbox`이고, 지원하지 않는 컬럼 타입은 `text`로 변환된다. `select` 필드는 컬럼의 `options`를 사용한다.

텍스트 입력을 공통 규칙으로 정규화할 때 `F1GridColumn.inputFormat`을 지정한다. 이 설정은 인라인 편집, 행 폼, TSV 붙여넣기와 컬럼 metadata에서 만들어진 `PageSearchArea` 상세검색에 함께 적용된다. 형식 미지정 컬럼은 기존 입력 동작을 유지한다. `sanitizeInput`은 기존 사용자 정의 sanitizer로 계속 지원하며, `inputFormat`이 함께 지정되면 공통 포맷을 우선 적용한다. 초기 표시값은 바꾸지 않고 사용자가 입력하거나 붙여넣을 때만 포맷한다.

`digits` 포맷은 `maxDigits`로 입력 상한을, `validDigitCounts`로 저장 시 허용 자리수를 선언한다. `korean-phone`은 `maxDigits`를 지정해도 `02`는 최대 10자리, 그 외는 최대 11자리 상한을 유지한다. 상세검색은 `maxDigits`를 적용하되 부분 검색값을 허용하고, 저장 시 자리수 검증은 Grid row validation에서 처리한다.

```typescript
inputFormat: { type: 'digits', groupSizes: [3, 2] } // 123-45-67890
inputFormat: { type: 'digits', groupSizes: [6] }    // 123456-7890123
inputFormat: { type: 'digits' }                     // 숫자만
inputFormat: { type: 'digits', maxDigits: 5, validDigitCounts: [5] } // 우편번호
inputFormat: { type: 'digits', groupSizes: [3, 2], maxDigits: 10, validDigitCounts: [10] } // 사업자번호
inputFormat: { type: 'korean-phone' }               // 국내 전화번호
inputFormat: { type: 'korean-phone', maxDigits: 11 } // 02는 10자리, 그 외 11자리 상한
```

페이지는 `detailValues` 상태를 `PageSearchArea`에 전달하고 `onDetailValuesChange`로 입력 변경을 저장한다. 상세검색 실행 시 `onDetailSearch(values)`에서 실제 조회조건으로 변환한다. 기안양식의 분류/등록주기 값은 숫자로 바꾸며 사용여부는 `'Y'` 또는 `'N'`만 적용한다. 기본 키워드와 상세조건의 결합, API 요청, 로딩 및 오류 표시는 페이지와 management hook/service의 책임이다. 실제 화면은 미저장 Grid 변경이 있을 때 확인 대화상자에서 변경을 버린 뒤 검색을 적용한다.

거래처 관리 화면은 `customerCode`, `customerName`, `custNameAbbr`를 별도 기본 키워드 검색으로 처리하고, 대표자·사업자번호·법인등록번호·업태·종목·사용여부를 `search` metadata 기반 상세검색에 연결한다. 법인등록번호는 목록 컬럼에서 숨기되 `search` metadata를 지정해 상세검색에 노출한다. 사업자번호는 `[3, 2]` + `maxDigits: 10`, 법인등록번호는 `[6]` + `maxDigits: 13`, 우편번호는 `maxDigits: 5`, 전화·팩스는 `korean-phone` + `maxDigits: 11`을 설정한다. 저장 시 비어 있지 않은 번호/연락처는 자리수 검증(사업자 10, 법인 13, 우편 5, 전화/팩스 `02` 9·10, 그 외 10·11)을 통과해야 하며 미변경 기존 값도 동일하게 검증한다. 기본 키워드와 상세 조건은 한 번의 서버 조회에 함께 전달된다.

날짜 검색을 추가하는 다른 화면에서는 `type: 'date'` 필드 값이 `{ from, to }` 범위 형태다. 이 값은 검색 UI의 입력값이며 서버 파라미터명은 각 API 계약에 맞춰 페이지에서 정해야 한다.

공통 상세검색의 시작일·종료일은 셀 날짜 편집기와 같은 숫자 축약 입력 및 달력 선택을 지원한다. `20261022` 또는 `261022`는 `2026-10-22`로, `1022`와 `10-22`는 올해 10월 22일로, `22`는 이번 달 22일로 변환한다. 표준 `YYYY-MM-DD`도 입력할 수 있다. 필드에서 포커스를 옮기거나 조회할 때 실제 존재하는 날짜인지 검증한 뒤 ISO 문자열로 확정한다. 잘못된 날짜는 입력을 유지하고 오류를 표시하며, 조회하지 않고 상세검색창을 유지한다. 빈 값은 해당 시작일/종료일 제한이 없다는 의미다. 좁은 영역에서는 두 입력을 세로로 배치하고 모바일에서는 숫자 키보드를 제공한다.

입력 중 `onDetailValuesChange`에는 미완성 문자열이 포함될 수 있으나, 실제 `onDetailSearch`에는 정규화·검증된 날짜만 전달한다. 수동 축약 입력에서 생략한 연·월은 기존 셀 편집기와 동일하게 브라우저 로컬 날짜를 기준으로 채운다. 이는 아래의 서버 기준 날짜 검색 기본값과 별개이며, 기존 기본값·초기화·세션 복원 정책은 변경하지 않는다.

날짜 검색 기본값은 `search.defaultValue`에 검색 필드 범위로 선언한다. 이 설정은 상세검색 값만 초기화하며 Grid 셀/행 편집 기본값과는 별개다. 각 끝점은 고정일 또는 서버 시스템 날짜 기준 상대일을 사용할 수 있고, 생략한 끝점은 빈 값으로 남는다.

```typescript
search: {
  defaultValue: {
    from: { type: 'systemDate', offset: { months: -1 } },
    to: { type: 'systemDate' },
  },
}
```

고정일은 `{ type: 'fixed', year: 2026, month: 10, day: 20 }`처럼 지정한다. `systemDate`는 `GET /api/v1/common/system-date`의 `result.today` (`yyyy-MM-dd`)를 기준으로 하며 `years`, `months`, `days`의 정수 offset을 지정할 수 있다. 상대 계산은 연도 → 월 → 일 순서로 달력 연산을 적용하고, 대상 월에 해당 일이 없으면 월말로 보정한다. 예를 들어 3월 31일에서 한 달 전은 2월 말일이며 윤년은 2월 29일을 허용한다. API 실패나 잘못된 날짜 설정은 오류로 표시하고 프런트엔드 시계로 대체하지 않는다.

기본값이 지정된 날짜 필드는 첫 조회와 상세검색 초기화에 해석된 기본값을 사용한다. 초기화 시 공통 검색 영역은 값을 갱신하지만 자동 조회 여부는 페이지가 선택한다. 문서현황은 서버 날짜 해석이 완료된 뒤 첫 목록을 조회하고, 저장된 탭 세션 조건이 있으면 이를 우선 복원한다. 사용자가 초기화하면 최근 1개월 범위를 서버 날짜 기준으로 다시 적용하고 같은 조건을 세션에 저장한다.

문서현황 페이지는 같은 메타데이터 연결로 상세검색을 구성하고, 실행한 검색조건에 맞는 전체 결과를 조회한다. 컬럼의 `search.order`, `search.group`, `search.label`, `search.span`, `type`, `options`가 상세검색 폼에 반영되고, `hidden: true`인 컬럼도 명시적인 `search` metadata가 있으면 그리드에는 표시하지 않고 상세검색에는 제공할 수 있다. 검색 자체를 제외하려면 `search.hidden: true`를 지정한다.

문서현황의 문서번호는 DB PK인 `electronicApprovalId`이며, `eabusNo`는 문서 유형별 구분 코드이므로 문서번호로 표시하지 않는다. 결재 참여자 전체 이름 요약은 기본 그리드에서 제거하고, 대신 현재 결재단계·담당자 및 내 결재 역할·처리상태를 표시한다. 현재 사용자가 기안자이면 결재선 참여유형보다 `기안` 역할을 우선 표시하고, 상세검색의 `기안` 조건은 현재 사용자가 기안한 문서만 조회한다. 숨김 `participantName` 컬럼의 검색 metadata로 참여자 이름 상세검색은 유지한다. 상세검색 순서는 결재신청일, 결재상태/문서종류, 문서번호, 제목, 기안자/부서, 결재 참여자, 내 역할/처리상태, 현재 결재담당자, 최종 변경일이다. 결재신청일 기간 검색은 일반 문서의 `submitted_at`, 임시저장 문서의 `created_at`을 사용하며 임시저장은 기안자 본인 문서만 표시한다. 결재신청일 기본 범위는 컬럼 metadata의 시스템 날짜 기준 최근 1개월이며, 백엔드 날짜 조회가 완료될 때까지 초기 목록 요청을 보류한다. 실패 시 재시도 가능한 오류를 표시하고 브라우저 날짜를 사용하지 않는다. 빠른 검색어는 문서번호 PK·제목·기안자 부분 검색에 사용한다. 검색 실행 시 빠른 검색어와 상세검색 조건은 현재 브라우저 탭 세션에 저장되며, 페이지 재진입 시 해당 값으로 조회한다. 검색 실행 전 입력한 값은 저장되지 않는다. 검색 조건 초기화 시 검색어와 나머지 상세조건을 비우고 결재신청일은 서버 날짜 기준 최근 1개월 범위로 되돌려 즉시 조회하며, 이 범위도 세션에 저장해 재진입 후 유지한다. 세션 저장 대상은 검색조건뿐이며 행 선택과 상세 패널 및 Grid 레이아웃은 저장하지 않는다.

문서현황 검색 요청은 기존 검색조건과 날짜 범위를 전달하되 `offset`/`limit` 없이 실행해 일치하는 전체 행을 받는다. 페이지 조회가 필요한 기존 API 호출은 `offset`/`limit`을 전달해 최대 200건 페이징을 그대로 사용할 수 있다. 문서현황 화면은 전체 결과를 `F1Grid.rows`로 제공하므로 헤더 정렬과 필터는 클라이언트에서 처리하고, 정렬·필터 조작만으로 목록 API를 다시 호출하지 않는다. 새로운 상세검색 실행, 재시도 및 문서 변경 후에는 기존 검색조건으로 전체 목록을 다시 조회한다. 행 선택 시 문서작성 페이지의 기존 우측 상세 오버레이를 사용하며, 결재·수정·취소·댓글 등의 기능은 기존 사용자 권한과 문서 상태 조건에 따라 표시한다.

커뮤니티 자료실은 기본 영역의 통합검색어를 기존 `keyword` 파라미터로 보내고, `categoryCode` 컬럼의 `search` 설정만 상세검색에 노출한다. API가 `pageIndex`/`pageUnit`을 사용하므로 자료실의 `F1GridDataSource`는 `floor(offset / limit) + 1`과 `limit`으로 변환하고, 요청 취소 signal을 서비스까지 전달한다. 이 화면은 서버의 최신순을 유지하기 위해 그리드 정렬/필터를 비활성화하고, 조회 실패는 `onDataSourceError`에서 오류와 재시도 상태로 표시한다. 제목 셀은 버튼으로 렌더링하여 상세 패널 열기를 명시적으로 실행하며 분류, 작성자, 등록일, 첨부 수는 읽기 전용 컬럼으로 표시한다.

포털의 `필터와 정렬` 문서에서 `상세검색은 이렇게 연결됩니다`부터 단계별 예제와 전체 기안양식 검색 예제를 확인할 수 있다. 포털에서 `toPageSearchFields`를 검색하면 상세검색 가이드로, `F1GridColumn.search`를 검색하면 공개 API 참조 항목으로 이동할 수 있다.

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

코드를 선택하지 않고 다른 셀이나 그리드 밖을 클릭하면 편집이 종료되며, 기존 값과 타입 및 변경 상태는 유지한다. 코드 값은 `onOpenCodePicker`의 선택 결과 패치로만 변경한다. 공통코드 드롭다운(`type: 'select'`)도 다른 셀/외부 클릭 시 편집을 취소하며, 목록을 연 뒤 선택 없이 바깥 영역을 클릭하거나 Escape로 닫으면 셀 편집까지 종료한다. select 편집 중에는 목록 열기와 셀 클릭이 범위 드래그를 시작하지 않는다. 옵션을 선택한 경우에는 해당 옵션의 원래 타입 값을 반영한다.

행 폼의 `type: 'code'`도 같은 선택 콜백을 사용한다. `onOpenCodePicker` 실행 중 전달한 패치와 반환 패치는 병합하여 한 번 적용하고, 팝업에서 나중에 전달하는 비동기 패치는 도착 시 행 폼 초안에 반영한다. 취소하면 초안과 원본 값은 변경하지 않는다.

품목관리의 `품목분류`는 `itemClsId`를 저장하고 `itemClsPath` 경로를 표시한다. 거래처관리의 `거래처 대분류/소분류`는 `businessKind1/2`를 저장하고 서버의 표시명을 보여 준다. 셀 더블클릭 → 코드 선택 또는 행 폼의 선택 버튼 → CommonDialog의 읽기 전용 F1Tree에서 선택한 뒤 기존 페이지 저장으로 확정한다. 선택창 하단은 왼쪽부터 `선택`, `취소`만 배치하며 `선택 해제` 버튼은 제공하지 않는다. 취소와 헤더 X는 기존 값을 유지한다. 품목은 1~3단계 선택을 허용하며 거래처 소분류 선택은 대분류도 자동 지정한다. 대분류 변경은 소분류를 비운다. 미사용 분류와 미사용 조상을 가진 분류는 새로 선택할 수 없지만 기존 참조는 표시·유지한다. 기존 문자열 분류 `matCataType`은 별도로 보존하며 이 기능의 저장값으로 사용하지 않는다.

### 수주등록 상세 적용 예

[수주등록 상세 그리드](../sales/order/create/components/SalesOrderDetailGrid.tsx)는
품목코드에 `type: 'code'`와 `onOpenCodePicker`를 사용한다. 공통 품목 선택기에서
선택한 ID·코드·명을 `applyPatch`로 같은 행에 반영하며, 행 추가/삭제는
`F1GridRef.addRow()`와 `deleteSelectedRows()`를 사용한다.

상세 그리드 제목 옆의 `품목 선택` 버튼은 행을 하나 선택했을 때 활성화된다.
버튼은 키보드로도 실행할 수 있으며, 도움창에서 고른 마스터 옵션을
`F1GridRef.setCellValue()`로 선택 행에 전달한다. 품목코드 컬럼의
`onValueChange`는 옵션 ID·코드·명을 한 번의 행 변경으로 함께 반영한다.
기존 코드 셀 편집 및 `코드 선택` 버튼도 계속 사용할 수 있다.

주문수량 또는 단가가 바뀌면 공급가와 VAT 10%를 소수 둘째 자리까지 다시
계산한다. VAT 셀을 직접 수정하면 해당 행의 총액만 갱신하고, 이후 수량이나
단가가 변경될 때 VAT를 기본 10%로 재계산한다. 출하수량과 라인상태는 신규
수주 작성 단계에서 읽기 전용으로 둔다. 화면 금액은 입력 중 미리보기이며,
저장 시 서버가 금액을 다시 계산한다.

## 행 폼 모달 플러그인

`rowFormPlugin`은 많은 컬럼을 가로 셀 편집 대신 폼으로 등록·수정해야 하는 화면에서 선택적으로 사용한다. 활성 상태는 prop이 있고 `enabled !== false`인 경우이며, 이때 Grid 마지막에 폭 `48px`의 우측 고정 `상세` 열이 자동 추가된다. `상세` 열은 사용자가 해제할 수 없는 폼 플러그인 전용 우측 pin 1번 영역으로 동작하고, 사용자가 다른 컬럼을 오른쪽 고정하면 해당 컬럼은 `상세` 열 왼쪽의 2번 이후 고정 영역에 배치된다. 합성 액션 열은 컬럼 배열, 행 데이터, Excel 내보내기, 클립보드, 셀 선택 및 검증 대상에는 포함되지 않는다.

플러그인이 없거나 `enabled: false`이면 액션 열과 모달을 만들지 않는다. `addRow()`는 기존처럼 즉시 행을 추가하고 인라인 편집을 비롯한 기존 Grid/Tree 동작도 변경하지 않는다.

공개 타입:

```typescript
type F1GridFormMode = 'create' | 'edit';

type F1GridColumnFormOptions<T extends object> = {
  hidden?: boolean;
  readOnly?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  label?: string | ((row: T) => string);
  disabled?: boolean | ((row: T, mode: F1GridFormMode) => boolean);
  group?: string;
  order?: number;
  span?: 1 | 2 | 3;
  multiple?: boolean;
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
- 라벨은 `form.label` → `headerName`, 순서는 `form.order` → 컬럼 선언 순서로 결정한다. `form.label`은 현재 row를 받아 동적으로 표시할 수 있고 row가 없으면 `headerName`을 사용한다.
- `form.disabled`는 boolean 또는 `(row, mode)` 콜백으로 입력을 비활성화한다. 비활성 필드도 폼에 남으며 셀 편집 가능 여부와 `form.readOnly` 판정에는 영향을 주지 않는다.
- 읽기 전용은 `form.readOnly` → `editable` 함수의 반대값 → `editable` 값의 반대값 순으로 판정한다.
- `form.span`은 데스크톱 3열 기준 점유 폭이며 기본값은 `1`이다.
- `type: 'date'`·`'time'`·`'datetime'` 칸은 row form에서 브라우저 날짜·시간 입력(달력 단추)으로 그리고, 이름표를 늘 위로 올린다(`inputLabel.shrink: true`). 값이 비어 있어도 이름표가 브라우저의 `연도-월-일` 안내와 겹치지 않는다. 송연 F1-Grid에만 있는 동작이다(2026-10-28, `form/GridFormField.tsx`). S_ERP F1-Grid를 다시 복사하면 이 줄이 빠지므로 함께 옮긴다.
- `type: 'select'`에서 `form.multiple: true`를 지정하면 row form은 선택값 배열을 보존한다. Grid 표시용 `getValue`가 요약 문자열을 반환해도 form 입력은 원본 row 배열을 사용한다.
- `form.targetField`와 `form.targetLabel`로 수정 모달 상단의 메타 정보(`예: 메뉴명: 홍길동`)를 재정의할 수 있으며, 기본값은 `rowKey`와 `대상`이다.
- `text`, `number`, `decimal`, `currency`, `checkbox`, `date`, `datetime`, `time`, `select`, `autocomplete`, `code` 컬럼은 대응 입력으로 변환된다.
- `rownumber`, 선택 체크박스, 합성 액션 열, 선언상 숨김 컬럼은 기본 제외한다. `form.hidden: false`이면 숨김 컬럼도 명시적으로 폼에 포함할 수 있다.

### draft 적용과 취소

- 수정 모달은 원본 행의 얕은 복사본을 draft로 사용한다. 입력 중에는 Grid 행과 변경 상태를 건드리지 않고, 적용 시 달라진 필드만 기존 dirty/updated 상태에 반영한다.
- 활성 플러그인에서 `addRow(partial?)`는 `createRow()`와 partial을 합친 신규 draft를 연다. 적용 시에만 inserted 행을 생성하고 취소 시 빈 행이나 변경 이력을 남기지 않는다.
- `required`, `inputFormat` 자리수 규칙, `min`, `max`, `validate`는 폼에 포함된 컬럼만 검증한다. 실패하면 모달을 유지하고 첫 오류 입력으로 포커스를 이동한다.
- `onBeforeApply`가 `false`를 반환하면 적용을 중단하고 모달을 유지한다.
- 취소, 닫기, `Escape`, backdrop 닫기는 모두 draft를 폐기한다.
- 모달은 API를 호출하거나 서버에 저장하지 않는다. 최종 저장은 화면이 `getChanges()`와 기존 저장 버튼 흐름으로 수행한다.

### 공통 검증 오류와 페이지 메시지 연결

`F1Grid.onValidationErrors`는 `validate()`와 행 폼 적용 검증에서 호출되는 선택적 콜백이다. 오류는 `{ rowId, field, message }[]`이며 검증 성공 시 빈 배열을 전달한다. `validate(): boolean` 반환 계약은 유지한다. 콜백을 지정하지 않은 화면에는 변경이 없다. F1Tree도 같은 prop을 전달할 수 있다.

```tsx
<F1Grid
  rows={rows}
  columns={columns}
  rowKey="id"
  onValidationErrors={(errors) =>
    setError([...new Set(errors.map((error) => error.message))].join('\n'))
  }
/>
```

거래처명과 사업자번호는 컬럼 `required: true`로 헤더·폼 필수 표시와 공통 검증을 통일한다. 저장 훅에서 거래처명 필수 검사를 반복하지 않는다. 사업자번호 등 번호 자리수는 `inputFormat.validDigitCounts`와 국내 전화 규칙을 기존 `validateGridRow`에서 검사한다. 거래처 페이지는 폼 적용·최종 저장의 실제 오류를 상단 `PageMessageArea`에 전달한다. 폼은 빨간 입력 테두리와 하단 설명, 그리드는 오류 셀의 빨간 강조와 툴팁을 유지한다. 오류 셀에 포커스가 남아 있어도 선택 테두리는 파란색 대신 오류 빨간색을 우선한다. 모달이 열린 동안 페이지 메시지는 배경에 있으며 폼 내부 오류로 즉시 확인한다. 검증에 성공하면 상단 메시지를 비운다.

### 컬럼 고유값 검증

```typescript
{
  field: 'customerName',
  headerName: '거래처명',
  editable: true,
  required: true,
  validation: { unique: true },
}
```

`validation.unique`는 폼 적용과 `validate()`에서 같은 공통 중복 검증을 실행한다. 비교 대상은 삭제되지 않은 전체 로드 행과 신규/수정 행이며 그리드 필터·정렬·가상화로 숨겨진 행도 포함한다. 문자열은 앞뒤 공백을 제거하고 대소문자를 구분한다. 빈 값은 고유성 검사에서 제외해 `required`가 처리하고, 숫자 0과 boolean false는 비교한다. 수정 중인 자기 행은 `rowKey`로 제외한다. 실패 시 `거래처명 값이 중복되었습니다.`를 기존 오류 콜백·상단 메시지·빨간 표시로 전달한다.

여러 행을 검사할 때 `createGridValidationContext(rows, columns, rowKey)`로 고유값 인덱스를 한 번 생성한 후 `validateGridRow(row, columns, context)`에 전달한다. 단독 `F1GridFormModal` 사용자는 `validationRows`로 비교할 행을 전달한다. 기본 F1Grid는 활성 행을 자동 연결한다. 서버 검색으로 로드되지 않은 데이터와 동시 저장은 클라이언트 검증 범위가 아니므로 서버의 검증이 반드시 필요하다.

사업자번호처럼 표시 구분자를 무시해야 하는 컬럼은 `validation: { unique: 'digits' }`를 선언한다. ASCII 숫자만 비교하므로 `012-34-56789`, `0123456789`, `012 34 56789`는 같은 값이다. 앞자리 0은 유지하고 입력/저장 표기는 변경하지 않는다. 숫자가 없는 값은 중복 비교에서 제외하며 필수/자리수 검증은 기존대로 우선한다. 거래처 사업자번호는 폼 적용과 최종 저장에서 `사업자번호 값이 중복되었습니다.`를 공통 오류 경로로 표시한다.

거래처 서버도 같은 tenant의 사용/미사용 사업자번호를 숫자로 비교하고 수정 자기 ID를 제외한다. `uq_tb_customer_info_tenant_business_no` 인덱스는 빈 숫자키를 제외한 동일 규칙으로 동시 저장을 방어한다. [사업자번호 DB 변경 이력](../../../../docs/database/20261023/20261023_002_change_customer_business_no_unique.md)의 스크립트는 별도 배포 대상이며 실제 DB에는 적용하지 않았다.

거래처관리 백엔드는 같은 tenant의 사용/미사용 이름을 trim 후 검사하고 수정 자기 ID를 제외한다. 신규 `uq_tb_customer_info_tenant_name` 인덱스를 적용하면 동시 저장도 DB에서 차단한다. 기존 거래처코드 중복 방지와는 별도 규칙이다. 인덱스 스크립트는 [20261023 DB 변경 이력](../../../../docs/database/20261023/20261023_001_change_customer_name_unique.md)을 참고하며 실제 적용은 별도 운영 절차다.

거래처 관리 화면은 `customerCode`를 목록에 표시하되 행 폼과 셀 편집에서는 제외하며, 신규 저장 시 서버의 eGov ID Generator가 코드를 생성하고 요청 코드 값은 무시한다. 수정 요청의 코드 값도 무시하여 기존 코드를 유지한다. `customerName` 등 나머지 업무 필드는 기존 행 폼에서 등록·수정한다. `juridNo`, `postCode`, `facsimileNo`, `custMemo`처럼 목록에서 숨기는 업무 필드는 `form.hidden: false`를 지정해 행 폼에는 포함한다. `F1GridColumn.sanitizeInput`은 기존 사용자 정의 입력 정규화로 사용할 수 있다. `inputFormat`을 지정하면 공통 formatter가 인라인 텍스트 입력, 행 폼, TSV 붙여넣기, 검색 metadata에 연결된 상세검색에 동일 적용한다. 거래처 화면은 사업자번호 `000-00-00000`(10자리), 법인등록번호 `000000-0000000`(13자리), 우편번호 5자리, 국내 전화·팩스(`02` 9·10자리, 그 외 10·11자리) 규칙을 입력 상한과 저장 검증에 함께 사용한다. 저장은 페이지의 `getChanges()` 결과를 공통코드와 같은 변경 집합 구조로 묶어 `POST /api/v1/co/master/customers/save-batch`에 한 번 전달한다. 신규·수정은 하나의 트랜잭션으로 저장하며 실패 시 변경 상태를 유지한다. 저장 완료 후 재조회만 실패하면 중복 등록을 막도록 변경 상태를 해제하고 조회 재시도를 안내한다. 저장 중에는 중복 저장·편집·조회 요청을 막는다. 삭제 대신 `useAt`의 `'Y'`/`'N'`으로 사용 상태를 관리하고 삭제 변경은 거부한다.

품목관리(`/co/master/materials`)도 같은 행 폼과 배치 저장 패턴을 사용한다. `materialCode`는 목록에 표시하되 행 폼과 셀 편집에서는 제외하며, 신규 저장 시 서버의 eGov IDS 6자리 채번 결과를 사용하고 요청 코드 값은 무시한다. 수정 요청의 코드 값도 무시하여 기존 코드를 유지한다. `materialName`과 `materialTypeCode`는 필수이며 업무 컬럼의 길이와 중량/안전재고/소비기한 숫자 계약을 저장 전에 검증한다. 목록에서 숨기는 규격2, 바코드, 위치, 품목보고번호 등은 `form.hidden: false`로 그룹별 폼에 포함한다. 단일 키워드와 컬럼 metadata 기반 상세검색을 함께 서버에 전달한다. 품목유형/보관방법/소비기한 기준의 표시명은 인증 tenant의 활성 공통코드에서 가져온다. `expiryedCount`는 소비기한 기준 옆에 배치하고 `DAY`/`MONTH`/`YEAR` 선택에 따라 `일`/`개월`/`년` 단위 label을 표시한다. `NONE`에서는 숫자를 NULL로 비우고 입력을 비활성화하며, 활성 기준은 1~2147483647 양의 정수를 요구한다. 활성 기준끼리는 숫자를 유지하고 단위 label만 바뀐다. 공통코드 그룹·상세 seed는 [tenant 지정 SQL](../../../../docs/database/20261023/20261023_004_seed_material_common_codes.sql)에 보관하며 기존 자연 키 정의를 덮어쓰지 않는다. `POST /api/v1/co/master/materials/save-batch`로 신규·수정을 단일 트랜잭션으로 저장하며 실패 시 dirty를 보존한다. 빈 숫자는 null, 0은 0으로 유지한다. 품목 테이블에는 거래처의 `useAt` 컬럼이 없으므로 사용여부를 추가하지 않고, 삭제되지 않은 품목만 조회/수정하며 삭제 액션과 삭제 변경 요청은 허용하지 않는다.

품목관리의 기본 업무 컬럼은 품목계정코드 → 품목코드 → 품목명 순서이며 No와 함께 왼쪽 고정한다. 품목계정코드(`ITEM_TYPE`), 단위(`ITEM_UNIT`), 품목유형(`MATERIAL_TYPE`), 보관방법(`STORE_METHOD`), 소비기한기준(`EXPIRY_STATUS`)은 공통코드 select로 연결한다. 품목분류(`matCataType`)는 목록·행 폼·상세검색에서 제외하지만 기존 저장값과 API 필드는 보존한다. 품목코드·품목유형·보관방법·소비기한기준은 가운데, 안전재고는 오른쪽 정렬한다. 소비기한 새 선택지는 공통코드에 등록된 `NONE/DAY/MONTH/YEAR`로 제한하고 기존 행의 미등록 허용 코드는 코드명 그대로 보존한다. 이전 사용자 컬럼 설정이 변경된 기본 순서와 고정을 덮어쓰지 않도록 품목 전용 저장 키를 `co-master-material-grid-v2`로 변경하여 컬럼 설정을 한 번 초기화한다.

### F1-Tree와 반응형 UI

`F1TreeRef.addRow()`는 부모 기본값을 유지한 루트 draft를 열고, `addChildRow(parentId, partial?)`는 `parentKey` 값을 보존한 하위 draft를 연다. 하위 행은 적용된 뒤에만 추가되고 부모 노드가 펼쳐지며, 취소 시 펼침 상태를 바꾸지 않는다. 트리 펼침 상태와 모달 open 상태는 독립적이다.

1280px 이상에서는 최대 `960px`의 3열 폼, 768px 이상 1280px 미만에서는 2열 폼, 768px 미만에서는 full-screen 1열 폼을 사용한다. `form.span`은 각 뷰포트의 가용 열 수를 넘지 않게 제한된다. 모달은 `background`, `text`, `divider`, `primary`, `action` MUI 테마 토큰을 사용해 라이트·다크 테마에 대응한다.

행 폼 모달의 외곽은 공통 `CommonDialog` 셸을 사용한다. 제목·선택 설명·닫기 동작은 공통 헤더에 배치되고 본문만 세로 스크롤되며 헤더와 푸터는 유지된다. “적용 후 화면의 저장 버튼으로 최종 저장됩니다.” 안내는 선택형 푸터 좌측 슬롯에, 적용/취소는 우측 액션 영역에 표시한다. 기안양식관리처럼 `rowFormPlugin`을 사용하는 화면도 동일한 셸을 공유하며, 폼 필드/그룹 배치는 기존 화면 설정을 따른다.

footer 경계는 공통 셸이 색상 prop 없이 렌더링하는 기본 MUI `Divider` 한 개로 표시한다. 본문이나 호출 화면에서 추가 하단 경계선을 넣지 않는다.

다크 테마에서 모달 외곽·헤더·푸터는 슬레이트 `#1e293b`, 본문은 페이지 바탕인 `background.default`를 사용한다. 폼 내부 그룹은 `background.paper`로 구분하고, 라이트 테마는 기존 paper/본문 배경 조합을 유지한다.

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

기본적으로 F1Grid/F1Tree 바디 영역(체크박스 열, 데이터 셀, 빈 여백 포함)을 우클릭하면 커서 위치에 컨텍스트 메뉴가 표시된다. `disableContextMenu={true}`이면 그리드 메뉴와 브라우저 기본 우클릭 메뉴를 모두 표시하지 않지만 기본 설정에서는 우클릭 대상 셀/행 선택은 유지한다. `selectRowOnContextMenu={false}`이면 메뉴 활성화 여부와 무관하게 행 선택은 변경하지 않는다. 헤더 영역 우클릭은 대상에서 제외되며 기존 헤더 클릭 메뉴(정렬/필터/고정/숨김)는 그대로 사용할 수 있다.

일반 F1Grid의 메뉴 구성:

```text
엑셀 내보내기            (canExportExcel=true 일 때만 표시)
컬럼 길이 자동 조정
──────────────
행 추가
위에 행 삽입             (일반 F1Grid에서 행을 우클릭했을 때 표시)
아래에 행 삽입           (일반 F1Grid에서 행을 우클릭했을 때 표시)
행 복사                  (선택/대상 행이 없으면 비활성화)
행 삭제                  (선택/대상 행이 없으면 비활성화)
──────────────
필터 해제                (적용된 필터가 없으면 비활성화, disableFiltering이면 미표시)
정렬 해제                (적용된 정렬이 없으면 비활성화, disableSorting이면 미표시)
──────────────
설정을 기본값으로 복원
```

F1Tree는 `루트 추가` 항목이 `컬럼 길이 자동 조정` 아래, `행 추가` 위에 추가로 표시된다. F1Tree도 `F1Grid`와 동일하게 호출자가 전달한 `disableSorting`/`disableFiltering` 정책을 따르므로, 두 기능이 활성화된 화면에서는 필터 해제/정렬 해제 항목을 사용할 수 있다.

`disableFiltering`과 `disableSorting`으로 필터 해제/정렬 해제 항목이 모두 숨겨지면 해당 빈 그룹 앞 구분선도 숨기고, 설정 복원 앞 구분선만 유지한다. 두 항목 중 하나라도 표시되면 그룹 구분선은 기존처럼 표시된다.

관련 Props:

- `disableContextMenu?: boolean` — F1Grid/F1Tree 바디 우클릭 컨텍스트 메뉴와 브라우저 기본 메뉴 비활성화 여부. 기본값 `false`. 비활성화 중에도 기본 설정에서는 우클릭 대상 선택은 유지하며, 옵션이 켜지면 열려 있는 메뉴를 닫는다. 헤더 메뉴에는 영향을 주지 않는다.
- `selectRowOnContextMenu?: boolean` — 우클릭 시 대상 행 선택 여부. 기본값 `true`로 기존 선택 동작을 유지한다. `false`이면 기존 행 선택을 변경하거나 `onSelectionChange`를 발생시키지 않고 대상 셀 포커스/범위 및 메뉴만 갱신한다. `disableContextMenu`와 독립적으로 적용되며, 우클릭은 좌클릭 드래그 선택을 시작하지 않는다.
- `canExportExcel?: boolean` — 엑셀 내보내기 메뉴 노출 여부. 기본값 `false`(미표시). 페이지별 엑셀 권한과 연동해서 사용한다(예: 메뉴관리 화면).
- `excelFileName?: string` — 내보낼 파일명(확장자 `.xlsx`는 자동 부여). 기본값은 `${ariaLabel}-export`.
- `allowAddRowInContextMenu?: boolean` — 우클릭 메뉴에 `행 추가` 및 일반 F1Grid의 `위에 행 삽입`/`아래에 행 삽입`을 노출할지 여부. 기본값 `true`.
- `allowDuplicateRowInContextMenu?: boolean` — 우클릭 메뉴에 `행 복사`를 노출할지 여부. 기본값 `true`.
- `allowDeleteRowInContextMenu?: boolean` — 우클릭 메뉴에 `행 삭제`를 노출할지 여부. 기본값 `true`.
- `treeContextMenu` — `F1Tree`가 내부적으로만 주입하는 트리 전용 확장 포인트(`onAddRoot`, `onAddChild`). `F1Grid`를 직접 사용하는 화면에서는 지정하지 않는다.

동작 요약:

- **엑셀 내보내기**: 화면에 보이는 컬럼/행(필터·정렬·숨김·순서 반영) 기준으로 `.xlsx` 파일을 생성한다. `exceljs`를 클릭 시점에 동적 로딩(`await import('exceljs')`)해 초기 번들 크기에 영향을 주지 않는다. `number`/`decimal`/`currency`는 숫자 셀, `date`는 Grid `format`이 적용된 텍스트 셀, `datetime`은 Excel 날짜·시간 셀, `time`은 시간 서식이 적용된 Excel 숫자 serial, `checkbox`는 Boolean 셀로 기록한다. 숫자는 그룹 구분자를 적용하며 기본 `number`/`decimal`은 정수 값에 `#,##0`, 소수 값에 `#,##0.#####`를 사용해 정수 뒤 불필요한 소수점 구분자를 표시하지 않는다. 명시한 `decimalPlaces`는 고정 자릿수로 내보낸다. `format: 'currency'`는 KRW 서식을 적용하며 기본 소수점은 0자리다. Excel 헤더와 데이터 셀은 각각 Grid의 `headerAlign`과 `align`을 따르며, 미지정 시 헤더는 가운데, 본문은 `number`/`rownumber` 오른쪽 및 그 외 왼쪽 정렬이다. `date`는 Grid 화면과 동일한 문자열 표현을 우선하므로 Excel 날짜 계산/정렬용 날짜 값으로 저장하지 않는다. select/autocomplete/user/code 등은 기존 화면 표시 텍스트(label 포함)를 유지하고, 문자열 셀은 Excel 텍스트 서식(`@`)을 적용해 `000004` 같은 코드값을 Excel에서 편집한 뒤에도 문자열로 보존한다. `null`/`undefined`/빈 문자열은 빈 셀, 변환할 수 없는 비어 있지 않은 typed 값은 원문 텍스트로 보존한다. date-only 문자열과 offset이 포함된 timestamp는 그리드 표시와 동일하게 문자열에 적힌 날짜 부분을 사용해 timezone에 의해 날짜가 바뀌지 않는다. 숫자로 이미 전달된 원본의 선행 0은 내보내기에서 복원하지 않으므로 품목코드 같은 식별자는 데이터와 컬럼에서 문자열로 유지한다. npm에 공개된 `xlsx`(SheetJS) 패키지는 미패치 상태의 High 심각도 취약점(Prototype Pollution, ReDoS)이 있어 채택하지 않았다.
- **컬럼 길이 자동 조정**: 현재 표시된 컬럼 전체에 `getAutoFitColumnWidth`를 적용해 폭을 일괄 재계산한다.
- **루트 추가**(F1Tree 전용): 우클릭 위치와 무관하게 최상위 루트 행을 추가한다.
- **행 추가**: 일반 F1Grid에서는 데이터 순서의 맨 아래에 새 행을 추가한다. F1Tree에서는 우클릭한 행의 자식으로 추가하고(대상이 없으면 루트로 추가) 기존 트리 동작을 유지한다.
- **위에 행 삽입 / 아래에 행 삽입**: 일반 F1Grid에서 데이터 행을 우클릭했을 때만 표시된다. 우클릭한 행의 바로 앞/뒤 데이터 순서에 신규 행을 삽입하고, 신규 행을 선택해 첫 편집 가능 셀에 포커스를 준 뒤 viewport 안으로 스크롤한다. 가상 행 렌더링이 활성화된 그리드에서도 신규 행을 볼 수 있다. 정렬 또는 필터가 적용 중이면 두 항목은 `정렬/필터 해제 필요` 안내와 함께 비활성화되며, 삽입 과정에서 현재 정렬/필터를 자동 변경하지 않는다. `행 추가`와 `F1GridRef.addRow()`는 계속 맨 아래에 추가한다.
- **행 복사 / 행 삭제**: 우클릭한 행이 현재 선택에 없으면 그 행만 단일 선택으로 교체한 뒤 기존 복제/삭제 로직을 재사용한다. 대상 행도 선택도 없으면 비활성화된다.
- **필터 해제 / 정렬 해제**: 각각 `setFilterState([])` / `setSortState([])`.
- **설정을 기본값으로 복원**: 컬럼 순서/폭/숨김/고정을 컬럼 정의 기준 초기값으로 되돌리고 `storageKey` 로컬 스토리지 값을 제거한다.
- `storageKey`는 실제 그리드 인스턴스마다 고유한 안정적 값으로 지정한다. 값을 지정한 경우에만 컬럼 레이아웃을 브라우저에 저장하며, 미지정 시 저장하지 않는다.

화면별 Custom Menu 확장은 아직 지원하지 않는다(⚠️ 아직 미구현).

문서현황은 행 선택 시 상세를 여는 화면이므로 `selectRowOnContextMenu={false}`로 우클릭 상세 열기를 막는다. 전체 조회된 행에 대한 헤더 필터 메뉴를 제공하며, 정렬·필터는 서버 재조회 없이 로컬 적용한다. 메뉴는 활성화하고 `canExportExcel`로 엑셀 내보내기를 제공하며, `allowAddRowInContextMenu`, `allowDuplicateRowInContextMenu`, `allowDeleteRowInContextMenu`를 모두 false로 지정해 행 추가·삽입·복사·삭제 메뉴를 숨긴다. 필터 상태가 없더라도 행 컨텍스트 메뉴의 `필터 해제`는 표시되며 비활성화된다. 왼쪽 클릭 및 체크박스 선택의 상세 열기는 유지한다.

컨텍스트 메뉴 닫힘/재오픈 규칙:

- 메뉴가 열린 상태에서 그리드 바깥(다른 카드, 검색 영역, 브레드크럼 등)을 좌클릭하거나 우클릭하면 메뉴는 그 자리에서 다시 열리지 않고 즉시 닫힌다.
- 메뉴가 열린 상태에서 같은 그리드 또는 다른 그리드 영역(바디 여백 또는 셀)을 다시 우클릭하면, 기존 메뉴는 닫히고 새로 클릭한 셀/행이 먼저 선택된 뒤 그 위치에 메뉴가 다시 열린다. `selectRowOnContextMenu={false}`인 그리드는 기존 행 선택을 유지하고 셀 포커스/범위만 이동한다.
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

편집 가능 여부에 따른 헤더 강조선은 표시하지 않는다. 상단/하단 강조선, 별도 아이콘이나 배경색은 추가하지 않으며 기존 셀 편집 테두리는 유지한다.

편집 가능 헤더 속성의 판정 조건(모두 만족해야 적용):

1. 그리드에 활성화된 editor plugin이 하나 이상 존재한다.
2. 화면에 보이는 행(`visibleRows`) 중 하나 이상에서 `isCellEditable(column, row)`이 참이다. 즉 컬럼의 `editable: true` 선언만으로는 표시되지 않는다.
3. 활성 editor plugin에 `canEdit(context)`가 정의되어 있다면 그 조건도 함께 만족해야 한다.

실제 구현은 `editableColumnFields` 집합을 계산할 때 위 조건을 모두 통과한 컬럼만 `data-editable-column="true"`로 헤더에 반영한다. 이 속성은 테스트/디버깅용이며 시각적 강조를 추가하지 않는다. 정렬 인디케이터, 필터 표시, 고정 컬럼과 드롭 대상의 기존 그림자, 그룹 헤더 구분선은 유지한다.

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

`F1GridRef.validate()`는 현재 구현된 API다. 명시적 저장 액션에서는 API 호출 전에 실행하고, `false`이면 저장을 중단해 셀 오류와 입력 안내를 표시한다. 컬럼의 `required`, `min`, `max`, `validate` 설정을 재사용한다.

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
- 세로 스크롤 위치와 viewport 크기/스크롤바 gutter는 기존처럼 `requestAnimationFrame`으로 측정한다. 가로 스크롤은 네이티브 본문 스크롤과 헤더 동기화를 유지하며, 컬럼 가상화가 꺼져 있거나 현재 표시할 열 집합이 바뀌지 않으면 수평 위치만으로 React viewport 상태를 다시 렌더하지 않는다. 표시 열 집합이 바뀌면 pinned/protected 컬럼을 포함해 새 범위를 반영한다.
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
- 셀 드래그 포인터 hit 테스트와 범위 오버레이 좌표 계산은 `rowIndexById`를 재사용해 행 수에 비례하는 반복 ID 검색을 피한다.
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

---

# 36. UserSelectEditor 선택 옵션

공통 `UserSelectEditor`는 다음 선택적 속성으로 선택 후보와 선택값 표시 순서를 제어할 수 있다.

- `hideSelectedOptions`: `true`이면 이미 선택된 사용자를 드롭다운 후보에서 숨긴다. 선택값은 입력 안의 칩으로 계속 표시한다. 기본값은 `false`다.
- `preserveSelectionOrder`: `true`이면 선택 ID 배열 순서대로 선택 칩을 표시한다. 기본값은 `false`다.
- 각 옵션은 필요한 화면에서만 활성화하며, 기본값을 사용하는 기존 화면의 동작은 유지한다.

# 37. UserSelectEditor 라벨 수직 정렬

Outlined 사용자 선택 필드의 비축소 라벨은 작은 입력 높이와 라벨 폰트 크기에 맞춰 수직 중앙에 보이도록 위치를 보정한다. 포커스 또는 값 선택 후 축소되는 라벨의 위치와 compact Grid cell 편집기의 standard 입력 스타일은 변경하지 않는다.

# 38. 행 식별자 고유성

F1-Grid에 전달하는 모든 행은 `rowKey` 값이 안정적이고 서로 달라야 한다. API 조인 결과에 같은 업무 행이 여러 번 포함되어 같은 `rowKey`가 반복되면 React key 충돌과 잘못된 행 렌더링이 발생할 수 있다. 중복 행이 나타나면 화면에서 임의로 행을 숨기기보다 API 쿼리 또는 데이터 관계의 조인 cardinality를 바로잡는다.

# 39. 커뮤니티 자료실 파일/폴더 그리드

커뮤니티 자료실은 게시글 중심 그리드에서 파일 중심 그리드로 전환했다.

- 목록 API는 `/api/v1/groupware/boards/archive/files`를 사용하며 `keyword`, `folderCode`, `uploadedFrom`, `uploadedTo`, `fileType`을 한 번에 전달해 전체 검색 결과를 한 응답으로 받는다. `offset`/`limit`, 페이지 이동, 더 보기 동작은 사용하지 않는다.
- 날짜 검색은 최근 1년을 기본값으로 사용하고, 종료일을 포함해 검색한다. 유형 `ALL`은 API 조건에서 생략한다.
- 2026-10-21부터 목록은 F1Grid 대신 `F1Tree`(`parentKey="parentId"`, `treeColumn="name"`, `defaultExpandAll`)로 표시하며 `F1GridDataSource` 대신 로컬 `rows`를 전달한다. `rowKey`/`parentId`는 `section:folders`(부모 `null`), `section:files`(부모 `null`), `folder:<itemCode>`(부모 `section:folders`), `file:<boardFileId>`(부모 `section:files`)이다. 파일을 분류 아래로 중첩하지 않으며, 분류 이름 클릭은 기존처럼 현재 폴더 필터를 바꾼다.
- 파일 업로드(`POST` 직접 업로드)는 게시글 INSERT 시 인증 사용자의 `writerId`/`writerName`을 함께 전달한다(`tb_board_post.writer_id` NOT NULL). 누락 시 공통 DB 오류 메시지가 표시되던 문제의 수정이다.
- 루트에는 분류 폴더와 파일 섹션을 함께 표시한다. 폴더를 선택하면 경로와 해당 폴더의 파일만 표시하고, 루트 이동으로 돌아올 수 있다. 파일 날짜/유형 검색 중에도 루트의 폴더 탐색은 유지한다.
- 컬럼은 `이름`, `소유자`, `올린 날짜`, `크기`, `작업` 순서이며, 정렬/필터는 비활성화한다. 우클릭 메뉴의 엑셀 내보내기는 활성화하고 루트 추가, 행 추가, 행 삭제, 행 복제 메뉴는 비활성화한다. 컨텍스트 메뉴 구분선은 비어 있지 않은 액션 그룹 사이에만 표시되므로, 자료실에서는 일반 메뉴와 기본 설정 복원 사이에 하나만 표시된다.
- 폴더 생성은 기존 `WF_ARCHIVE_CATEGORY` 공통코드 도움창을 사용한다. 새 항목의 코드가 비어 있으면 공통코드 서비스가 코드를 자동 생성한다.
- 업로드/폴더 생성/파일 수정/삭제 작업은 tenant 관리자 및 메뉴 권한으로 제어한다. 비활성 폴더는 탐색·다운로드할 수 있지만 업로드, 이름 변경, 이동, 삭제는 허용하지 않는다.
- `새 자료 등록`은 메타데이터 입력 폼 없이 hidden `input[type=file][multiple]`을 즉시 열고, 선택 파일을 개별 업로드 요청으로 처리한다.
- 업로드/삭제 같은 mutation 후에는 파일 목록을 재조회하여 서버 상태와 즉시 동기화한다.

import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import {
  F1Grid,
  F1Tree,
  type F1GridColumn,
  type F1GridRef,
} from '../../../shared/components/f1-grid';
import type { PlaygroundKind } from '../types';

type DemoStatus = 'active' | 'idle' | 'blocked';

type DemoRow = {
  id: string;
  code: string;
  name: string;
  group: string;
  qty: number;
  status: DemoStatus;
};

const baseRows: DemoRow[] = [
  {
    id: 'one',
    code: 'ITEM-001',
    name: '스테인리스 배관 부품',
    group: '원자재',
    qty: 10,
    status: 'active',
  },
  {
    id: 'two',
    code: 'ITEM-001',
    name: '스테인리스 배관 부품',
    group: '원자재',
    qty: 5,
    status: 'idle',
  },
  {
    id: 'three',
    code: 'ITEM-002',
    name: '실리콘 패킹 가스켓',
    group: '부자재',
    qty: 100,
    status: 'blocked',
  },
];

type TreeDemoRow = {
  id: string;
  parentId?: string | null;
  name: string;
  type: string;
  owner: string;
};

type RowFormDemoRow = {
  id: string;
  itemName: string;
  quantity: number;
  active: boolean;
  effectiveDate: string;
  status: 'ready' | 'paused';
};

const rowFormRows: RowFormDemoRow[] = [
  {
    id: 'one',
    itemName: '스테인리스 배관 부품',
    quantity: 10,
    active: true,
    effectiveDate: '2026-09-10',
    status: 'ready',
  },
  {
    id: 'two',
    itemName: '실리콘 패킹 가스켓',
    quantity: 100,
    active: false,
    effectiveDate: '2026-09-12',
    status: 'paused',
  },
];

const rowFormColumns: F1GridColumn<RowFormDemoRow>[] = [
  {
    field: 'itemName',
    headerName: '품목명',
    headerGroup: '기본 정보',
    editable: true,
    required: true,
    width: 190,
    form: { span: 2 },
  },
  {
    field: 'quantity',
    headerName: '수량',
    headerGroup: '기본 정보',
    type: 'number',
    editable: true,
    min: 0,
    width: 90,
  },
  {
    field: 'active',
    headerName: '사용 여부',
    headerGroup: '운영 정보',
    type: 'checkbox',
    editable: true,
    width: 100,
  },
  {
    field: 'effectiveDate',
    headerName: '적용일',
    headerGroup: '운영 정보',
    type: 'date',
    editable: true,
    required: true,
    width: 120,
  },
  {
    field: 'status',
    headerName: '상태',
    headerGroup: '운영 정보',
    type: 'select',
    editable: true,
    width: 100,
    options: [
      { value: 'ready', label: '운영' },
      { value: 'paused', label: '중지' },
    ],
  },
];

const treeRows: TreeDemoRow[] = [
  {
    id: 'erp',
    parentId: null,
    name: 'ERP 시스템',
    type: 'root',
    owner: '기획팀',
  },
  {
    id: 'base',
    parentId: 'erp',
    name: '기준정보',
    type: 'group',
    owner: '기준팀',
  },
  {
    id: 'org',
    parentId: 'base',
    name: '조직관리',
    type: 'menu',
    owner: '인사팀',
  },
  {
    id: 'dept',
    parentId: 'org',
    name: '부서관리',
    type: 'page',
    owner: '인사팀',
  },
  {
    id: 'code',
    parentId: 'org',
    name: '공통코드',
    type: 'page',
    owner: '시스템팀',
  },
  {
    id: 'sales',
    parentId: 'erp',
    name: '영업관리',
    type: 'group',
    owner: '영업팀',
  },
  {
    id: 'customer',
    parentId: 'sales',
    name: '고객관리',
    type: 'menu',
    owner: '영업팀',
  },
  {
    id: 'contract',
    parentId: 'customer',
    name: '계약관리',
    type: 'page',
    owner: '영업팀',
  },
  {
    id: 'report',
    parentId: 'erp',
    name: '리포트',
    type: 'group',
    owner: '분석팀',
  },
];

const columns: F1GridColumn<DemoRow>[] = [
  {
    field: 'code',
    headerName: '품목코드',
    width: 130,
    pinned: 'left',
    editable: true,
  },
  {
    field: 'name',
    headerName: '품목명',
    width: 190,
    editable: true,
    wrapText: true,
    mergeRows: true,
  },
  { field: 'group', headerName: '분류', width: 110, editable: true },
  {
    field: 'qty',
    headerName: '수량',
    width: 90,
    type: 'number',
    editable: true,
    align: 'right',
    decimalPlaces: 1,
  },
];

const statusMeta: Record<
  DemoStatus,
  { label: string; color: string; background: string; border: string }
> = {
  active: {
    label: '활성',
    color: '#1a7f5a',
    background: '#e8f7ee',
    border: '#8dd3a9',
  },
  idle: {
    label: '대기',
    color: '#7a5b00',
    background: '#fff4db',
    border: '#e2b95a',
  },
  blocked: {
    label: '중지',
    color: '#b42318',
    background: '#fef3f2',
    border: '#f4b0a7',
  },
};

const renderHookColumns: F1GridColumn<DemoRow>[] = [
  {
    field: 'code',
    headerName: '품목코드',
    width: 130,
    pinned: 'left',
    editable: true,
  },
  {
    field: 'name',
    headerName: '품목명',
    width: 210,
    editable: true,
    wrapText: true,
  },
  {
    field: 'status',
    headerName: '상태',
    width: 110,
    editable: false,
    align: 'center',
    renderCell: ({ value }) => {
      const status = String(value ?? 'idle') as DemoStatus;
      const meta = statusMeta[status] ?? statusMeta.idle;
      return (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 62,
            px: 1,
            py: 0.5,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.02em',
            backgroundColor: meta.background,
            color: meta.color,
            border: `1px solid ${meta.border}`,
          }}
        >
          {meta.label}
        </Box>
      );
    },
    getCellStyle: ({ value }) => {
      const status = String(value ?? 'idle') as DemoStatus;
      const meta = statusMeta[status] ?? statusMeta.idle;
      return {
        backgroundColor: meta.background,
        color: meta.color,
        borderRadius: 8,
        padding: '2px 8px',
        border: `1px solid ${meta.border}`,
      };
    },
    getCellProps: ({ value }) => {
      const status = String(value ?? 'idle') as DemoStatus;
      const meta = statusMeta[status] ?? statusMeta.idle;
      return {
        title: `상태: ${meta.label}`,
        'aria-label': `상태 ${meta.label}`,
      };
    },
  },
  {
    field: 'qty',
    headerName: '수량',
    width: 90,
    type: 'number',
    editable: true,
    align: 'right',
    decimalPlaces: 1,
  },
];

const treeColumns: F1GridColumn<TreeDemoRow>[] = [
  {
    field: 'name',
    headerName: '메뉴명',
    width: 220,
    editable: false,
    wrapText: true,
  },
  { field: 'type', headerName: '유형', width: 100, editable: false },
  { field: 'owner', headerName: '담당자', width: 120, editable: false },
];

type LargeDataRow = {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  status: 'active' | 'hold' | 'pending';
  quantity: number;
  amount: number;
  manager: string;
  updatedAt: string;
};

const largeDataColumns: F1GridColumn<LargeDataRow>[] = [
  {
    field: 'itemCode',
    headerName: '품목코드',
    width: 130,
    editable: false,
    pinned: 'left',
  },
  {
    field: 'itemName',
    headerName: '품목명',
    width: 220,
    editable: false,
    wrapText: true,
  },
  { field: 'category', headerName: '카테고리', width: 110, editable: false },
  {
    field: 'status',
    headerName: '상태',
    width: 100,
    editable: false,
    align: 'center',
  },
  {
    field: 'quantity',
    headerName: '수량',
    width: 90,
    type: 'number',
    editable: false,
    align: 'right',
    decimalPlaces: 0,
  },
  {
    field: 'amount',
    headerName: '금액',
    width: 120,
    type: 'currency',
    editable: false,
    align: 'right',
    format: 'currency',
  },
  { field: 'manager', headerName: '담당자', width: 120, editable: false },
  {
    field: 'updatedAt',
    headerName: '수정일',
    width: 120,
    editable: false,
    type: 'date',
  },
];

function createLargeDataset(rowCount: number): LargeDataRow[] {
  return Array.from({ length: rowCount }, (_, index) => {
    const rowNo = index + 1;
    const status: LargeDataRow['status'] =
      rowNo % 3 === 0 ? 'pending' : rowNo % 2 === 0 ? 'hold' : 'active';
    const categoryList = ['원자재', '부자재', '반제품', '완제품'];
    const managerIndex = ((rowNo - 1) % 18) + 1;
    const dateValue = new Date(2026, 8, ((rowNo - 1) % 28) + 1);

    return {
      id: `large-${rowNo}`,
      itemCode: `ITEM-${String(rowNo).padStart(6, '0')}`,
      itemName: `대용량 시뮬레이션 품목 ${rowNo}`,
      category: categoryList[(rowNo - 1) % categoryList.length],
      status,
      quantity: ((rowNo * 17) % 2000) + 10,
      amount: rowNo * 3850 + 12500,
      manager: `담당자 ${String(managerIndex).padStart(2, '0')}`,
      updatedAt: dateValue.toISOString().slice(0, 10),
    };
  });
}

function LargeDataPlayground() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<LargeDataRow[]>(() =>
    createLargeDataset(250),
  );
  const loadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadTimerRef.current !== null) {
        window.clearTimeout(loadTimerRef.current);
      }
    };
  }, []);

  function handleLoadSample(nextSize: number) {
    if (loadTimerRef.current !== null) {
      window.clearTimeout(loadTimerRef.current);
    }

    setLoading(true);
    loadTimerRef.current = window.setTimeout(() => {
      setRows(createLargeDataset(nextSize));
      setLoading(false);
      loadTimerRef.current = null;
    }, 250);
  }

  return (
    <Box className="f1-doc-playground" data-testid="f1-grid-doc-playground">
      <Box className="f1-doc-playground-controls">
        <Typography variant="subtitle1">Try it</Typography>
        <Typography variant="body2">
          대용량 셀 렌더링과 선택 상태 유지: 1,000건/10,000건 샘플을 클릭으로
          로드해 검증합니다.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Button size="small" onClick={() => handleLoadSample(1000)}>
            1,000 rows
          </Button>
          <Button size="small" onClick={() => handleLoadSample(10000)}>
            10,000 rows
          </Button>
        </Box>
      </Box>
      <Box className="f1-doc-grid-wrap">
        <F1Grid
          rows={rows}
          columns={largeDataColumns}
          rowKey="id"
          storageKey="f1-grid-docs-large-data"
          ariaLabel="F1-Grid large dataset example"
          height={420}
          showCheckbox
          rowHeight={32}
          loading={loading}
        />
      </Box>
    </Box>
  );
}

function ContextMenuPlayground() {
  const gridRef = useRef<F1GridRef<DemoRow>>(null);
  const [rows, setRows] = useState(baseRows);
  const [exportEnabled, setExportEnabled] = useState(true);
  const [showAddRow, setShowAddRow] = useState(true);
  const [showDuplicateRow, setShowDuplicateRow] = useState(true);
  const [showDeleteRow, setShowDeleteRow] = useState(true);
  const [contextMenuDisabled, setContextMenuDisabled] = useState(false);

  function createDuplicate(row: DemoRow): DemoRow {
    return {
      ...row,
      id: `${row.id}-copy-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  return (
    <Box className="f1-doc-playground" data-testid="f1-grid-doc-playground">
      <Box className="f1-doc-playground-controls">
        <Typography variant="subtitle1">Try it</Typography>
        <Typography variant="body2">
          바디 우클릭 메뉴를 끄면 브라우저 메뉴도 표시하지 않으며, 우클릭
          대상 선택과 헤더 메뉴는 유지됩니다.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Button
            size="small"
            onClick={() => setContextMenuDisabled((value) => !value)}
          >
            {contextMenuDisabled
              ? 'Enable context menu'
              : 'Disable context menu'}
          </Button>
          <Button
            size="small"
            onClick={() => setExportEnabled((value) => !value)}
          >
            Toggle export menu
          </Button>
          <Button size="small" onClick={() => setShowAddRow((value) => !value)}>
            Toggle add row
          </Button>
          <Button
            size="small"
            onClick={() => setShowDuplicateRow((value) => !value)}
          >
            Toggle duplicate row
          </Button>
          <Button
            size="small"
            onClick={() => setShowDeleteRow((value) => !value)}
          >
            Toggle delete row
          </Button>
        </Box>
      </Box>
      <Box className="f1-doc-grid-wrap">
        <F1Grid
          ref={gridRef}
          rows={rows}
          columns={columns}
          rowKey="id"
          storageKey="f1-grid-docs-context-menu"
          ariaLabel="F1-Grid context menu example"
          height={260}
          showCheckbox
          disableContextMenu={contextMenuDisabled}
          canExportExcel={exportEnabled}
          excelFileName="f1-grid-context-menu-demo"
          allowAddRowInContextMenu={showAddRow}
          allowDuplicateRowInContextMenu={showDuplicateRow}
          allowDeleteRowInContextMenu={showDeleteRow}
          createDuplicate={createDuplicate}
          onSelectionChange={() => {
            gridRef.current?.getSelectedRows();
          }}
        />
      </Box>
      <Button size="small" onClick={() => setRows(baseRows)}>
        Reset sample
      </Button>
    </Box>
  );
}

function RowFormModalPlayground() {
  const gridRef = useRef<F1GridRef<RowFormDemoRow>>(null);
  const nextRowNumber = useRef(rowFormRows.length + 1);
  const [rows, setRows] = useState(rowFormRows);
  const [changes, setChanges] = useState(0);

  function createRow(): RowFormDemoRow {
    const id = `form-${String(nextRowNumber.current).padStart(3, '0')}`;
    nextRowNumber.current += 1;
    return {
      id,
      itemName: '',
      quantity: 0,
      active: true,
      effectiveDate: '2026-09-10',
      status: 'ready',
    };
  }

  function resetSample() {
    nextRowNumber.current = rowFormRows.length + 1;
    setRows(rowFormRows.map((row) => ({ ...row })));
    setChanges(0);
  }

  return (
    <Box className="f1-doc-playground" data-testid="f1-grid-doc-playground">
      <Box className="f1-doc-playground-controls">
        <Typography variant="subtitle1">Try it</Typography>
        <Typography variant="body2">
          상세 버튼으로 수정하거나 신규 행을 폼으로 등록하세요. 적용 후 변경은
          Grid 상태에만 남습니다.
        </Typography>
        <Typography variant="body2">변경된 행: {changes}</Typography>
        <Button size="small" onClick={() => gridRef.current?.addRow()}>
          신규 행 추가
        </Button>
      </Box>
      <Box className="f1-doc-grid-wrap">
        <F1Grid
          ref={gridRef}
          rows={rows}
          columns={rowFormColumns}
          rowKey="id"
          storageKey="f1-grid-docs-row-form-modal"
          ariaLabel="F1-Grid row form modal example"
          height={280}
          showCheckbox={false}
          createRow={createRow}
          rowFormPlugin={{ id: 'f1-grid-docs-row-form', enabled: true }}
          onChangesChange={(nextChanges) =>
            setChanges(
              nextChanges.insertedRows.length + nextChanges.updatedRows.length,
            )
          }
        />
      </Box>
      <Button size="small" onClick={resetSample}>
        Reset sample
      </Button>
    </Box>
  );
}

export function F1GridPlayground({ kind }: { kind: PlaygroundKind }) {
  const gridRef = useRef<F1GridRef<DemoRow>>(null);
  const [rows, setRows] = useState(baseRows);
  const [rowHeight, setRowHeight] = useState(40);
  const [wrapText, setWrapText] = useState(true);
  const [showCheckbox, setShowCheckbox] = useState(kind === 'selection');
  const [changes, setChanges] = useState(0);

  const playgroundColumns = columns.map((column) =>
    column.field === 'name' ? { ...column, wrapText } : column,
  );
  const activeColumns =
    kind === 'layout' && !showCheckbox
      ? playgroundColumns.filter((column) => column.field !== 'group')
      : playgroundColumns;
  const displayRows = kind === 'editing' ? rows : rows;
  const displayColumns = kind === 'editing' ? renderHookColumns : activeColumns;

  function updateChanges() {
    setChanges(gridRef.current?.getChanges().updatedRows.length ?? 0);
  }

  const editingPlugin = {
    id: 'f1-grid-docs-editing-plugin',
    enabled: kind === 'editing',
    canEdit: ({ column }: { column: F1GridColumn<DemoRow> }) =>
      Boolean(column.editable),
    createEditor: ({ column }: { column: F1GridColumn<DemoRow> }) => {
      if (column.field === 'qty') return null;
      return undefined;
    },
    startEdit: () => true,
    endEdit: () => true,
  };

  if (kind === 'row-form-modal') {
    return <RowFormModalPlayground />;
  }

  if (kind === 'large-data') {
    return <LargeDataPlayground />;
  }

  if (kind === 'context-menu') {
    return <ContextMenuPlayground />;
  }

  if (kind === 'tree') {
    return (
      <Box className="f1-doc-playground" data-testid="f1-grid-doc-playground">
        <Box className="f1-doc-playground-controls">
          <Typography variant="subtitle1">Try it</Typography>
          <Typography variant="body2">계층형 데이터 예제입니다.</Typography>
        </Box>
        <Box className="f1-doc-grid-wrap">
          <F1Tree
            rows={treeRows}
            columns={treeColumns}
            rowKey="id"
            parentKey="parentId"
            treeColumn="name"
            storageKey="f1-grid-docs-tree"
            defaultExpandAll
            ariaLabel="F1-Tree documentation example"
            height={260}
            showCheckbox={false}
          />
        </Box>
        <Button size="small" onClick={() => setRows(baseRows)}>
          Reset sample
        </Button>
      </Box>
    );
  }

  return (
    <Box className="f1-doc-playground" data-testid="f1-grid-doc-playground">
      <Box className="f1-doc-playground-controls">
        <Typography variant="subtitle1">Try it</Typography>
        {kind === 'row-height' && (
          <>
            <Typography variant="body2">{rowHeight}px</Typography>
            <Button
              aria-label="Increase row height"
              onClick={() => setRowHeight((value) => Math.min(120, value + 8))}
            >
              Increase row height
            </Button>
            <Button
              aria-label="Decrease row height"
              onClick={() => setRowHeight((value) => Math.max(32, value - 8))}
            >
              Decrease row height
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={wrapText}
                  onChange={(event) => setWrapText(event.target.checked)}
                />
              }
              label="Wrap text"
            />
          </>
        )}
        {kind === 'layout' && (
          <FormControlLabel
            control={
              <Switch
                checked={showCheckbox}
                onChange={(event) => setShowCheckbox(event.target.checked)}
              />
            }
            label="Show category"
          />
        )}
        {kind === 'selection' && (
          <Typography variant="body2">변경된 행: {changes}</Typography>
        )}
        {kind === 'editing' && (
          <>
            <Typography variant="body2">
              상태 셀은 renderCell / getCellStyle / getCellProps로
              커스터마이징된 예시입니다.
            </Typography>
            <Typography variant="body2">
              셀을 선택해 값을 편집하세요.
            </Typography>
          </>
        )}
        {kind === 'row-merge' && (
          <Typography variant="body2">
            품목명 컬럼은 같은 값이 병합됩니다.
          </Typography>
        )}
      </Box>
      <Box className="f1-doc-grid-wrap">
        <F1Grid
          ref={gridRef}
          rows={displayRows}
          columns={displayColumns}
          rowKey="id"
          storageKey={`f1-grid-docs-${kind}`}
          ariaLabel="F1-Grid documentation example"
          rowHeight={rowHeight}
          minRowHeight={32}
          maxRowHeight={120}
          resizableRows={kind === 'row-height'}
          resizableColumns={kind === 'layout'}
          showCheckbox={showCheckbox}
          editorPlugins={kind === 'editing' ? [editingPlugin] : []}
          onChangesChange={updateChanges}
          onSelectionChange={updateChanges}
        />
      </Box>
      <Button size="small" onClick={() => setRows(baseRows)}>
        Reset sample
      </Button>
    </Box>
  );
}

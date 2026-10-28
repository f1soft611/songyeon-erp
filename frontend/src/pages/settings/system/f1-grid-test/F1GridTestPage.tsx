import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRef, useState } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../shared/components/f1-grid';
import { DateEditor } from '../../../../shared/components/f1-grid/editing/DateEditor';
import { normalizeDateInput } from '../../../../shared/components/f1-grid/editing/DateEditor';
import { PageHeader } from '../../../../shared/components/PageHeader';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';

export type ItemRow = {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  status: string;
  qty: number;
  price: number;
  ratio: number;
  useYn: boolean;
  regDate: string;
  deliveryAt: string;
  workTime: string;
};

type F1GridTestPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

const initialRows: ItemRow[] = [
  {
    id: 'line-1',
    itemCode: 'ITEM-001',
    itemName: '원통형 스테인리스 배관 부품 (대형 고압용 규격 A)',
    category: 'RAW',
    status: 'progress',
    qty: 10,
    price: 25000,
    ratio: 12.5,
    useYn: true,
    regDate: '2026-08-25',
    deliveryAt: '2026-08-28T09:30',
    workTime: '09:30',
  },
  {
    id: 'line-2',
    itemCode: 'ITEM-001',
    itemName: '원통형 스테인리스 배관 부품 (대형 고압용 규격 A)',
    category: 'SUB',
    status: 'ready',
    qty: 5,
    price: 18000,
    ratio: 5.0,
    useYn: true,
    regDate: '2026-08-26',
    deliveryAt: '2026-08-29T14:00',
    workTime: '14:00',
  },
  {
    id: 'line-3',
    itemCode: 'ITEM-002',
    itemName: '고내열 실리콘 패킹 가스켓 50A',
    category: 'FINISHED',
    status: 'done',
    qty: 100,
    price: 3200,
    ratio: 0.0,
    useYn: false,
    regDate: '2026-08-27',
    deliveryAt: '2026-08-30T17:30',
    workTime: '17:30',
  },
];

export function F1GridTestPage({
  selectedModule,
  currentMenuName,
  content,
}: F1GridTestPageProps) {
  const gridRef = useRef<F1GridRef<ItemRow>>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationSuccess, setValidationSuccess] = useState<boolean | null>(
    null,
  );
  const [sequence, setSequence] = useState(4);
  const [pickerOpen, setPickerOpen] = useState(false);
  const applyPickerPatchRef = useRef<
    ((changes: Partial<ItemRow>) => void) | undefined
  >(undefined);

  // 그리드 옵션 토글 상태
  const [columnLine, setColumnLine] = useState(true);
  const [resizableRows, setResizableRows] = useState(true);
  const [resizableColumns, setResizableColumns] = useState(true);
  const [dateShortcutInput, setDateShortcutInput] = useState('2026-08-28');
  const [dateTestValue, setDateTestValue] = useState('2026-08-28');

  // 변경 사항 통계
  const [changes, setChanges] = useState<F1GridChanges<ItemRow>>({
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  });

  function createSampleRow(): ItemRow {
    const id = `line-${sequence}`;
    setSequence((current) => current + 1);
    return {
      id,
      itemCode: '',
      itemName: '',
      category: 'RAW',
      status: 'ready',
      qty: 1,
      price: 0,
      ratio: 0,
      useYn: true,
      regDate: '2026-08-28',
      deliveryAt: '2026-08-28T10:00',
      workTime: '10:00',
    };
  }

  function createSampleDuplicate(row: ItemRow): ItemRow {
    const id = `line-${sequence}`;
    setSequence((current) => current + 1);
    return { ...row, id };
  }

  const columns: F1GridColumn<ItemRow>[] = [
    {
      field: 'useYn',
      headerName: '사용여부',
      type: 'checkbox',
      headerCheckbox: true,
      width: 120,
      align: 'center',
      headerAlign: 'center',
      editable: true,
    },
    {
      field: 'itemCode',
      headerName: '품목코드',
      type: 'code',
      width: 130,
      pinned: 'left',
      headerAlign: 'center',
      editable: true,
      required: true,
      onOpenCodePicker: (_row, applyPatch) => {
        applyPickerPatchRef.current = applyPatch;
        setPickerOpen(true);
      },
    },
    {
      field: 'itemName',
      headerName: '품목명 (Row Merge)',
      type: 'text',
      width: 220,
      flex: 2,
      headerAlign: 'center',
      editable: true,
      required: true,
      wrapText: true,
      mergeRows: true,
    },
    {
      field: 'category',
      headerName: '품목분류 (Row Merge)',
      type: 'select',
      width: 100,
      flex: 1,
      headerAlign: 'center',
      editable: true,
      mergeRows: true,
      options: [
        { value: 'RAW', label: '원자재' },
        { value: 'SUB', label: '부자재' },
        { value: 'FINISHED', label: '완제품' },
      ],
    },
    // {
    //   field: 'status',
    //   headerName: '진행상태',
    //   type: 'autocomplete',
    //   width: 120,
    //   editable: true,
    //   options: [
    //     { value: 'ready', label: '대기' },
    //     { value: 'progress', label: '진행중' },
    //     { value: 'done', label: '완료' },
    //     { value: 'hold', label: '보류' },
    //   ],
    // },
    {
      field: 'qty',
      headerName: '수량',
      type: 'number',
      width: 100,
      align: 'right',
      headerAlign: 'center',
      editable: true,
      min: 1,
      required: true,
    },
    {
      field: 'price',
      headerName: '단가(원)',
      type: 'currency',
      width: 130,
      align: 'right',
      headerAlign: 'center',
      editable: true,
      min: 0,
    },
    {
      field: 'ratio',
      headerName: '할인율(%)',
      type: 'decimal',
      width: 110,
      align: 'right',
      headerAlign: 'center',
      editable: true,
      min: 0,
      max: 100,
    },
    {
      field: 'regDate',
      headerName: '등록일자',
      type: 'date',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      editable: true,
    },
    // {
    //   field: 'deliveryAt',
    //   headerName: '납기일시',
    //   type: 'datetime',
    //   width: 170,
    //   align: 'center',
    //   headerAlign: 'center',
    //   editable: true,
    // },
    {
      field: 'workTime',
      headerName: '작업시각',
      type: 'time',
      width: 110,
      align: 'center',
      headerAlign: 'center',
      editable: true,
    },
  ];

  function handleValidate() {
    const isValid = gridRef.current?.validate() ?? false;
    setValidationSuccess(isValid);
    setValidationMessage(
      isValid
        ? '모든 데이터 검증을 통과하였습니다.'
        : '필수 입력 항목 누락 또는 유효하지 않은 값이 있습니다.',
    );
  }

  return (
    <Box
      sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
      />

      <Paper
        variant="outlined"
        aria-label="날짜 입력 테스트"
        sx={{ p: 2, bgcolor: 'background.default' }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: { md: 150 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              날짜 입력 테스트
            </Typography>
            <Typography variant="caption" color="text.secondary">
              숫자 축약 입력 결과
            </Typography>
          </Box>
          <Box sx={{ width: { xs: '100%', md: 220 } }}>
            <TextField
              label="축약 입력"
              size="small"
              fullWidth
              value={dateShortcutInput}
              onChange={(event) => {
                const inputValue = event.target.value;
                setDateShortcutInput(inputValue);
                setDateTestValue(normalizeDateInput(inputValue));
              }}
              placeholder="01 / 0701 / 250604"
            />
          </Box>
          <Box sx={{ width: { xs: '100%', md: 220 } }}>
            <DateEditor
              value={dateTestValue}
              onChange={setDateTestValue}
              onKeyDown={() => undefined}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">
              현재 결과: <strong>{dateTestValue || '입력 대기'}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              01 / 0701 / 250604 / 20260801
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setDateShortcutInput('2026-08-28');
              setDateTestValue('2026-08-28');
            }}
          >
            날짜 초기화
          </Button>
        </Box>
      </Paper>

      {/* 제어판: 옵션 토글 & 실시간 상태 통계 */}
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          {/* 옵션 스위치 */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              그리드 옵션:
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={columnLine}
                  onChange={(e) => setColumnLine(e.target.checked)}
                />
              }
              label="컬럼 구분선"
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={resizableRows}
                  onChange={(e) => setResizableRows(e.target.checked)}
                />
              }
              label="행 높이 조절"
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={resizableColumns}
                  onChange={(e) => setResizableColumns(e.target.checked)}
                />
              }
              label="컬럼 너비 리사이즈"
            />
          </Box>

          {/* 변경 통계 */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              변경 통계:
            </Typography>
            <Chip
              size="small"
              label={`추가: ${changes.insertedRows.length}건`}
              color="success"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`수정: ${changes.updatedRows.length}건`}
              color="primary"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`삭제: ${changes.deletedRows.length}건`}
              color="error"
              variant="outlined"
            />
          </Box>
        </Box>
      </Paper>

      {/* 툴바: 그리드 액션 버튼 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 1,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => gridRef.current?.addRow()}
        >
          행 추가
        </Button>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={() => gridRef.current?.duplicateSelectedRows()}
        >
          행 복제
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => gridRef.current?.deleteSelectedRows()}
        >
          행 삭제
        </Button>
        <Button
          variant="outlined"
          startIcon={<RestoreIcon />}
          onClick={() => gridRef.current?.restoreDeletedRows()}
        >
          삭제 복구
        </Button>
        <Button
          variant="text"
          startIcon={<ClearAllIcon />}
          onClick={() => gridRef.current?.clearSelection()}
        >
          선택 해제
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          color="secondary"
          startIcon={<CheckCircleIcon />}
          onClick={handleValidate}
        >
          검증 실행
        </Button>
      </Box>

      {/* 메인 F1-GRID */}
      <F1Grid
        ref={gridRef}
        rows={initialRows}
        columns={columns}
        rowKey="id"
        storageKey="settings-system-f1-grid-test"
        ariaLabel="F1-GRID 기능 테스트"
        columnLine={columnLine}
        rowHeight={32}
        minRowHeight={32}
        maxRowHeight={300}
        height="100%"
        maxHeight="100%"
        resizableRows={resizableRows}
        resizableColumns={resizableColumns}
        editorPlugins={[
          {
            id: 'role-user-grid-editor',
            enabled: true,
            canEdit: () => true,
          },
        ]}
        minColumnWidth={50}
        createRow={createSampleRow}
        createDuplicate={createSampleDuplicate}
        onChangesChange={setChanges}
      />

      {/* 검증 결과 알림 */}
      {validationMessage && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: validationSuccess ? 'success.light' : 'error.light',
            color: validationSuccess
              ? 'success.contrastText'
              : 'error.contrastText',
          }}
          role="status"
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {validationMessage}
          </Typography>
        </Paper>
      )}

      {/* 코드 픽커 다이얼로그 */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <DialogTitle>품목 코드 선택</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            팝업에서 선택한 품목 정보가 해당 행의 여러 컬럼에 일괄 반영됩니다.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                applyPickerPatchRef.current?.({
                  itemCode: 'ITEM-002',
                  itemName: '고내열 실리콘 패킹 가스켓 50A',
                  category: 'FINISHED',
                  price: 3200,
                });
                setPickerOpen(false);
              }}
            >
              ITEM-002: 고내열 실리콘 패킹 가스켓 50A (완제품)
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                applyPickerPatchRef.current?.({
                  itemCode: 'ITEM-003',
                  itemName: 'SUS304 볼트 너트 세트 M16',
                  category: 'SUB',
                  price: 1500,
                });
                setPickerOpen(false);
              }}
            >
              ITEM-003: SUS304 볼트 너트 세트 M16 (부자재)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

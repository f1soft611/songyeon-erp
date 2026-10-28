import { useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Card, Chip, Typography } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { checkFeasibility, fetchFeasibilityProducts } from './services/feasibility.service';
import { FeasibilityPickDialog } from './components/FeasibilityPickDialog';
import {
  addLines,
  conditionText,
  emptyQtyLines,
  excelColumnsOf,
  footerOf,
  qtyText,
  toGridRows,
  verdictOf,
  type FeasibilityGridRow,
  type FeasibilityLine,
  type FeasibilityResult,
  type FeasibilityRow,
} from './utils/feasibility';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const rowButton = { minWidth: 0, px: 1, py: 0 };
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', p: 1.5 };

type FeasibilityPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 영업관리 > 생산가능확인 (송연 SA0006, 기존 34-prod-check.js)
// 만들 제품·수량을 적으면 그 날짜 원재료 재고로 다 만들 수 있는지 본다. 여기서는 아무것도 바꾸지 않는다.
// 합계 표는 모자란 원재료가 위에 오고, 제품이 둘 이상이면 제품마다 '상세보기'(그 제품만 만들 때)가 붙는다.
export function FeasibilityPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: FeasibilityPageProps) {
  const linesGridRef = useRef<F1GridRef<FeasibilityLine>>(null);
  // 고를 수 있는 제품(배합비가 있는 것). 검색 창을 처음 열 때 받는다(비어 있으면 열 때마다 다시)
  const [products, setProducts] = useState<string[]>([]);
  const [lines, setLines] = useState<FeasibilityLine[]>([]);
  // 줄을 담거나 뺄 때만 표를 새로 그린다(수량은 표 안에서 고치고, 확인할 때 표에서 읽는다)
  const [linesVersion, setLinesVersion] = useState(0);
  const [date, setDate] = useState(() => todayDash());
  const [data, setData] = useState<FeasibilityResult | null>(null);
  const [one, setOne] = useState<string | null>(null); // 상세보기로 고른 제품(없으면 합계)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  // 표 안에서 고친 수량을 함께 읽는다
  const currentLines = (): FeasibilityLine[] => linesGridRef.current?.getActiveRows() ?? lines;
  const replaceLines = (next: FeasibilityLine[]) => {
    setLines(next);
    setLinesVersion((v) => v + 1);
    setData(null); // 날짜나 제품이 바뀌었으면 앞의 결과는 그것에 대한 답이 아니다
    setOne(null);
  };

  const openPicker = async () => {
    setError('');
    if (products.length === 0) setProducts(await fetchFeasibilityProducts().catch(() => [])); // 못 받으면 빈 목록으로 연다
    setPickerOpen(true);
  };

  const run = async () => {
    setError('');
    const current = currentLines();
    if (!date) {
      setError('생산일자를 골라주세요');
      return;
    }
    if (current.length === 0) {
      setError('만들 제품을 담아주세요');
      return;
    }
    const empty = emptyQtyLines(current);
    if (empty.length > 0) {
      setError(`생산수량을 적어주세요. ${empty.map((line) => `· ${line.product}`).join(' ')}`);
      return;
    }
    // 확인은 서버가 계산한다. 거절되면 서버 문구를 띄우고 앞의 결과는 그대로 둔다.
    setChecking(true);
    try {
      setLines(current);
      setData(await checkFeasibility(date, current));
      setOne(null);
    } catch (requestError) {
      setError(errorText(requestError, '확인하지 못했어요'));
    } finally {
      setChecking(false);
    }
  };

  const exportExcel = async () => {
    if (!data || data.rows.length === 0) {
      setError('내려받을 내역이 없어요');
      return;
    }
    try {
      await downloadExcel<FeasibilityRow>(data.rows, excelColumnsOf(data), `생산가능확인_${data.date}.xlsx`, '생산가능확인');
    } catch (requestError) {
      setError(errorText(requestError, '엑셀을 만들지 못했어요'));
    }
  };

  const canDetail = Boolean(data) && lines.length > 1;
  const oneResult = one && data ? data.byProduct.find((item) => item.product === one) : undefined;
  const verdict = verdictOf(data);

  const lineColumns = useMemo<F1GridColumn<FeasibilityLine>[]>(() => [
    { field: 'id' as keyof FeasibilityLine, type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'product', headerName: '제품명', flex: 1, width: 240, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => {
        const p = canDetail ? data?.byProduct.find((item) => item.product === row.product) : undefined;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{row.product}</Typography>
            {p && (p.ok
              ? <Chip size="small" color="success" variant="outlined" label="이것만이면 넉넉" />
              : <Chip size="small" color="error" variant="outlined" label={`이것만 해도 ${p.shortageCount}가지 부족`} />)}
          </Box>
        );
      },
    },
    {
      field: 'qty', headerName: '생산수량 (kg)', width: 150, headerAlign: 'center', align: 'right', type: 'number', decimalPlaces: 3, editable: true,
      // 아직 안 적은 수량은 빈칸으로(F1-Grid 기본 숫자 표시는 빈 값을 0 으로 그린다)
      renderCell: ({ row }) => (row.qty === null || row.qty === undefined || row.qty === ''
        ? ''
        : Number(row.qty).toLocaleString('ko-KR', { maximumFractionDigits: 3 })),
    },
    {
      field: 'detail' as keyof FeasibilityLine, headerName: '', width: 170, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {canDetail && <Button size="small" variant="outlined" sx={rowButton} onClick={() => setOne(row.product)}>상세보기</Button>}
          <Button size="small" variant="outlined" color="error" sx={rowButton} aria-label={`${row.product} 빼기`}
            onClick={() => replaceLines(currentLines().filter((line) => line.product !== row.product))}>빼기</Button>
        </Box>
      ),
    },
    // 판정 표시는 확인 결과(data)가 바뀔 때 다시 그린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data, canDetail]);

  const shownRows = oneResult ? oneResult.rows : data?.rows ?? [];
  const perCount = !oneResult && data && data.lines.length > 1 ? data.lines.length : 0;
  const footer = footerOf(shownRows, perCount);
  const resultColumns = useMemo<F1GridColumn<FeasibilityGridRow>[]>(() => {
    if (!data) return [];
    const num = (field: keyof FeasibilityGridRow, headerName: string, extra: Partial<F1GridColumn<FeasibilityGridRow>> = {}): F1GridColumn<FeasibilityGridRow> => ({
      field, headerName, width: 110, headerAlign: 'center', align: 'right',
      getValue: (row) => row[field] as number,
      renderCell: ({ row }) => qtyText(row[field] as number),
      ...extra,
    });
    return [
      { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
      {
        field: 'name', headerName: '원재료명', flex: 1, width: 170, headerAlign: 'center', align: 'left',
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: row.shortage > 0 ? 700 : 400 }}>{row.name || ''}</Typography>
            {!row.known && <Chip size="small" color="warning" variant="outlined" label="원재료 목록에 없음" />}
          </Box>
        ),
      },
      { field: 'spec', headerName: '규격', width: 90, headerAlign: 'center', align: 'left', getValue: (row) => row.spec || '' },
      num('stockQty', `${data.date} 재고`),
      ...Array.from({ length: perCount }, (_, i) =>
        num(`per${i}` as keyof FeasibilityGridRow, `필요량${i + 1} ${data.lines[i].product}`, {
          width: 130,
          renderCell: ({ row }) => (row[`per${i}`] ? qtyText(row[`per${i}`]) : ''),
        })),
      num('needQty', perCount ? '필요량 합계' : '필요량', { getCellStyle: () => (perCount ? { fontWeight: 700 } : undefined) }),
      num('afterQty', '생산 후 재고', { getCellStyle: ({ row }) => ({ fontWeight: 700, color: row.shortage > 0 ? '#dc2626' : '#15803d' }) }),
      {
        // 칸이 많아 가로로 밀려도 판정은 늘 보이게 오른쪽에 고정
        field: 'shortage', headerName: '판정', width: 130, headerAlign: 'center', align: 'center', pinned: 'right',
        getValue: (row) => row.shortage,
        renderCell: ({ row }) => (row.shortage > 0
          ? <Chip size="small" color="error" label={`${qtyText(row.shortage)}kg 부족`} />
          : <Chip size="small" color="success" variant="outlined" label="넉넉" />),
      },
    ];
  }, [data, perCount]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportExcel(),
        },
        { label: '검색', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), onClick: () => void openPicker() },
        { label: '확인', icon: CalculateIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: checking, onClick: () => void run() },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" aria-live="polite" sx={{ px: 0.5, color: 'text.secondary' }}>{conditionText(data, lines.length)}</Typography>

        <Card sx={cardSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>만들 것</Typography>
          {lines.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>검색 을 눌러 만들 제품을 골라주세요</Typography>
          )}
          {/* 비어도 머리줄 있는 그리드를 둔다. 그때는 F1-Grid 빈 표시(max(행 높이×4, 120px))가 다 들어가는 높이를 준다 */}
          <Box sx={{ height: lines.length === 0 ? 36 + Math.max(34 * 4, 120) : Math.min(300, 44 + lines.length * 36) }}>
            <F1Grid
              key={linesVersion}
              ref={linesGridRef}
              rows={lines}
              columns={lineColumns}
              rowKey="product"
              storageKey="sa-feasibility-lines-grid"
              ariaLabel="F1-GRID 만들 것"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              showCheckbox={false}
              resizableRows={false}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Card>

        {verdict && <Alert severity={verdict.tone} variant="outlined" role="status" sx={{ borderRadius: 1, fontWeight: 700 }}>{verdict.text}</Alert>}

        {data && (
          <Card sx={cardSx}>
            {oneResult ? (
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => setOne(null)}>‹ 합계로</Button>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{oneResult.product} — {qtyText(oneResult.qty)}kg 만 만들 때</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  재고는 다른 제품이 쓸 몫을 빼지 않은 값이에요. 다 함께 돌릴 수 있는지는 <b>합계</b>에서 봐주세요.
                </Typography>
              </Box>
            ) : (
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                원재료{data.lines.length > 1 ? ` — 제품 ${data.lines.length}개를 다 만들 때` : ''}
              </Typography>
            )}
            {shownRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">셀 원재료가 없습니다</Typography>
            ) : (
              <>
                <Box sx={{ height: Math.min(520, 44 + shownRows.length * 36) }}>
                  <F1Grid
                    key={`${data.date}-${one ?? 'total'}-${perCount}`}
                    rows={toGridRows(shownRows)}
                    columns={resultColumns}
                    rowKey="id"
                    storageKey={`sa-feasibility-result-grid-${perCount}`}
                    ariaLabel="F1-GRID 원재료"
                    height="100%"
                    maxHeight="100%"
                    rowHeight={34}
                    showCheckbox={false}
                    resizableRows={false}
                    allowAddRowInContextMenu={false}
                    allowDuplicateRowInContextMenu={false}
                    allowDeleteRowInContextMenu={false}
                  />
                </Box>
                {/* 송연 표 맨 아래 합계줄: 필요량만 더한다(재고는 서로 다른 원재료라 더하지 않는다) */}
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
                  합계 (원재료 {footer.count}가지)
                  {footer.per.map((value, i) => <span key={i}> · 필요량{i + 1} <b>{qtyText(value)}</b></span>)}
                  {' · '}{perCount ? '필요량 합계' : '필요량'} <b>{qtyText(footer.need)}</b>
                  {' · '}
                  {footer.shortage > 0
                    ? <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>모두 {qtyText(footer.shortage)}kg 부족</Box>
                    : <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>모자란 것 없음</Box>}
                </Typography>
              </>
            )}
          </Card>
        )}
      </Box>
      {pickerOpen && (
        <FeasibilityPickDialog
          date={date}
          products={products}
          onPick={(day, picked) => {
            setDate(day);
            replaceLines(addLines(currentLines(), picked));
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Box>
  );
}

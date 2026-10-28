import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Chip, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../shared/components/f1-grid';
import { downloadExcel, todayDash } from '../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import type { BomEditRow, ClientOption, MaterialOption } from '../../co/master/item-master/types/itemMaster.types';
import type { BoxTypeRow } from '../../co/master/box-type/types/boxType.types';
import { fetchClientOptions, fetchMaterialOptions } from '../../co/master/item-master/services/itemMaster.service';
import { fetchBoxTypeRows } from '../../co/master/box-type/services/boxType.service';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { emptyBomEditRows, newBomRowId } from '../product/components/BomEditGrid';
import { formatPrice } from '../../../shared/utils/numberFormat';
import { createQuote, deleteQuote, fetchQuote, fetchQuotes, updateQuote } from './services/quote.service';
import { QuoteFormDialog, type QuoteFormMode } from './components/QuoteFormDialog';
import { startQuoteHandoff, useQuoteConfirmed } from './quoteHandoff';
import {
  bomRowsFromQuote,
  buildQuoteSheetHtml,
  EMPTY_QUOTE_FORM,
  filterQuotes,
  QUOTE_EXCEL_COLUMNS,
  quoteFormFrom,
  quoteStatusLabel,
  type QuoteForm,
  type QuoteRow,
  type toQuoteSaveBody,
} from './utils/quote';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
const rowButton = { minWidth: 0, px: 1, py: 0 };

type QuotePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

type FormState = { mode: QuoteFormMode; form: QuoteForm; rows: BomEditRow[]; clientName?: string; storageNm?: string };

// 영업관리 > 견적 (송연 SA0003, 업체 양식은 파이썬 05-quote.js)
// 가견적을 작성·수정하고, 체크한 가견적을 견적서로 출력한다.
// '확정' 을 누르면 그 가견적 내용을 제품등록 화면으로 넘기고, 거기서 [등록] 해야 실제로 확정된다.
export function QuotePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: QuotePageProps) {
  const navigate = useNavigate();
  const gridRef = useRef<F1GridRef<QuoteRow>>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<BoxTypeRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]); // 거래처 고르기(코드 · 이름, 2026-10-23)
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<QuoteRow | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // 송연 loadQuotes: 화면을 열 때, 저장·삭제 뒤, 제품등록에서 확정을 마친 뒤 다시 받는다
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setQuotes(await fetchQuotes());
    } catch (requestError) {
      setError(errorText(requestError, '견적 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);
  const confirmedCount = useQuoteConfirmed();
  useEffect(() => {
    void reload();
  }, [reload, confirmedCount]);
  useEffect(() => {
    fetchBoxTypeRows().then(setPackagingTypes).catch(() => undefined);
    fetchClientOptions().then(setClients).catch(() => undefined);
    fetchMaterialOptions().then(setMaterials).catch(() => undefined);
  }, []);

  const visible = useMemo(() => filterQuotes(quotes, search), [quotes, search]);
  const selected = useMemo(() => visible.filter((row) => selectedIds.includes(row.quoteId)), [visible, selectedIds]);

  // 송연 openQuoteForm: 수정·상세보기는 상세를 받아 채운 뒤 연다(못 받으면 열지 않는다)
  const open = async (mode: QuoteFormMode) => {
    setError('');
    if (mode.kind === 'new') {
      setFormState({ mode, form: EMPTY_QUOTE_FORM, rows: emptyBomEditRows() });
      return;
    }
    try {
      const detail = await fetchQuote(mode.quoteId);
      setFormState({
        mode,
        form: quoteFormFrom(detail),
        rows: bomRowsFromQuote(detail.bom, materials, newBomRowId),
        clientName: detail.clientName ?? '',
        storageNm: detail.storageNm ?? '',
      });
    } catch (requestError) {
      setError(errorText(requestError, '견적 정보를 불러오지 못했어요'));
    }
  };

  // 송연 quote-save-btn 뒤: 목록을 다시 받고 창을 닫는다(실패하면 창에 서버 문구)
  const save = async (body: ReturnType<typeof toQuoteSaveBody>) => {
    if (!formState) return;
    if (formState.mode.kind === 'edit') await updateQuote(formState.mode.quoteId, body);
    else await createQuote(body);
    setFormState(null);
    setNotice('저장되었습니다');
    await reload();
  };

  // 송연 confirmQuote: 상세를 받아 제품등록 화면으로 넘기고 그 화면을 연다(등록을 눌러야 확정된다)
  const confirmQuote = async (row: QuoteRow) => {
    try {
      const detail = await fetchQuote(row.quoteId);
      const form = quoteFormFrom(detail);
      startQuoteHandoff({
        quoteId: row.quoteId,
        productName: form.productName,
        spec: form.spec,
        productType: form.productType,
        storage: form.storage,
        clientCode: form.clientCode,
        clientName: detail.clientName ?? '',
        bom: detail.bom ?? [],
        costs: {
          markupRate: detail.markupRate ?? null, lossRate: detail.lossRate ?? null,
          laborCost: detail.laborCost ?? null, packagingCost: detail.packagingCost ?? null,
          logisticsCost: detail.logisticsCost ?? null, margin: detail.margin ?? null,
          otherCost1: detail.otherCost1 ?? null, otherCost1Note: detail.otherCost1Note ?? null,
          otherCost2: detail.otherCost2 ?? null, otherCost2Note: detail.otherCost2Note ?? null,
          otherCost3: detail.otherCost3 ?? null, otherCost3Note: detail.otherCost3Note ?? null,
          otherCost4: detail.otherCost4 ?? null, otherCost4Note: detail.otherCost4Note ?? null,
          currentPrice: detail.currentPrice ?? null,
        },
      });
      navigate('/sa/product');
    } catch (requestError) {
      setError(errorText(requestError, '견적 정보를 불러오지 못했어요'));
    }
  };

  const remove = async () => {
    const row = deleting;
    setDeleting(null);
    if (!row) return;
    try {
      await deleteQuote(row.quoteId);
      setSelectedIds((current) => current.filter((id) => id !== row.quoteId));
      await reload();
    } catch (requestError) {
      setError(errorText(requestError, '삭제에 실패했어요'));
    }
  };

  // 송연 quote-excel-btn: 목록 전체
  const exportExcel = async () => {
    try {
      await downloadExcel(quotes, QUOTE_EXCEL_COLUMNS, `견적_${todayDash()}.xlsx`, '견적');
    } catch (requestError) {
      setError(errorText(requestError, '엑셀을 만들지 못했어요'));
    }
  };

  // 송연 quote-print-btn: 체크한 가견적으로 A4 견적서를 새 창에 띄운다(그 창에서 인쇄)
  const printQuotes = () => {
    if (selected.length === 0) return;
    const win = window.open('', '_blank');
    if (!win) {
      setError('새 창을 열 수 없어요. 브라우저의 팝업 차단을 풀어주세요.');
      return;
    }
    win.document.write(buildQuoteSheetHtml(selected, new Date(), `${window.location.origin}/company_seal.png`));
    win.document.close();
  };

  const columns = useMemo<F1GridColumn<QuoteRow>[]>(() => [
    { field: 'quoteId', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'productName', headerName: '제품명', flex: 1.4, width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <Typography variant="body2" noWrap>{row.productName || ''}</Typography>
          {row.sourceKind && <Chip size="small" color="success" variant="outlined" label={`레시피·${row.sourceKind}`} title={row.sourceRecipe || ''} />}
        </Box>
      ),
    },
    { field: 'spec', headerName: '규격/단위', width: 120, headerAlign: 'center', align: 'left', getValue: (row) => row.spec || '' },
    { field: 'clientName', headerName: '거래처', flex: 1, width: 150, headerAlign: 'center', align: 'left', getValue: (row) => row.clientName || '' },
    {
      field: 'totalPrice', headerName: '견적단가', width: 120, headerAlign: 'center', align: 'right',
      getValue: (row) => row.totalPrice ?? '',
      renderCell: ({ row }) => <b>{formatPrice(row.totalPrice ?? null)}</b>,
    },
    {
      field: 'status', headerName: '상태', width: 150, headerAlign: 'center', align: 'center',
      getValue: (row) => quoteStatusLabel(row),
      renderCell: ({ row }) => (
        <Chip size="small" variant="outlined" color={row.status === 'confirmed' ? 'success' : 'warning'} label={quoteStatusLabel(row)} />
      ),
    },
    {
      field: 'note', headerName: '관리', width: 170, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (row.status === 'confirmed' ? (
        <Button size="small" variant="outlined" sx={rowButton}
          onClick={() => void open({ kind: 'view', quoteId: row.quoteId, productCode: row.confirmedProductCode || '' })}>
          상세보기
        </Button>
      ) : (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Button size="small" variant="outlined" sx={rowButton} onClick={() => void open({ kind: 'edit', quoteId: row.quoteId })}>수정</Button>
          <Button size="small" variant="contained" sx={rowButton} onClick={() => void confirmQuote(row)}>확정</Button>
          <Button size="small" variant="outlined" color="error" sx={rowButton} onClick={() => setDeleting(row)}>삭제</Button>
        </Box>
      )),
    },
    // 단추는 누를 때 그때의 원재료 목록으로 상세를 채운다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [materials]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '엑셀 다운로드', icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read), onClick: () => void exportExcel(),
        },
        {
          label: `선택 견적서 출력 (${selected.length})`, icon: PrintIcon,
          visible: Boolean(selectedMenuPermissions?.read), disabled: selected.length === 0, onClick: printQuotes,
        },
      ],
    },
    {
      key: 'write',
      actions: [
        { label: '새 가견적 작성', icon: AddIcon, visible: Boolean(selectedMenuPermissions?.create), onClick: () => void open({ kind: 'new' }) },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="제품명 · 거래처명 검색"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              // 송연과 같이 목록을 다시 그리면(검색) 체크가 풀린다
              setSelectedIds([]);
              gridRef.current?.clearSelection();
            }}
            slotProps={{ htmlInput: { 'aria-label': '가견적 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void reload()}
      >
        <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' }, alignSelf: 'center' }}>
          체크한 가견적을 견적서로 출력할 수 있어요
        </Typography>
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <PageMessageArea message={notice} severity="success" onClose={() => setNotice('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {!loading && visible.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>등록된 가견적이 없습니다</Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <F1Grid
              ref={gridRef}
              rows={visible}
              columns={columns}
              rowKey="quoteId"
              storageKey="sa-quote-grid"
              ariaLabel="F1-GRID 가견적 목록"
              height="100%"
              maxHeight="100%"
              rowHeight={34}
              minRowHeight={34}
              maxRowHeight={320}
              showCheckbox
              loading={loading}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
              onSelectionChange={(rowIds) => setSelectedIds(rowIds.map((id) => Number(id)))}
            />
          </Box>
        </Card>
      </Box>
      {formState && (
        <QuoteFormDialog
          key={JSON.stringify(formState.mode)}
          mode={formState.mode}
          initialForm={formState.form}
          initialRows={formState.rows}
          initialClientName={formState.clientName}
          initialStorageNm={formState.storageNm}
          packagingTypes={packagingTypes}
          clients={clients}
          materials={materials}
          onSave={save}
          onClose={() => setFormState(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="가견적 삭제"
        message="이 가견적을 삭제할까요?"
        confirmLabel="삭제"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </Box>
  );
}

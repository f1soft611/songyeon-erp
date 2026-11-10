import { useMemo } from 'react';
import { Box, Card, MenuItem, Popover, Tab, Tabs, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PaidIcon from '@mui/icons-material/Paid';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { LedgerVendorDialog } from './components/LedgerVendorDialog';
import { StockLedgerGrid, createStockLedgerColumns } from './components/StockLedgerGrid';
import { StockValueDialog } from './components/StockValueDialog';
import { useStockLedgerManagement } from './hooks/useStockLedgerManagement';
import type { LedgerFilter, LedgerKind } from './types/stockLedger.types';
import { emptyText, ledgerNum, whQtyText } from './utils/stockLedger';

type StockLedgerManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  ...searchFieldSx(theme),
  '& .MuiOutlinedInput-root': { ...searchFieldSx(theme)['& .MuiOutlinedInput-root'], borderRadius: '8px' },
});

// 구매관리 > 수불대장 (송연 #screen-purchase · 18-stock.js 600-1139)
// 탭 두 개(원재료수불대장 · 부자재수불대장)는 표 모양과 계산이 같고 어느 쪽을 보여줄지만 다르다 — 자료는 한 번만 받는다.
// 발주량 칸에 적고 [발주 등록] 을 누르면 업체별로 나눠 발주된다. 이미 발주한 칸은 잠긴다(지우려면 발주등록에서).
export function StockLedgerManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: StockLedgerManagementPageProps) {
  const management = useStockLedgerManagement();
  const { dates, kind, marked, setDraft, mark, onOrderKeyDown, openLens, lensRow, lensSum } = management;
  const columns = useMemo(
    () => createStockLedgerColumns({ dates, kind, marked, onDraftChange: setDraft, onDraftBlur: mark, onOrderKeyDown, onOpenLens: openLens }),
    [dates, kind, marked, setDraft, mark, onOrderKeyDown, openLens],
  );

  const canRead = Boolean(selectedMenuPermissions?.read);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: canRead,
          disabled: management.loading,
          onClick: management.search,
        },
        {
          label: '재고 내려받기',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || canRead),
          onClick: () => void management.exportStock(),
        },
        {
          label: '재고금액 조회',
          icon: PaidIcon,
          visible: canRead,
          onClick: () => management.setValueOpen(true),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '발주 등록',
          icon: NoteAddIcon,
          visible: Boolean(selectedMenuPermissions?.create),
          onClick: management.startOrder,
        },
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
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={kind} onChange={(_event, value: LedgerKind) => management.switchKind(value)} aria-label="수불대장 탭">
          <Tab value="material" label="원재료수불대장" />
          <Tab value="submaterial" label="부자재수불대장" />
        </Tabs>
      </Box>
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder={kind === 'submaterial' ? '부자재명 · 코드 검색' : '원재료명 · 코드 검색'}
            value={management.query}
            onChange={(event) => management.setQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={management.search}
      >
        <TextField
          select
          size="small"
          margin="none"
          value={management.mode}
          onChange={(event) => management.setMode(event.target.value as LedgerFilter)}
          slotProps={{ htmlInput: { 'aria-label': '보기' } }}
          sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...sideFieldSx(theme) })}
        >
          <MenuItem value="used">생산스케줄 사용 원재료</MenuItem>
          <MenuItem value="nonzero">남은재고량 0 제외</MenuItem>
          <MenuItem value="all">전체</MenuItem>
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={management.start}
            onChange={(event) => management.setStart(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '시작일' } }}
            sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
          <Typography variant="body2" color="text.secondary">~</Typography>
          <TextField
            type="date"
            size="small"
            margin="none"
            value={management.end}
            onChange={(event) => management.setEnd(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '종료일' } }}
            sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
          />
        </Box>
        <TextField
          type="date"
          size="small"
          margin="none"
          value={management.exportDate}
          onChange={(event) => management.setExportDate(event.target.value)}
          title="재고 내려받기 기준일 (비워두면 오늘)"
          slotProps={{ htmlInput: { 'aria-label': '재고 기준일' } }}
          sx={(theme) => ({ width: 170, ...sideFieldSx(theme) })}
        />
      </PageSearchArea>
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              발주량 칸에 수량을 적고 <b>발주 등록</b>을 누르면 업체별로 나눠 발주됩니다. 안전재고보다 적은 원재료는 기초발주량이 미리 채워집니다.
              <b> 이미 발주한 칸은 잠깁니다 — 지우려면 발주등록 화면에서 지워주세요.</b>
              <br />
              사용량은 쓴 양 그대로 적습니다(마이너스 없음). 남은재고 = 전일재고 − 사용량 + 입고량.
              그 날 재고조사를 했으면 남은재고가 <b>조사한 값</b>이 되고 &lsquo;조사&rsquo; 가 붙습니다.
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }} aria-label="적어둔 발주">
              {management.draftCount ? `${management.draftCount}건 적었어요` : ''}
            </Typography>
          </Box>
          {management.loaded && !management.loading && management.gridRows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{emptyText(kind, management.mode)}</Typography>
          )}
          <StockLedgerGrid rows={management.gridRows} columns={columns} loading={management.loading} dates={dates} />
        </Card>
      </Box>
      <Popover
        open={management.lens != null}
        anchorEl={management.lens?.anchor}
        onClose={() => management.setLens(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {lensRow && (
          <Box sx={{ p: 1.5, minWidth: 200, fontSize: 12 }} aria-label="창고별 재고">
            <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.75 }}>{lensRow.name}</Typography>
            {(lensRow.warehouseStock ?? []).map((w) => (
              <Box key={w.name} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.25 }}>
                <span>{w.name}</span>
                <Box component="span" sx={{ fontWeight: 700, color: Number(w.qty) ? 'text.primary' : 'text.secondary' }}>{whQtyText(w.qty)} {lensRow.unitNm || 'kg'}</Box>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, pt: 0.75, mt: 0.75, borderTop: 1, borderColor: 'divider' }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>합계</Box>
              <Box component="span" sx={{ fontWeight: 700 }}>{ledgerNum(lensSum)} {lensRow.unitNm || 'kg'}</Box>
            </Box>
          </Box>
        )}
      </Popover>
      <LedgerVendorDialog
        items={management.ordering}
        vendors={management.vendors}
        onClose={() => management.setOrdering(null)}
        onSubmit={(items) => void management.submitOrders(items)}
      />
      <StockValueDialog open={management.valueOpen} onClose={() => management.setValueOpen(false)} />
      <ConfirmDialog
        open={management.alertText != null}
        title="수불대장"
        message={management.alertText ?? ''}
        alertOnly
        onCancel={() => management.setAlertText(null)}
        onConfirm={() => management.setAlertText(null)}
      />
    </Box>
  );
}

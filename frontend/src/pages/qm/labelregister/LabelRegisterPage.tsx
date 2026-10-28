import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Card, Chip, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { getLabelTemplate, listLabelTemplates } from '../../../shared/components/LabelPrintDialog/label.service';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { LabelFormDialog, type LabelFormTarget } from './components/LabelFormDialog';
import { LabelFormatEditor, type FormatEditTarget } from './components/LabelFormatEditor';
import { LabelCompanyDialog, LabelFieldDialog, LabelMarkDialog, RequestMoveDialog } from './components/LabelSideDialogs';
import { deleteTemplate, fetchLabelProducts, fetchRequests, fetchTemplateUsage, moveRequest } from './services/labelRegister.service';
import {
  FILL_STATE_TEXT, LABEL_STATE_TEXT, dateTime16, filterProducts, requestStatusText,
  type LabelProductRow, type LabelRequestRow, type LabelState, type LabelTemplateRow, type ProductFilter,
} from './utils/labelRegister';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type LabelRegisterPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type TabKey = 'register' | 'request' | 'format';
type TemplateRow = LabelTemplateRow & { colCount: number; rowCount: number };

const STATE_COLOR: Record<LabelState, 'success' | 'warning' | 'default'> = { done: 'success', partial: 'warning', none: 'default' };
const stateChip = (state: LabelState, text: string) => <Chip size="small" color={STATE_COLOR[state]} variant={state === 'none' ? 'outlined' : 'filled'} label={text} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />;
const smallBtn = { minWidth: 0, px: 1, py: 0, fontSize: 12, whiteSpace: 'nowrap' } as const;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 38, minRowHeight: 38, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

// 품질관리 > 라벨등록 (송연 #screen-label-register · 25-label-register.js · 26-label-format.js · 27-label-request.js · 07-label.js)
// 제품에 붙일 표시사항을 등록한다. 라벨은 한 제품에 한 장이며, 고쳐도 이전 내용이 버전으로 남는다.
// 라벨을 만드는 일과 그 틀(양식)을 만드는 일은 오가며 하게 되므로 한 화면의 탭으로 둔다.
export function LabelRegisterPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: LabelRegisterPageProps) {
  const ask = useAsk('라벨등록');
  const [tab, setTab] = useState<TabKey>('register');
  // 라벨등록 탭
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<ProductFilter>('all');
  const [products, setProducts] = useState<LabelProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [formTarget, setFormTarget] = useState<LabelFormTarget | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  // 표시사항 요청 탭
  const [reqStatus, setReqStatus] = useState('requested');
  const [requests, setRequests] = useState<LabelRequestRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [moveTarget, setMoveTarget] = useState<{ id: number; name: string } | null>(null);
  // 라벨양식 탭
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
  const [editorTarget, setEditorTarget] = useState<FormatEditTarget | null>(null);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);

  const loadProducts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      setProducts(await fetchLabelProducts(query.trim()));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);
  const loadRequests = useCallback(async (status: string) => {
    setRequests(await fetchRequests(status).catch(() => [] as LabelRequestRow[]));
  }, []);
  // 탭 이름 옆 숫자: 아직 안 끝난 요청. 요청이 와 있는데 탭을 안 열어보면 그대로 묻힌다
  const refreshBadge = useCallback(async () => {
    const rows = await fetchRequests('requested').catch(() => [] as LabelRequestRow[]);
    setPendingCount(rows.length);
  }, []);
  // 칸 · 줄 수를 보여주려면 내용을 읽어야 해서 하나씩 더 부른다(양식은 몇 개 안 된다)
  const loadTemplates = useCallback(async () => {
    const list = await listLabelTemplates().catch(() => []);
    const detail = await Promise.all(list.map((t) => getLabelTemplate(t.id).catch(() => null)));
    setTemplates(list.map((t, i) => ({
      id: t.id, name: t.name, size: t.size, createdAt: (t as { createdAt?: string | null }).createdAt,
      colCount: detail[i]?.layout?.cols?.length ?? 0, rowCount: detail[i]?.layout?.rows?.length ?? 0,
    })));
  }, []);

  useEffect(() => {
    void loadProducts('');
    void refreshBadge();
  }, [loadProducts, refreshBadge]);

  const switchTab = (next: TabKey) => {
    setTab(next);
    // 표시사항 요청 탭은 열 때마다 다시 불러온다(상품개발이 방금 넘긴 건이 안 보이면 요청이 묻힌다)
    if (next === 'request') void loadRequests(reqStatus);
    if (next === 'format' && templates == null) void loadTemplates();
  };

  const afterLabelSaved = () => {
    void loadProducts(q);
    if (tab === 'request') void loadRequests(reqStatus);
    void refreshBadge();
  };

  const doMove = async (product: LabelProductRow) => {
    if (!moveTarget) return;
    if (!(await ask.confirm(`여기 적어둔 표시사항을 "${product.name || ''}" 의 라벨로 옮길까요?\n옮기고 나면 이 요청은 잠기고, 이후 수정은 라벨등록에서 합니다.`))) return;
    try {
      const result = await moveRequest(moveTarget.id, product.code);
      setMoveTarget(null);
      await ask.alert(`${result.copiedFields}개 항목을 제품 ${result.productCode} 의 라벨로 옮겼습니다.`);
      await loadRequests(reqStatus);
      void refreshBadge();
      void loadProducts(q);
    } catch (e) {
      await ask.alert(errorText(e, '옮기지 못했어요'));
    }
  };

  const removeTemplate = async (t: TemplateRow) => {
    const use = await fetchTemplateUsage(t.id).catch(() => ({ count: 0, products: [] }));
    if (use.count) {
      await ask.alert(`이 양식을 쓰는 제품이 ${use.count}개 있어서 지울 수 없어요.\n먼저 그 제품들의 양식을 바꿔주세요.`);
      return;
    }
    if (!(await ask.confirm(`"${t.name}" 양식을 지울까요?\n되돌릴 수 없습니다.`, true))) return;
    try {
      await deleteTemplate(t.id);
    } catch {
      await ask.alert('지우지 못했어요');
      return;
    }
    void loadTemplates();
  };

  // ===== 표 =====
  const shownProducts = useMemo(() => filterProducts(products, filter), [products, filter]);
  const productColumns = useMemo<F1GridColumn<LabelProductRow>[]>(() => [
    { field: 'labelState', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'code', headerName: '제품코드', width: 100, headerAlign: 'center', align: 'center' },
    { field: 'name', headerName: '제품명', flex: 1.4, width: 240, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.name || '' },
    { field: 'spec', headerName: '규격단위', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'versionCount', headerName: '라벨', width: 90, headerAlign: 'center', align: 'center', renderCell: ({ row }) => stateChip(row.labelState, LABEL_STATE_TEXT[row.labelState]) },
    {
      field: 'currentVersion', headerName: '사용중 버전', width: 150, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <>{row.currentVersion || ''}{(row.versionCount || 0) > 1 && <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5, ml: 0.5 }}>(총 {row.versionCount}개)</Box>}</>
      ),
    },
    { field: 'lastEdited', headerName: '마지막 수정', width: 140, headerAlign: 'center', align: 'center', renderCell: ({ row }) => dateTime16(row.lastEdited) || '' },
    {
      field: 'action' as keyof LabelProductRow, headerName: '', width: 120, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="contained" sx={smallBtn} onClick={() => setFormTarget({ code: row.code, name: row.name || '' })}>🏷️ 라벨등록</Button>,
    },
  ], []);

  const requestColumns = useMemo<F1GridColumn<LabelRequestRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'clientName', headerName: '업체명', width: 140, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    {
      field: 'recipeName', headerName: '레시피명', flex: 1.2, width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => <>{row.recipeName || '(삭제된 레시피)'} <Box component="span" sx={{ color: 'text.secondary', fontSize: 11.5 }}>{row.versionLabel || ''}</Box></>,
    },
    { field: 'spec', headerName: '규격', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'requestedByName', headerName: '요청자', width: 90, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.requestedByName || '' },
    { field: 'requestedAt', headerName: '요청일', width: 140, headerAlign: 'center', align: 'center', renderCell: ({ row }) => dateTime16(row.requestedAt) || '' },
    { field: 'fillState', headerName: '표시사항', width: 90, headerAlign: 'center', align: 'center', renderCell: ({ row }) => stateChip(row.fillState, FILL_STATE_TEXT[row.fillState]) },
    { field: 'status', headerName: '상태', width: 170, headerAlign: 'center', align: 'left', renderCell: ({ row }) => requestStatusText(row) },
    {
      field: 'movedProductCode', headerName: '', width: 230, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="contained" sx={smallBtn} onClick={() => setFormTarget({ requestId: row.id, name: row.recipeName || '' })}>🏷️ 표시사항</Button>
          {!row.movedProductCode && <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setMoveTarget({ id: row.id, name: row.recipeName || '' })}>제품으로 옮기기</Button>}
        </Box>
      ),
    },
  ], []);

  const templateColumns: F1GridColumn<TemplateRow>[] = [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'name', headerName: '양식 이름', flex: 1, width: 220, headerAlign: 'center', align: 'left' },
    { field: 'size', headerName: '종이 크기', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => row.size || '' },
    { field: 'colCount', headerName: '칸', width: 70, headerAlign: 'center', align: 'right' },
    { field: 'rowCount', headerName: '줄', width: 70, headerAlign: 'center', align: 'right' },
    { field: 'createdAt', headerName: '만든 날짜', width: 140, headerAlign: 'center', align: 'center', renderCell: ({ row }) => dateTime16(row.createdAt) },
    {
      field: 'action' as keyof TemplateRow, headerName: '', width: 200, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setEditorTarget({ mode: 'edit', id: row.id })}>편집</Button>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setEditorTarget({ mode: 'copy', id: row.id })}>복사</Button>
          <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void removeTemplate(row)}>삭제</Button>
        </Box>
      ),
    },
  ];

  const canRead = Boolean(selectedMenuPermissions?.read);
  const canWrite = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const pageActionGroups: PermissionActionGroupDefinition[] = {
    register: [
      { key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: () => void loadProducts(q) }] },
      { key: 'write', actions: [{ label: '회사 고정정보 설정', icon: BusinessIcon, visible: canWrite, onClick: () => setCompanyOpen(true) }] },
    ],
    request: [{ key: 'read', actions: [{ label: '새로고침', icon: RefreshIcon, visible: canRead, onClick: () => { void loadRequests(reqStatus); void refreshBadge(); } }] }],
    format: [
      {
        key: 'write',
        actions: [
          { label: '새 양식', icon: AddIcon, visible: canWrite, onClick: () => setEditorTarget({ mode: 'new' }) },
          { label: '항목 등록', icon: AddIcon, visible: canWrite, onClick: () => setFieldOpen(true) },
          { label: '마크 등록', icon: AddIcon, visible: canWrite, onClick: () => setMarkOpen(true) },
        ],
      },
    ],
  }[tab];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: TabKey) => switchTab(value)} aria-label="라벨등록 탭">
          <Tab value="register" label="라벨등록" />
          <Tab value="request" label={<Badge color="warning" badgeContent={pendingCount} invisible={pendingCount === 0} sx={{ '& .MuiBadge-badge': { right: -12 } }}>표시사항 요청</Badge>} />
          <Tab value="format" label="라벨양식" />
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5, gap: 1 }}>
          {tab === 'register' && (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" margin="none" placeholder="제품명 또는 제품코드" value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void loadProducts(q); } }}
                  slotProps={{ htmlInput: { 'aria-label': '제품 찾기' } }} sx={{ width: 240 }} />
                <TextField select size="small" margin="none" value={filter} onChange={(e) => setFilter(e.target.value as ProductFilter)}
                  slotProps={{ htmlInput: { 'aria-label': '라벨 상태' } }} sx={{ width: 170 }}>
                  <MenuItem value="all">전체</MenuItem>
                  <MenuItem value="done">등록된 것만</MenuItem>
                  <MenuItem value="todo">아직 안된 것만</MenuItem>
                </TextField>
              </Box>
              {loaded && !loading && shownProducts.length === 0 && <Typography variant="body2" color="text.secondary">해당하는 제품이 없어요</Typography>}
              <Box sx={{ flex: 1, minHeight: 160 }}>
                <F1Grid key="register" rows={shownProducts} columns={productColumns} rowKey="code" storageKey="qm-label-register-grid" ariaLabel="F1-GRID 라벨등록 제품" loading={loading} {...gridProps} />
              </Box>
            </>
          )}
          {tab === 'request' && (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField select size="small" margin="none" value={reqStatus} onChange={(e) => { setReqStatus(e.target.value); void loadRequests(e.target.value); }}
                  slotProps={{ select: { displayEmpty: true }, htmlInput: { 'aria-label': '요청 상태' } }} sx={{ width: 170 }}>
                  <MenuItem value="requested">아직 안 끝난 것</MenuItem>
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="done">끝난 것</MenuItem>
                </TextField>
                <Typography variant="body2" color="text.secondary">확정 전이라 제품코드가 없는 건입니다. 여기서 미리 적어두고, 제품이 등록되면 옮기세요.</Typography>
              </Box>
              {requests.length === 0 && <Typography variant="body2" color="text.secondary">해당하는 요청이 없어요</Typography>}
              <Box sx={{ flex: 1, minHeight: 160 }}>
                <F1Grid key="request" rows={requests} columns={requestColumns} rowKey="id" storageKey="qm-label-request-grid" ariaLabel="F1-GRID 표시사항 요청" {...gridProps} />
              </Box>
            </>
          )}
          {tab === 'format' && (
            <>
              <Typography variant="body2" color="text.secondary">기본 양식을 복사해서 시작합니다. 모양이 많이 다르면 편집기 안에서 ‘초기화’ 를 누르면 빈 표가 됩니다.</Typography>
              {templates != null && templates.length === 0 && <Typography variant="body2" color="text.secondary">아직 만든 양식이 없어요. ‘새 양식’ 을 눌러보세요.</Typography>}
              <Box sx={{ flex: 1, minHeight: 160 }}>
                <F1Grid key="format" rows={templates ?? []} columns={templateColumns} rowKey="id" storageKey="qm-label-format-grid" ariaLabel="F1-GRID 라벨양식" loading={templates == null} {...gridProps} />
              </Box>
            </>
          )}
        </Card>
      </Box>
      <LabelFormDialog target={formTarget} onClose={() => setFormTarget(null)} onSaved={afterLabelSaved} />
      <LabelCompanyDialog open={companyOpen} onClose={() => setCompanyOpen(false)} />
      <RequestMoveDialog target={moveTarget} onClose={() => setMoveTarget(null)} onPick={(p) => void doMove(p)} />
      <LabelFormatEditor target={editorTarget} onClose={() => setEditorTarget(null)} onSaved={() => void loadTemplates()} />
      <LabelFieldDialog open={fieldOpen} onClose={() => setFieldOpen(false)} onChanged={() => undefined} />
      <LabelMarkDialog open={markOpen} onClose={() => setMarkOpen(false)} />
      {ask.node}
    </Box>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Chip, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { fetchMaterialOptions } from '../../co/master/item-master/services/itemMaster.service';
import type { MaterialOption } from '../../co/master/item-master/types/itemMaster.types';
import { RecipeDialog, type RecipeDialogTarget } from '../recipe/components/RecipeDialog';
import { fetchDrafts } from '../recipe/services/recipe.service';
import type { RecipeDraft } from '../recipe/utils/recipe';
import { RecipeHandoffDialog, RecipeShareDialog, type HandoffTarget, type ShareTarget } from './components/RecipeShareDialogs';
import { fetchShares, revokeShare } from './services/recipeShare.service';
import { HANDOFF_KINDS, handoffKindList, versionCountText, type RecipeShare } from './utils/recipeShare';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type RecipeSharePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type DraftRow = RecipeDraft & { key: string };
type ShareRow = RecipeShare & { key: string };
type Filter = { q: string; clientQ: string; category: string; saleType: string };

const EMPTY_FILTER: Filter = { q: '', clientQ: '', category: '', saleType: '' };
const smallBtn = { minWidth: 0, px: 1, py: 0.1, fontSize: 12, whiteSpace: 'nowrap' } as const;
const tag = (label: string, color: 'success' | 'warning' | 'default' = 'success') => (
  <Chip key={label} size="small" color={color} variant={color === 'default' ? 'outlined' : 'filled'} label={label} sx={{ height: 20, fontSize: 11 }} />
);
// 그리드 높이 = 줄 수 × 행 높이 + 머리·테두리(GRID_CHROME). 그보다 많으면 그리드 안에서 스크롤
const ROW_HEIGHT = 38;
const GRID_CHROME = 36;
const SEARCH_MAX_ROWS = 12;
const SHARE_MAX_ROWS = 8;
// 비었을 때 F1-Grid 는 '데이터가 없습니다' 칸을 max(행 높이×4, 120px) 로 그린다. 그 칸이 다 들어가게 한다
const gridHeight = (rows: number, maxRows: number) =>
  (rows === 0 ? Math.max(ROW_HEIGHT * 4, 120) : Math.min(maxRows, rows) * ROW_HEIGHT) + GRID_CHROME;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: ROW_HEIGHT, minRowHeight: 38, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

// 상품개발 > 레시피 검색·공유 (송연 #screen-recipe-share · 09-recipe.js 523~642 · 713~812)
// 레시피 작성에서 만든 레시피가 전부 여기서 찾아진다. 여기서는 보기·공유와 넘기기만 한다(고치는 것은 레시피 작성).
// 권한 구분이 없으므로 누구나 넘기고 공유를 등록·회수한다(송연은 넘기기는 작성 등급, 공유는 관리자만).
export function RecipeSharePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
}: RecipeSharePageProps) {
  const ask = useAsk('레시피 검색·공유');
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [drafts, setDrafts] = useState<RecipeDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [shares, setShares] = useState<RecipeShare[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [viewTarget, setViewTarget] = useState<RecipeDialogTarget | null>(null);
  const [handoffTarget, setHandoffTarget] = useState<HandoffTarget | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  const search = useCallback(async (f: Filter) => {
    setLoading(true);
    try {
      // 업체명은 글자가 들어가기만 하면 찾는다('태화' 로 '태화분식'). 딱 맞는 업체는 레시피 작성의 폴더 열기에서만 쓴다
      setDrafts(await fetchDrafts({ q: f.q.trim(), clientQ: f.clientQ.trim(), category: f.category.trim(), saleType: f.saleType.trim() }));
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShares = useCallback(async () => {
    try {
      setShares(await fetchShares());
    } catch {
      setShares([]);
    }
  }, []);

  useEffect(() => {
    void search(EMPTY_FILTER);
    void loadShares();
    fetchMaterialOptions().then(setMaterials).catch(() => setMaterials([]));
  }, [search, loadShares]);

  const onHandoffDone = async (message: string) => {
    setHandoffTarget(null);
    await ask.alert(message);
    void search(filter);
  };

  const doRevoke = async (s: RecipeShare) => {
    if (!(await ask.confirm('이 공유를 회수할까요? 즉시 조회가 안 되게 돼요.', true))) return;
    try {
      await revokeShare(s.id);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '회수하지 못했어요'));
    }
    void loadShares();
  };

  const draftRows = useMemo<DraftRow[]>(() => drafts.map((d) => ({ ...d, key: `d${d.id}` })), [drafts]);
  const shareRows = useMemo<ShareRow[]>(() => shares.map((s) => ({ ...s, key: `s${s.id}` })), [shares]);

  const draftColumns: F1GridColumn<DraftRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'clientName', headerName: '업체명', width: 130, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'name', headerName: '레시피명', flex: 1, width: 180, headerAlign: 'center', align: 'left', renderCell: ({ row }) => <Box component="span" sx={{ fontWeight: 700 }}>{row.name}</Box> },
    { field: 'spec', headerName: '규격', width: 90, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'category', headerName: '카테고리', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.category || '' },
    { field: 'saleType', headerName: '판매유형', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.saleType || '' },
    {
      field: 'versionCount', headerName: '버전', width: 70, headerAlign: 'center', align: 'right',
      renderCell: ({ row }) => <Box component="span" sx={{ color: row.versionCount ? 'text.primary' : 'text.disabled' }}>{versionCountText(row.versionCount)}</Box>,
    },
    {
      field: 'handoffKinds', headerName: '처리구분', width: 130, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => {
        const kinds = handoffKindList(row.handoffKinds);
        return kinds.length ? <Box sx={{ display: 'flex', gap: 0.5 }}>{kinds.map((k) => tag(k))}</Box> : <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>;
      },
    },
    {
      field: 'id', headerName: '', width: 240, headerAlign: 'center', align: 'center', pinned: 'right',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setViewTarget({ draftId: row.id, clientName: row.clientName || '', readOnly: true })}>보기</Button>
          <Button size="small" variant="contained" sx={smallBtn} onClick={() => setShareTarget({ draftId: row.id })}>공유</Button>
          {HANDOFF_KINDS.map((k) => (
            <Button key={k} size="small" variant="outlined" color="secondary" sx={smallBtn} aria-label={`${row.name} ${k}로 넘기기`}
              onClick={() => setHandoffTarget({ draftId: row.id, kind: k })}>{k}</Button>
          ))}
        </Box>
      ),
    },
  ];

  const shareColumns: F1GridColumn<ShareRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'draftName', headerName: '레시피명', flex: 1, width: 240, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box component="span">
          {row.draftName || '(삭제된 레시피)'}
          {row.versionLabel && <Box component="span" sx={{ ml: 0.75, fontSize: 11.5, color: 'text.secondary' }}>{row.versionLabel}</Box>}
        </Box>
      ),
    },
    { field: 'employeeName', headerName: '공유대상', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.employeeName || '' },
    { field: 'employeeDepartment', headerName: '부서', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.employeeDepartment || '' },
    { field: 'expiresAt', headerName: '만료일', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => row.expiresAt || '' },
    { field: 'expired', headerName: '상태', width: 90, headerAlign: 'center', align: 'center', renderCell: ({ row }) => tag(row.expired ? '만료됨' : '공유중', row.expired ? 'warning' : 'success') },
    {
      field: 'id', headerName: '', width: 80, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void doRevoke(row)}>회수</Button>,
    },
  ];

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'search',
      actions: [
        { label: '검색', icon: SearchIcon, visible: true, onClick: () => void search(filter) },
      ],
    },
  ];

  const input = (key: keyof Filter, placeholder: string, width: number) => (
    <TextField
      size="small" margin="none" placeholder={placeholder} value={filter[key]} sx={{ width }}
      onChange={(event) => setFilter((f) => ({ ...f, [key]: event.target.value }))}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search(filter); } }}
      slotProps={{ htmlInput: { 'aria-label': placeholder } }}
    />
  );
  const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', p: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 } as const;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.5, overflow: 'auto' }}>
        <Card sx={{ ...cardSx, flex: '0 0 auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: 12.5, lineHeight: 1.7 }}>
            레시피 작성에서 만든 레시피가 전부 여기서 찾아집니다. 여기서는 <b>보기·공유와 넘기기만</b> 합니다. 고치는 것은 레시피 작성에서 하세요.<br />
            <b>확정·견적</b>은 영업관리 &gt; 견적으로, <b>기타</b>는 품질관리 &gt; 라벨등록 &gt; 표시사항 요청으로 넘어갑니다.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {input('q', '레시피명', 160)}
            {input('clientQ', '업체명 (일부만 써도 됨)', 190)}
            {input('category', '카테고리', 140)}
            {input('saleType', '판매유형', 140)}
          </Box>
          {/* 송연처럼 결과 줄 수만큼만 차지하고(많으면 12줄 높이에서 그리드 안 스크롤) 아래 공유 관리가 바로 붙는다.
              비어도 머리줄 있는 그리드를 두고, 빈 표시가 다 들어가는 높이를 준다 */}
          <Box sx={{ height: gridHeight(draftRows.length, SEARCH_MAX_ROWS) }}>
            <F1Grid rows={draftRows} columns={draftColumns} rowKey="key" storageKey="rd-recipe-search-grid" ariaLabel="F1-GRID 레시피 검색" loading={loading} {...gridProps} />
          </Box>
        </Card>
        <Card sx={{ ...cardSx, flex: '0 0 auto' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>공유 관리 (사원에게 기간제한 공유)</Typography>
          {/* 송연과 같이 공유 관리 제목 아래 오른쪽 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setShareTarget({ draftId: null })}>새 공유 등록</Button>
          </Box>
          <Box sx={{ height: gridHeight(shareRows.length, SHARE_MAX_ROWS) }}>
            <F1Grid rows={shareRows} columns={shareColumns} rowKey="key" storageKey="rd-recipe-share-grid" ariaLabel="F1-GRID 공유 관리" {...gridProps} />
          </Box>
        </Card>
      </Box>
      <RecipeDialog target={viewTarget} materials={materials} onClose={() => setViewTarget(null)} onSaved={() => undefined} />
      <RecipeHandoffDialog target={handoffTarget} onClose={() => setHandoffTarget(null)} onDone={(message) => void onHandoffDone(message)} />
      <RecipeShareDialog target={shareTarget} onClose={() => setShareTarget(null)} onSaved={() => void loadShares()} />
      {ask.node}
    </Box>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Link, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { fetchMaterialOptions } from '../../co/master/item-master/services/itemMaster.service';
import type { MaterialOption } from '../../co/master/item-master/types/itemMaster.types';
import { RecipeDialog, type RecipeDialogTarget } from './components/RecipeDialog';
import { RecipeClientDialog, RecipeStageLogDialog, type RecipeClientTarget } from './components/RecipeSideDialogs';
import { deleteDraft, fetchDrafts, fetchRecipeClients } from './services/recipe.service';
import { filterClients, type RecipeClient, type RecipeDraft } from './utils/recipe';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type RecipeWritePageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type ClientRow = RecipeClient & { key: string };
type DraftRow = RecipeDraft & { key: string };

const smallBtn = { minWidth: 0, px: 1, py: 0.1, fontSize: 12, whiteSpace: 'nowrap' } as const;
const gridProps = {
  height: '100%', maxHeight: '100%', rowHeight: 38, minRowHeight: 38, maxRowHeight: 320, columnLine: true, showCheckbox: false,
  resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
} as const;

// 상품개발 > 레시피 작성 (송연 #screen-recipe-write · 09-recipe.js 4~521 · recipe.py)
// 업체 폴더 → 그 업체의 레시피 → 버전(초안 · test1 · test2 …). 상품개발관리에는 항상 전체 자료가 남는다.
// 권한 구분이 없으므로 누구나 폴더·레시피를 만들고 고치고 내려받는다(송연 upload 등급과 같음).
export function RecipeWritePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
}: RecipeWritePageProps) {
  const ask = useAsk('레시피 작성');
  const [clients, setClients] = useState<RecipeClient[]>([]);
  const [clientQ, setClientQ] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<RecipeDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [clientTarget, setClientTarget] = useState<RecipeClientTarget | null>(null);
  const [recipeTarget, setRecipeTarget] = useState<RecipeDialogTarget | null>(null);
  const [logTarget, setLogTarget] = useState<{ id: number; name: string } | null>(null);
  const [toast, setToast] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      setClients(await fetchRecipeClients());
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  const loadDrafts = useCallback(async (clientName: string) => {
    setLoading(true);
    try {
      setDrafts(await fetchDrafts({ clientName }));
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
    fetchMaterialOptions().then(setMaterials).catch(() => setMaterials([]));
  }, [loadClients]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openFolder = (clientName: string) => {
    setFolder(clientName);
    setDrafts([]);
    void loadDrafts(clientName);
  };
  const backToFolders = () => {
    setFolder(null);
    void loadClients();
  };

  const onClientSaved = (clientName: string, editing: boolean) => {
    setClientTarget(null);
    if (editing) {
      void loadClients();
      setToast('영업담당자 저장');
    } else {
      openFolder(clientName);
    }
  };

  const onRecipeSaved = () => {
    void loadClients();
    if (folder) void loadDrafts(folder);
  };

  const doDelete = async (d: RecipeDraft) => {
    if (!(await ask.confirm('이 레시피를 삭제할까요? 모든 버전과 공유 설정도 함께 삭제돼요.', true))) return;
    try {
      await deleteDraft(d.id);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '삭제하지 못했어요'));
    }
    if (folder) void loadDrafts(folder);
  };

  const clientRows = useMemo<ClientRow[]>(() => filterClients(clients, clientQ).map((c) => ({ ...c, key: c.clientName })), [clients, clientQ]);
  const draftRows = useMemo<DraftRow[]>(() => drafts.map((d) => ({ ...d, key: `d${d.id}` })), [drafts]);
  const folderInfo = clients.find((c) => c.clientName === folder);

  const clientColumns: F1GridColumn<ClientRow>[] = [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'clientName', headerName: '업체명', flex: 1, width: 260, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Link component="button" underline="hover" onClick={() => openFolder(row.clientName)} sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13 }}>
          📁 {row.clientName}
        </Link>
      ),
    },
    {
      field: 'salesEmpName', headerName: '영업담당자', width: 180, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.salesEmpName ? (
        <Box component="span">
          {row.salesEmpName}
          {row.salesEmpDepartment && <Box component="span" sx={{ ml: 0.75, fontSize: 11.5, color: 'text.secondary' }}>{row.salesEmpDepartment}</Box>}
        </Box>
      ) : <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>),
    },
    { field: 'recipeCount', headerName: '레시피 수', width: 100, headerAlign: 'center', align: 'right' },
    {
      field: 'salesEmpId', headerName: '', width: 130, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setClientTarget({ clientName: row.clientName, salesEmpId: row.salesEmpId ?? null })}>담당자</Button>
          <Button size="small" variant="contained" sx={smallBtn} onClick={() => openFolder(row.clientName)}>열기</Button>
        </Box>
      ),
    },
  ];

  const draftColumns: F1GridColumn<DraftRow>[] = [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'name', headerName: '레시피명', flex: 1, width: 240, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Link component="button" underline="hover" onClick={() => setRecipeTarget({ draftId: row.id, clientName: row.clientName || '' })} sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13, textAlign: 'left' }}>
          {row.name}
        </Link>
      ),
    },
    { field: 'spec', headerName: '규격', width: 120, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.spec || '' },
    { field: 'versionCount', headerName: '버전수', width: 80, headerAlign: 'center', align: 'right', renderCell: ({ row }) => row.versionCount || 0 },
    {
      field: 'stages', headerName: '분류', width: 200, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.stages ? (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {row.stages.split(',').map((s) => <Chip key={s} size="small" color="success" label={s} sx={{ height: 20, fontSize: 11 }} />)}
        </Box>
      ) : <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>),
    },
    { field: 'updatedAt', headerName: '최근수정', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => (row.updatedAt || '').slice(0, 10) },
    {
      field: 'latestVersionId', headerName: '공유로그', width: 110, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setLogTarget({ id: row.id, name: row.name || '' })}>📋 공유로그</Button>,
    },
    {
      field: 'id', headerName: '', width: 120, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" sx={smallBtn} onClick={() => setRecipeTarget({ draftId: row.id, clientName: row.clientName || '' })}>수정</Button>
          <Button size="small" variant="outlined" color="error" sx={smallBtn} onClick={() => void doDelete(row)}>삭제</Button>
        </Box>
      ),
    },
  ];

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        { label: '업체 폴더 추가', icon: CreateNewFolderIcon, visible: folder == null, onClick: () => setClientTarget({ clientName: null, salesEmpId: null }) },
        { label: '새 레시피 작성', icon: AddIcon, visible: folder != null, onClick: () => setRecipeTarget({ draftId: null, clientName: folder || '' }) },
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
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {folder == null ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <TextField
                  size="small" margin="none" placeholder="업체명 검색" value={clientQ} onChange={(event) => setClientQ(event.target.value)}
                  slotProps={{ htmlInput: { 'aria-label': '업체명 검색' } }} sx={{ width: 260 }}
                />
                <Box sx={{ flex: 1 }} />
                {toast && <Typography role="status" sx={{ fontSize: 12.5, fontWeight: 700, color: 'success.dark' }}>{toast}</Typography>}
              </Box>
              {loaded && !loading && clientRows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>업체 폴더가 없습니다. &quot;+ 업체 폴더 추가&quot;로 시작해보세요.</Typography>
              )}
              <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
                <F1Grid key="clients" rows={clientRows} columns={clientColumns} rowKey="key" storageKey="rd-recipe-client-grid" ariaLabel="F1-GRID 업체 폴더" loading={loading} {...gridProps} />
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                <Button size="small" variant="outlined" onClick={backToFolders}>← 업체 폴더</Button>
                <Typography sx={{ fontWeight: 700, fontSize: 15 }}>📁 {folder}</Typography>
                {folderInfo?.salesEmpName && (
                  <Typography variant="body2" color="text.secondary">영업담당자 {folderInfo.salesEmpName}{folderInfo.salesEmpDepartment ? ` (${folderInfo.salesEmpDepartment})` : ''}</Typography>
                )}
              </Box>
              {!loading && draftRows.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>이 조건에 해당하는 레시피가 없습니다</Typography>
              )}
              <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
                <F1Grid key="drafts" rows={draftRows} columns={draftColumns} rowKey="key" storageKey="rd-recipe-draft-grid" ariaLabel="F1-GRID 레시피 목록" loading={loading} {...gridProps} />
              </Box>
            </>
          )}
        </Card>
      </Box>
      <RecipeClientDialog target={clientTarget} onClose={() => setClientTarget(null)} onSaved={onClientSaved} />
      <RecipeDialog target={recipeTarget} materials={materials} onClose={() => setRecipeTarget(null)} onSaved={onRecipeSaved} />
      <RecipeStageLogDialog target={logTarget} onClose={() => setLogTarget(null)} />
      {ask.node}
    </Box>
  );
}

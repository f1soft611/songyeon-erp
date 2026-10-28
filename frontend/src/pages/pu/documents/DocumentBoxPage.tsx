import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, Chip, Link, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { DocDropZone, FolderDialog, ShareDialog, type ShareTarget } from './components/DocumentDialogs';
import {
  cancelShare, clearFolderLock, createFolder, deleteFile, deleteFolder, downloadFile, fetchDepartments, fetchFiles, fetchFolders, fetchMe,
  fetchSharesByMe, fetchSharesToMe, renameFolder, setFolderLock, unlockFolder, uploadFiles,
} from './services/documentBox.service';
import {
  childFolders, dateOnly, deptTag, docHint, docPath, emptyText, folderById, folderCounts, folderDialogHint, folderDialogTitle, isLockedMessage,
  isPeeking, ownerOptions, sizeText, uploadResultText,
  type DocFile, type DocFolder, type DocKind, type DocPlace, type DocShare, type DocUser,
} from './utils/documentBox';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type DocumentBoxPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 표 한 줄: 폴더 또는 파일. 폴더가 위, 파일이 아래(송연과 같음)
type BoxRow = { key: string; type: 'folder' | 'file'; name: string; by: string; date: string; size: string; folder?: DocFolder; file?: DocFile };
type ShareRow = DocShare & { key: string };
type ShareTab = 'mine' | 'sent';

const MONO = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11.5 };
const ROW_BTN = { minWidth: 0, px: 1, py: 0.1, fontSize: 12, whiteSpace: 'nowrap' } as const;
const smallChip = (label: string) => <Chip size="small" label={label} sx={{ height: 18, fontSize: 10.5, ml: 0.75 }} />;

// 구매관리 > 문서함 (송연 #screen-documents · 28-documents.js)
// 공용문서함(부서별) · 개인문서함(나만) · 공유문서함(사람을 골라 주고받은 것). 폴더 아래로 하위폴더를 얼마든지 만들어 문서를 올려둔다.
// 여기서 하는 것은 '보여줄지 말지' 뿐이고, 실제로 막는 것은 서버다. 화면에서만 감추면 주소를 직접 부르면 그만이다.
export function DocumentBoxPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: DocumentBoxPageProps) {
  const [me, setMe] = useState<DocUser | null>(null);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [place, setPlace] = useState<DocPlace>({ kind: '공용', currentId: null, ownerFilter: null, sharedRootId: null });
  const [files, setFiles] = useState<DocFile[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [filesKey, setFilesKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean | null } | null>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareTab, setShareTab] = useState<ShareTab>('mine');
  const [sharesToMe, setSharesToMe] = useState<DocShare[]>([]);
  const [sharesByMe, setSharesByMe] = useState<DocShare[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const ask = useAsk('문서함');

  const loadFolders = useCallback(async () => {
    try {
      setFolders(await fetchFolders());
    } catch {
      setFolders([]);
    }
  }, []);
  const loadShares = useCallback(async () => {
    const [mine, sent] = await Promise.all([fetchSharesToMe().catch(() => []), fetchSharesByMe().catch(() => [])]);
    setSharesToMe(mine);
    setSharesByMe(sent);
  }, []);
  const refresh = useCallback(async () => {
    await loadFolders();
    setFilesKey((v) => v + 1);
  }, [loadFolders]);

  useEffect(() => {
    fetchMe().then((user) => setMe(user)).catch(() => undefined);
    void loadFolders();
  }, [loadFolders]);

  const shareView = place.kind === '공유' && place.sharedRootId == null;
  useEffect(() => {
    if (shareView) void loadShares();
  }, [shareView, shareTab, loadShares]);

  // 폴더를 열면 그 안 파일을 받는다. 잠긴 폴더로 곧장 들어온 경우 등은 빈 목록이 아니라 왜 안 보이는지 알려준다
  useEffect(() => {
    if (place.currentId == null) {
      setFiles([]);
      setBlocked(null);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchFiles(place.currentId)
      .then((rows) => { if (alive) { setFiles(rows); setBlocked(null); } })
      .catch((requestError) => { if (alive) { setFiles([]); setBlocked(errorText(requestError, '이 폴더를 볼 수 없어요')); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [place.currentId, filesKey]);

  const atRoot = place.currentId == null;
  const peeking = isPeeking(place, me);
  const path = useMemo(() => docPath(folders, place), [folders, place]);
  const children = useMemo(() => (shareView ? [] : childFolders(folders, place)), [folders, place, shareView]);
  const canUpload = !shareView && !atRoot && !peeking && !blocked;
  const canNewFolder = !shareView && !peeking && !blocked;

  // ===== 옮겨 다니기 =====
  const switchKind = (kind: DocKind) => {
    // 탭을 바꾸면 최상위로 돌아간다. 열어둔 폴더가 다른 탭 것일 수 있다
    setPlace({ kind, currentId: null, ownerFilter: kind === '개인' ? me?.id ?? null : null, sharedRootId: null });
    setUploadMsg(null);
  };

  // 잠긴 폴더는 들어가기 전에 묻는다. 들어간 뒤에 빈 화면을 보여주면 폴더가 비었는지 잠긴 건지 알 수 없다
  const askUnlock = async (id: number, name: string): Promise<boolean> => {
    const pw = await ask.promptPassword(`'${name}' 폴더의 비밀번호를 넣어주세요`);
    if (pw == null || pw === '') return false;
    try {
      await unlockFolder(id, pw);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '열지 못했어요'));
      return false;
    }
    await loadFolders(); // 잠긴 동안 감춰뒀던 하위폴더를 다시 받아온다
    return true;
  };

  const openFolder = async (f: DocFolder) => {
    if (f.locked && !f.unlocked && !(await askUnlock(f.id, f.name))) return;
    setPlace((cur) => ({ ...cur, currentId: f.id }));
    setUploadMsg(null);
  };

  // 공유받은 폴더를 열어 들어간다. 공유는 잠금을 열어주지 않는다 — 보낸 사람이 비밀번호를 따로 알려줘야 한다
  const openSharedFolder = async (id: number, name: string) => {
    const f = folderById(folders, id);
    if (f && f.locked && !f.unlocked && !(await askUnlock(id, f.name || name))) return;
    setPlace((cur) => ({ ...cur, sharedRootId: id, currentId: id }));
  };

  const goCrumb = (id: number | null) => {
    if (id == null && place.sharedRootId != null) {
      // 공유받은 폴더에서 나가면 공유문서함으로 돌아간다('전체' 로 가면 볼 자격도 없는 남의 폴더 목록을 보러 가는 셈이 된다)
      setPlace((cur) => ({ ...cur, sharedRootId: null, currentId: null }));
      void loadShares();
      return;
    }
    setPlace((cur) => ({ ...cur, currentId: id }));
    setUploadMsg(null);
  };

  // ===== 폴더 =====
  const openFolderDialog = async () => {
    if (atRoot && place.kind === '공용') setDepartments(await fetchDepartments().catch(() => []));
    setFolderDialog(true);
  };

  const saveFolder = async (name: string, department: string): Promise<string | null> => {
    try {
      await createFolder({
        name, parentId: place.currentId,
        ...(place.currentId == null ? { kind: place.kind, ...(place.kind === '공용' ? { department } : {}) } : {}),
      });
    } catch (requestError) {
      return errorText(requestError, '폴더를 만들지 못했어요');
    }
    setFolderDialog(false);
    await refresh();
    return null;
  };

  const doRename = async (f: DocFolder) => {
    const name = await ask.prompt('새 폴더명을 입력해주세요', f.name);
    if (!name || name === f.name) return;
    try {
      await renameFolder(f.id, name);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '이름을 바꾸지 못했어요'));
    }
  };

  // 안이 비어있을 때만 지운다. 통째로 지우면 실수로 부서 전체를 날리게 된다
  const doDeleteFolder = async (f: DocFolder) => {
    if (!(await ask.confirm(`"${f.name}" 폴더를 지울까요?`, true))) return;
    try {
      await deleteFolder(f.id);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '폴더를 지우지 못했어요'));
    }
  };

  // '걸기' 와 '없애기' 는 단추를 갈라 둔다. 취소는 언제나 '아무 일도 안 함' 이어야 한다
  const doLock = async (f: DocFolder) => {
    let current = '';
    // 관리자는 지금 비밀번호를 몰라도 새로 정해줄 수 있다(잊어버린 폴더를 열어줘야 하는 사람이다)
    if (f.locked && !me?.admin) {
      const cur = await ask.promptPassword('지금 비밀번호를 넣어주세요');
      if (cur == null || cur === '') return;
      current = cur;
    }
    const pw = await ask.promptPassword(f.locked ? '새 비밀번호를 정해주세요 (4자 이상)' : `'${f.name}' 폴더에 걸 비밀번호를 정해주세요 (4자 이상)`);
    if (pw == null || pw === '') return;
    try {
      await setFolderLock(f.id, pw, current);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '걸지 못했어요'));
    }
  };

  const doClearLock = async (f: DocFolder) => {
    if (!(await ask.confirm(`'${f.name}' 폴더의 비밀번호를 없앨까요?\n이 폴더를 볼 수 있는 사람은 누구나 열게 됩니다.`))) return;
    let current = '';
    if (!me?.admin) {
      const cur = await ask.promptPassword('지금 비밀번호를 넣어주세요');
      if (cur == null || cur === '') return;
      current = cur;
    }
    try {
      await clearFolderLock(f.id, current);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '없애지 못했어요'));
    }
  };

  // ===== 파일 =====
  // 단추로 고르든 끌어다 놓든 여기로 모인다. 두 갈래로 두면 한쪽만 고쳐진다
  const doUpload = async (picked: File[]) => {
    if (picked.length === 0 || place.currentId == null) return;
    setUploadMsg({ text: '올리는 중...', ok: null });
    try {
      const result = await uploadFiles(place.currentId, picked);
      setUploadMsg({ text: uploadResultText(result.saved, result.errors), ok: true });
      if (result.errors && result.errors.length) await ask.alert(`올리지 못한 파일:\n${result.errors.join('\n')}`);
      await refresh();
    } catch (requestError) {
      setUploadMsg({ text: errorText(requestError, '올리지 못했어요'), ok: false });
    }
  };

  const doDownload = async (id: number, name: string) => {
    try {
      await downloadFile(id, name);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '내려받지 못했어요'));
    }
  };

  const doDeleteFile = async (f: DocFile) => {
    if (!(await ask.confirm(`"${f.origName}" 파일을 지울까요?`, true))) return;
    try {
      await deleteFile(f.id);
      await refresh();
    } catch {
      await ask.alert('파일을 지우지 못했어요');
    }
  };

  const doCancelShare = async (s: DocShare) => {
    if (!(await ask.confirm(`${s.toName || ''}님에게 보낸 공유를 취소할까요?`, true))) return;
    try {
      await cancelShare(s.id);
      await loadShares();
    } catch {
      await ask.alert('취소하지 못했어요');
    }
  };

  // ===== 표 =====
  const boxRows = useMemo<BoxRow[]>(() => [
    ...children.map((f) => ({ key: `f${f.id}`, type: 'folder' as const, name: f.name, by: f.createdBy || '', date: dateOnly(f.createdAt), size: '', folder: f })),
    ...files.map((f) => ({ key: `a${f.id}`, type: 'file' as const, name: f.origName, by: f.uploadedBy || '', date: dateOnly(f.createdAt), size: sizeText(f.sizeBytes), file: f })),
  ], [children, files]);

  const boxColumns: F1GridColumn<BoxRow>[] = [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'type', headerName: '', width: 44, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 16 }}>{row.folder ? (row.folder.locked && !row.folder.unlocked ? '🔒' : '📁') : '📄'}</Box>,
    },
    {
      field: 'name', headerName: '이름', flex: 1, width: 320, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => {
        if (row.folder) {
          const f = row.folder;
          const shut = Boolean(f.locked && !f.unlocked);
          const tag = deptTag(f);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <Link component="button" underline="hover" onClick={() => void openFolder(f)} sx={{ fontWeight: 700, color: 'text.primary', fontSize: 13 }}>{f.name}</Link>
              {tag && smallChip(tag)}
              {f.locked && smallChip(shut ? '잠김' : '열어둠')}
              <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75, whiteSpace: 'nowrap' }}>{folderCounts(f)}</Box>
            </Box>
          );
        }
        const file = row.file as DocFile;
        return <Link component="button" onClick={() => void doDownload(file.id, file.origName)} sx={{ fontSize: 13, textAlign: 'left' }}>{file.origName}</Link>;
      },
    },
    { field: 'by', headerName: '올린 사람', width: 110, headerAlign: 'center', align: 'left' },
    { field: 'date', headerName: '올린 날짜', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{row.date}</Box> },
    { field: 'size', headerName: '크기', width: 90, headerAlign: 'center', align: 'right' },
    {
      field: 'folder', headerName: '', width: 470, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => {
        if (peeking) return null;
        if (row.folder) {
          const f = row.folder;
          return (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => setShareTarget({ attachmentId: null, folderId: f.id, name: f.name })}>📤 공유</Button>
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => void doLock(f)}>{f.locked ? '🔒 비밀번호 바꾸기' : '🔓 비밀번호 걸기'}</Button>
              {f.locked && <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => void doClearLock(f)}>잠금해제</Button>}
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => void doRename(f)}>이름변경</Button>
              <Button size="small" variant="outlined" color="error" sx={ROW_BTN} onClick={() => void doDeleteFolder(f)}>삭제</Button>
            </Box>
          );
        }
        const file = row.file as DocFile;
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* 개인문서함 문서만 사람을 골라 보낸다. 공용함 문서는 그 부서 사람이 이미 본다 */}
            {place.kind === '개인' && (
              <Button size="small" variant="outlined" sx={ROW_BTN} onClick={() => setShareTarget({ attachmentId: file.id, folderId: null, name: file.origName })}>
                공유{file.shareCount ? ` (${file.shareCount})` : ''}
              </Button>
            )}
            <Button size="small" variant="outlined" color="error" sx={ROW_BTN} onClick={() => void doDeleteFile(file)}>삭제</Button>
          </Box>
        );
      },
    },
  ];

  const until = (s: DocShare) => s.expiresAt || <Box component="span" sx={{ color: 'text.disabled' }}>기한 없음</Box>;
  const noteCell = (s: DocShare) => s.note || <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>;

  const mineRows = useMemo<ShareRow[]>(() => sharesToMe.map((s) => ({ ...s, key: `m${s.id}` })), [sharesToMe]);
  const sentRows = useMemo<ShareRow[]>(() => sharesByMe.map((s) => ({ ...s, key: `s${s.id}` })), [sharesByMe]);

  // 폴더로 온 것은 내려받는 것이 아니라 '열어보는' 것이다. 그래서 줄 모양이 다르다
  const mineColumns: F1GridColumn<ShareRow>[] = [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'folder', headerName: '', width: 44, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={{ fontSize: 15 }}>{row.folder ? (row.locked && !row.unlocked ? '🔒' : '📁') : '📄'}</Box>,
    },
    {
      field: 'origName', headerName: '문서', flex: 1, width: 300, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (row.folder ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Link component="button" onClick={() => void openSharedFolder(row.folderId as number, row.origName || '')} sx={{ fontWeight: 700, fontSize: 13 }}>{row.origName}</Link>
          <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75 }}>폴더 통째로</Box>
          {row.locked && smallChip(row.locked && !row.unlocked ? '비밀번호 필요' : '열어둠')}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Link component="button" onClick={() => void doDownload(row.attachmentId as number, row.origName || 'download')} sx={{ fontSize: 13 }}>{row.origName}</Link>
          <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', ml: 0.75 }}>{sizeText(row.sizeBytes)}</Box>
        </Box>
      )),
    },
    { field: 'sharedByName', headerName: '보낸 사람', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.sharedByName || '' },
    { field: 'note', headerName: '한 마디', flex: 0.8, width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => noteCell(row) },
    { field: 'createdAt', headerName: '받은 날', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{dateOnly(row.createdAt)}</Box> },
    { field: 'expiresAt', headerName: '기한', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{until(row)}</Box> },
  ];

  const sentColumns: F1GridColumn<ShareRow>[] = [
    { field: 'key', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'origName', headerName: '문서', flex: 1, width: 300, headerAlign: 'center', align: 'left', renderCell: ({ row }) => `${row.folder ? '📁 ' : ''}${row.origName || ''}` },
    { field: 'toName', headerName: '받는 사람', width: 110, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.toName || '' },
    { field: 'note', headerName: '한 마디', flex: 0.8, width: 200, headerAlign: 'center', align: 'left', renderCell: ({ row }) => noteCell(row) },
    { field: 'createdAt', headerName: '보낸 날', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{dateOnly(row.createdAt)}</Box> },
    { field: 'expiresAt', headerName: '기한', width: 110, headerAlign: 'center', align: 'center', renderCell: ({ row }) => <Box component="span" sx={MONO}>{until(row)}</Box> },
    {
      field: 'id', headerName: '', width: 100, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Button size="small" variant="outlined" color="error" sx={ROW_BTN} onClick={() => void doCancelShare(row)}>공유취소</Button>,
    },
  ];

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        { label: '새 폴더', icon: CreateNewFolderIcon, visible: Boolean(selectedMenuPermissions?.create) && canNewFolder, onClick: () => void openFolderDialog() },
        { label: '파일 올리기', icon: UploadFileIcon, visible: Boolean(selectedMenuPermissions?.create) && canUpload, onClick: () => fileInput.current?.click() },
      ],
    },
  ];

  const owners = ownerOptions(folders, me);
  const gridProps = {
    height: '100%', maxHeight: '100%', rowHeight: 38, minRowHeight: 38, maxRowHeight: 320, columnLine: true, showCheckbox: false,
    resizableRows: false, allowAddRowInContextMenu: false, allowDuplicateRowInContextMenu: false, allowDeleteRowInContextMenu: false,
  } as const;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={place.kind} onChange={(_event, value: DocKind) => switchKind(value)} aria-label="문서함 탭">
          <Tab value="공용" label="공용문서함" />
          <Tab value="개인" label="개인문서함" />
          <Tab value="공유" label="공유문서함" />
        </Tabs>
      </Box>
      <input
        ref={fileInput} type="file" multiple hidden data-testid="doc-upload-input"
        onChange={(event) => {
          const picked = Array.from(event.target.files || []);
          event.target.value = ''; // 같은 파일을 다시 골라도 change 가 뜨도록 비워둔다
          void doUpload(picked);
        }}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          {shareView ? (
            <>
              {/* 공유는 폴더 권한을 뚫는 유일한 갈래라 폴더를 뒤지는 쪽과는 아예 다른 화면으로 둔다 */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>개인문서함에서 사람을 골라 주고받은 문서예요. 기한이 지나면 목록에서 사라집니다.</Typography>
              <Tabs value={shareTab} onChange={(_event, value: ShareTab) => setShareTab(value)} aria-label="공유문서함 탭" sx={{ minHeight: 40, mb: 1 }}>
                <Tab value="mine" label="받은 문서" sx={{ minHeight: 40 }} />
                <Tab value="sent" label="보낸 문서" sx={{ minHeight: 40 }} />
              </Tabs>
              {shareTab === 'sent' && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>취소하면 받은 사람 목록에서 바로 사라져요.</Typography>}
              {(shareTab === 'mine' ? mineRows : sentRows).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{shareTab === 'mine' ? '받은 문서가 없습니다' : '보낸 문서가 없습니다'}</Typography>
              )}
              <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
                {shareTab === 'mine' ? (
                  <F1Grid key="mine" rows={mineRows} columns={mineColumns} rowKey="key" storageKey="pu-doc-shares-mine-grid" ariaLabel="F1-GRID 받은 문서" {...gridProps} />
                ) : (
                  <F1Grid key="sent" rows={sentRows} columns={sentColumns} rowKey="key" storageKey="pu-doc-shares-sent-grid" ariaLabel="F1-GRID 보낸 문서" {...gridProps} />
                )}
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <Box aria-label="폴더 위치" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', fontSize: 13, flex: 1 }}>
                  <Link component="button" underline="hover" onClick={() => goCrumb(null)} sx={{ fontWeight: 700, fontSize: 13 }}>
                    {place.sharedRootId != null ? '← 공유문서함' : '전체'}
                  </Link>
                  {path.map((f, i) => (
                    <Box key={f.id} component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box component="span" sx={{ color: 'text.secondary' }}>›</Box>
                      {i === path.length - 1
                        ? <Box component="span" sx={{ fontWeight: 700 }}>{f.name}</Box>
                        : <Link component="button" underline="hover" onClick={() => goCrumb(f.id)} sx={{ fontSize: 13 }}>{f.name}</Link>}
                    </Box>
                  ))}
                </Box>
                {/* 관리자만 보인다. 남의 개인문서함을 꺼내볼 때 쓴다 */}
                {place.kind === '개인' && me?.admin && place.sharedRootId == null && (
                  <TextField
                    select size="small" margin="none" value={place.ownerFilter ?? me.id}
                    onChange={(event) => setPlace((cur) => ({ ...cur, ownerFilter: String(event.target.value), currentId: null }))}
                    slotProps={{ htmlInput: { 'aria-label': '누구의 개인문서함' } }} sx={{ minWidth: 180 }}
                  >
                    {owners.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: 12 }}>
                {blocked && isLockedMessage(blocked) ? '위 폴더 이름을 눌러 비밀번호를 넣어주세요.' : docHint(place, me)}
              </Typography>
              {/* 폴더를 열었을 때만 보인다. 최상위에는 파일을 두지 않으므로 드랍칸도 없다(어디 것인지 모르는 파일이 생기지 않게) */}
              {canUpload && <DocDropZone inputRef={fileInput} onFiles={(picked) => void doUpload(picked)} />}
              {uploadMsg && (
                <Typography role="status" sx={{ fontSize: 12.5, mb: 0.75, color: uploadMsg.ok == null ? 'text.secondary' : uploadMsg.ok ? 'success.main' : 'error.main' }}>{uploadMsg.text}</Typography>
              )}
              {!loading && (blocked || boxRows.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{blocked || emptyText(place)}</Typography>
              )}
              <Box sx={{ flex: 1, minHeight: 160, overflow: 'hidden' }}>
                <F1Grid rows={blocked ? [] : boxRows} columns={boxColumns} rowKey="key" storageKey="pu-doc-box-grid" ariaLabel="F1-GRID 문서함" loading={loading} {...gridProps} />
              </Box>
            </>
          )}
        </Card>
      </Box>
      <FolderDialog
        open={folderDialog} title={folderDialogTitle(path, place.kind)} hint={folderDialogHint(atRoot, place.kind, me)}
        showDept={atRoot && place.kind === '공용'} admin={Boolean(me?.admin)} myDepartment={me?.department || ''} departments={departments}
        onClose={() => setFolderDialog(false)} onSave={saveFolder}
      />
      <ShareDialog target={shareTarget} onClose={() => setShareTarget(null)} onShared={() => setFilesKey((v) => v + 1)} />
      {ask.node}
    </Box>
  );
}

import { Box, Card, Link, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { DocDropZone, FolderDialog, ShareDialog } from './components/DocumentDialogs';
import { DocumentBoxGrid, createDocumentBoxColumns } from './components/DocumentBoxGrid';
import { ShareMineGrid, createShareMineColumns } from './components/ShareMineGrid';
import { ShareSentGrid, createShareSentColumns } from './components/ShareSentGrid';
import { useDocumentBoxManagement } from './hooks/useDocumentBoxManagement';
import type { DocKind, ShareTab } from './types/documentBox.types';
import { docHint, emptyText, folderDialogHint, folderDialogTitle, isLockedMessage } from './utils/documentBox';

type DocumentBoxManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };

// 구매관리 > 문서함 (송연 #screen-documents · 28-documents.js)
// 공용문서함(부서별) · 개인문서함(나만) · 공유문서함(사람을 골라 주고받은 것). 폴더 아래로 하위폴더를 얼마든지 만들어 문서를 올려둔다.
// 여기서 하는 것은 '보여줄지 말지' 뿐이고, 실제로 막는 것은 서버다. 화면에서만 감추면 주소를 직접 부르면 그만이다.
export function DocumentBoxManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: DocumentBoxManagementPageProps) {
  const management = useDocumentBoxManagement();
  const { me, place, path, shareTab, blocked, uploadMsg, boxRows, mineRows, sentRows, loading } = management;

  // 단추가 me · folders 를 보므로 칸 정의는 그릴 때마다 새로 만든다
  const boxColumns = createDocumentBoxColumns({
    kind: place.kind,
    peeking: management.peeking,
    onOpenFolder: (folder) => void management.openFolder(folder),
    onDownload: (id, name) => void management.doDownload(id, name),
    onShare: management.setShareTarget,
    onLock: (folder) => void management.doLock(folder),
    onClearLock: (folder) => void management.doClearLock(folder),
    onRename: (folder) => void management.doRename(folder),
    onDeleteFolder: (folder) => void management.doDeleteFolder(folder),
    onDeleteFile: (file) => void management.doDeleteFile(file),
  });
  const mineColumns = createShareMineColumns({
    onOpenFolder: (id, name) => void management.openSharedFolder(id, name),
    onDownload: (id, name) => void management.doDownload(id, name),
  });
  const sentColumns = createShareSentColumns({
    onCancel: (row) => void management.doCancelShare(row),
  });

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        {
          label: '새 폴더',
          icon: CreateNewFolderIcon,
          visible: Boolean(selectedMenuPermissions?.create) && management.canNewFolder,
          onClick: () => void management.openFolderDialog(),
        },
        {
          label: '파일 올리기',
          icon: UploadFileIcon,
          visible: Boolean(selectedMenuPermissions?.create) && management.canUpload,
          onClick: () => management.fileInput.current?.click(),
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
        <Tabs value={place.kind} onChange={(_event, value: DocKind) => management.switchKind(value)} aria-label="문서함 탭">
          <Tab value="공용" label="공용문서함" />
          <Tab value="개인" label="개인문서함" />
          <Tab value="공유" label="공유문서함" />
        </Tabs>
      </Box>
      <input
        ref={management.fileInput}
        type="file"
        multiple
        hidden
        data-testid="doc-upload-input"
        onChange={management.handleFileInputChange}
      />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          {management.shareView ? (
            <>
              {/* 공유는 폴더 권한을 뚫는 유일한 갈래라 폴더를 뒤지는 쪽과는 아예 다른 화면으로 둔다 */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>개인문서함에서 사람을 골라 주고받은 문서예요. 기한이 지나면 목록에서 사라집니다.</Typography>
              <Tabs value={shareTab} onChange={(_event, value: ShareTab) => management.setShareTab(value)} aria-label="공유문서함 탭" sx={{ minHeight: 40, mb: 1 }}>
                <Tab value="mine" label="받은 문서" sx={{ minHeight: 40 }} />
                <Tab value="sent" label="보낸 문서" sx={{ minHeight: 40 }} />
              </Tabs>
              {shareTab === 'sent' && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>취소하면 받은 사람 목록에서 바로 사라져요.</Typography>}
              {(shareTab === 'mine' ? mineRows : sentRows).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{shareTab === 'mine' ? '받은 문서가 없습니다' : '보낸 문서가 없습니다'}</Typography>
              )}
              {shareTab === 'mine' ? (
                <ShareMineGrid rows={mineRows} columns={mineColumns} />
              ) : (
                <ShareSentGrid rows={sentRows} columns={sentColumns} />
              )}
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <Box aria-label="폴더 위치" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', fontSize: 13, flex: 1 }}>
                  <Link component="button" underline="hover" onClick={() => management.goCrumb(null)} sx={{ fontWeight: 700, fontSize: 13 }}>
                    {place.sharedRootId != null ? '← 공유문서함' : '전체'}
                  </Link>
                  {path.map((f, i) => (
                    <Box key={f.id} component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box component="span" sx={{ color: 'text.secondary' }}>›</Box>
                      {i === path.length - 1
                        ? <Box component="span" sx={{ fontWeight: 700 }}>{f.name}</Box>
                        : <Link component="button" underline="hover" onClick={() => management.goCrumb(f.id)} sx={{ fontSize: 13 }}>{f.name}</Link>}
                    </Box>
                  ))}
                </Box>
                {/* 관리자만 보인다. 남의 개인문서함을 꺼내볼 때 쓴다 */}
                {place.kind === '개인' && me?.admin && place.sharedRootId == null && (
                  <TextField
                    select
                    size="small"
                    margin="none"
                    value={place.ownerFilter ?? me.id}
                    onChange={(event) => management.selectOwner(String(event.target.value))}
                    slotProps={{ htmlInput: { 'aria-label': '누구의 개인문서함' } }}
                    sx={{ minWidth: 180 }}
                  >
                    {management.owners.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                  </TextField>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: 12 }}>
                {blocked && isLockedMessage(blocked) ? '위 폴더 이름을 눌러 비밀번호를 넣어주세요.' : docHint(place, me)}
              </Typography>
              {/* 폴더를 열었을 때만 보인다. 최상위에는 파일을 두지 않으므로 드랍칸도 없다(어디 것인지 모르는 파일이 생기지 않게) */}
              {management.canUpload && <DocDropZone inputRef={management.fileInput} onFiles={(picked) => void management.doUpload(picked)} />}
              {uploadMsg && (
                <Typography role="status" sx={{ fontSize: 12.5, mb: 0.75, color: uploadMsg.ok == null ? 'text.secondary' : uploadMsg.ok ? 'success.main' : 'error.main' }}>{uploadMsg.text}</Typography>
              )}
              {!loading && (blocked || boxRows.length === 0) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{blocked || emptyText(place)}</Typography>
              )}
              <DocumentBoxGrid rows={blocked ? [] : boxRows} columns={boxColumns} loading={loading} />
            </>
          )}
        </Card>
      </Box>
      <FolderDialog
        open={management.folderDialog}
        title={folderDialogTitle(path, place.kind)}
        hint={folderDialogHint(management.atRoot, place.kind, me)}
        showDept={management.atRoot && place.kind === '공용'}
        admin={Boolean(me?.admin)}
        myDepartment={me?.department || ''}
        departments={management.departments}
        onClose={() => management.setFolderDialog(false)}
        onSave={management.saveFolder}
      />
      <ShareDialog
        target={management.shareTarget}
        onClose={() => management.setShareTarget(null)}
        onShared={management.afterShared}
      />
      {management.askNode}
    </Box>
  );
}

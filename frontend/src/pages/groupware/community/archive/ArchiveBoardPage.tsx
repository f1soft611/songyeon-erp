import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import AddOutlined from '@mui/icons-material/AddOutlined';
import CreateNewFolderOutlined from '@mui/icons-material/CreateNewFolderOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { CommonCodeItemHelpDialog } from '../../../../shared/components/common-code/CommonCodeItemHelpDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { useNotification } from '../../../../shared/context/NotificationContext';
import {
  createCommonCodeItem,
  updateCommonCodeItem,
} from '../../../co/master/common-code/services/commonCodeManagement.service';
import type { PageSearchField } from '../../../../shared/components/page-search/searchFields';
import type {
  PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { ArchiveFileEditDialog } from './components/ArchiveFileEditDialog';
import { ArchiveFileGrid } from './components/ArchiveFileGrid';
import { useArchiveCategories } from './hooks/useArchiveCategories';
import { useArchiveList } from './hooks/useArchiveList';
import { useArchiveMutations } from './hooks/useArchiveMutations';
import { downloadArchiveAttachment } from './services/archiveBoardService';
import type {
  ArchiveBrowserRow,
  ArchiveFileRow,
  ArchiveFileType,
} from './types/archive.types';

type ArchiveBoardPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

const FILE_TYPE_VALUES: ArchiveFileType[] = [
  'ALL',
  'DOCUMENT',
  'SPREADSHEET',
  'PRESENTATION',
  'PDF',
  'IMAGE',
  'VIDEO',
  'ARCHIVE',
];

const DETAIL_FIELDS: PageSearchField[] = [
  { field: 'uploadedAt', label: '올린 날짜', type: 'date', searchSpan: 2 },
  {
    field: 'fileType',
    label: '유형',
    type: 'select',
    searchSpan: 1,
    options: [
      { value: 'DOCUMENT', label: '문서' },
      { value: 'SPREADSHEET', label: '스프레드시트' },
      { value: 'PRESENTATION', label: '프레젠테이션' },
      { value: 'PDF', label: 'PDF' },
      { value: 'IMAGE', label: '이미지' },
      { value: 'VIDEO', label: '비디오' },
      { value: 'ARCHIVE', label: '압축' },
    ],
  },
];

function getDateRange(value: PageSearchFieldValue | undefined) {
  if (!value || typeof value !== 'object') return { from: '', to: '' };
  return { from: value.from ?? '', to: value.to ?? '' };
}

function getDateSummary(from: string, to: string) {
  const today = dayjs().format('YYYY-MM-DD');
  const lastYear = dayjs().subtract(1, 'year').format('YYYY-MM-DD');
  if (from === lastYear && to === today) return '최근 1년';
  if (!from && !to) return '전체 기간';
  return `${from || '시작 제한 없음'} ~ ${to || '종료 제한 없음'}`;
}

function getFileType(value: PageSearchFieldValue | undefined): ArchiveFileType {
  if (typeof value !== 'string') return 'ALL';
  return FILE_TYPE_VALUES.find((fileType) => fileType === value) ?? 'ALL';
}

const FOLDERS_SECTION_ID = 'section:folders';
const FILES_SECTION_ID = 'section:files';

function buildBrowserRows(
  categories: ReturnType<typeof useArchiveCategories>['categories'],
  files: ArchiveFileRow[],
  folderCode: string,
  keyword: string,
): ArchiveBrowserRow[] {
  const fileRows: ArchiveBrowserRow[] = files.map((file) => {
    const category = categories.find((item) => item.code === file.categoryCode);
    return {
      rowKey: `file:${file.boardFileId}`,
      parentId: FILES_SECTION_ID,
      rowType: 'file',
      name: file.fileName,
      ownerName: file.writerName,
      uploadedAt: file.uploadedAt,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      file,
      active: !file.categoryCode || category?.active === true,
    };
  });

  if (folderCode) {
    return [
      {
        rowKey: FILES_SECTION_ID,
        parentId: null,
        rowType: 'section',
        name: '파일',
        label: '파일',
      },
      ...fileRows,
    ];
  }

  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  const folderRows: ArchiveBrowserRow[] = categories
    .filter(
      (category) =>
        !normalizedKeyword ||
        category.name.toLocaleLowerCase().includes(normalizedKeyword),
    )
    .map((category) => ({
      rowKey: `folder:${category.code}`,
      parentId: FOLDERS_SECTION_ID,
      rowType: 'folder',
      name: category.name,
      folderCode: category.code,
      folderName: category.name,
      active: category.active,
    }));

  return [
    {
      rowKey: FOLDERS_SECTION_ID,
      parentId: null,
      rowType: 'section',
      name: '폴더',
      label: '폴더',
    },
    ...folderRows,
    {
      rowKey: FILES_SECTION_ID,
      parentId: null,
      rowType: 'section',
      name: '파일',
      label: '파일',
    },
    ...fileRows,
  ];
}

export function ArchiveBoardPage({
  selectedModule,
  currentMenuName,
  content,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: ArchiveBoardPageProps) {
  const { showError, showSuccess } = useNotification();
  const [searchDraft, setSearchDraft] = useState('');
  const [currentFolderCode, setCurrentFolderCode] = useState('');
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >(() => {
    const today = dayjs();
    return {
      uploadedAt: {
        from: today.subtract(1, 'year').format('YYYY-MM-DD'),
        to: today.format('YYYY-MM-DD'),
      },
      fileType: '',
    };
  });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<ArchiveFileRow | null>(null);
  const [deletingFile, setDeletingFile] = useState<ArchiveFileRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreate = isTenantAdmin && Boolean(selectedMenuPermissions?.create);
  const canUpdate = isTenantAdmin && Boolean(selectedMenuPermissions?.update);
  const canDelete = isTenantAdmin && Boolean(selectedMenuPermissions?.delete);
  const canEditCategories = Boolean(
    isTenantAdmin &&
      (selectedMenuPermissions?.create || selectedMenuPermissions?.update),
  );

  const categories = useArchiveCategories();
  const archiveList = useArchiveList();
  const reloadList = async () => {
    archiveList.retry();
  };
  const mutations = useArchiveMutations({
    reloadList,
    showError,
    showSuccess,
  });

  const currentFolder = categories.categories.find(
    (item) => item.code === currentFolderCode,
  );
  const currentFolderName = currentFolder?.name ?? currentFolderCode;
  const rows = useMemo(
    () =>
      buildBrowserRows(
        categories.categories,
        archiveList.rows,
        currentFolderCode,
        archiveList.filters.keyword,
      ),
    [
      archiveList.filters.keyword,
      archiveList.rows,
      categories.categories,
      currentFolderCode,
    ],
  );
  const fileCount = archiveList.rows.length;
  const dateSummary = getDateSummary(
    archiveList.filters.uploadedFrom,
    archiveList.filters.uploadedTo,
  );

  const applySearch = (filters: {
    uploadedFrom: string;
    uploadedTo: string;
    fileType: ArchiveFileType;
  }) => {
    archiveList.setFilters({
      ...archiveList.filters,
      keyword: searchDraft.trim(),
      folderCode: currentFolderCode,
      ...filters,
    });
  };

  const handleDefaultSearch = () => {
    archiveList.setFilters({
      ...archiveList.filters,
      keyword: searchDraft.trim(),
      folderCode: currentFolderCode,
    });
  };

  const handleDetailSearch = (
    values: Record<string, PageSearchFieldValue>,
  ) => {
    const range = getDateRange(values.uploadedAt);
    if (range.from && range.to && range.from > range.to) {
      showError('시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    applySearch({
      uploadedFrom: range.from,
      uploadedTo: range.to,
      fileType: getFileType(values.fileType),
    });
  };

  const handleFolderChange = (folderCode: string) => {
    setCurrentFolderCode(folderCode);
    archiveList.setFilters({
      ...archiveList.filters,
      folderCode,
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    await mutations.uploadFiles(files, currentFolderCode || null);
    event.target.value = '';
  };

  const handleDownload = async (row: ArchiveFileRow) => {
    try {
      await downloadArchiveAttachment(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showError(`파일 다운로드에 실패했습니다: ${message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFile) return;
    const deleted = await mutations.deleteFile(deletingFile);
    if (deleted) setDeletingFile(null);
  };

  const showReadDenied =
    selectedMenuPermissions != null && !selectedMenuPermissions.read;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={[selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={[
          ...(canCreate
            ? [
                {
                  key: 'archive-create',
                  actions: [
                    {
                      key: 'upload-archive',
                      label: '파일 업로드',
                      icon: AddOutlined,
                      onClick: handleUploadClick,
                    },
                    {
                      key: 'create-archive-folder',
                      label: '새 폴더',
                      icon: CreateNewFolderOutlined,
                      onClick: () => setCategoryDialogOpen(true),
                    },
                  ],
                },
              ]
            : []),
          ...(!canCreate && canEditCategories
            ? [
                {
                  key: 'archive-category-management',
                  actions: [
                    {
                      key: 'manage-archive-folders',
                      label: '폴더 관리',
                      icon: CreateNewFolderOutlined,
                      onClick: () => setCategoryDialogOpen(true),
                    },
                  ],
                },
              ]
            : []),
        ]}
      />

      <PageSearchArea
        searchField={
          <TextField
            fullWidth
            size="small"
            margin="none"
            placeholder="파일명 또는 소유자 검색"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '자료 검색' },
            }}
            sx={{ height: 40 }}
          />
        }
        onDefaultSearch={handleDefaultSearch}
        detailFields={DETAIL_FIELDS}
        detailValues={detailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={handleDetailSearch}
        detailLoading={archiveList.isLoading}
      >
        <Chip
          size="small"
          variant="outlined"
          label={`올린 날짜: ${dateSummary}`}
          aria-label={`적용된 날짜: ${dateSummary}`}
        />
      </PageSearchArea>

      <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 1.5, pb: 1 }}>
        {showReadDenied && (
          <Alert severity="warning">조회 권한이 없어 자료실을 볼 수 없습니다.</Alert>
        )}
        {categories.error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void categories.loadCategories()}>
                재시도
              </Button>
            }
          >
            {categories.error.message}
          </Alert>
        )}
        {archiveList.error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={archiveList.retry}>
                재시도
              </Button>
            }
          >
            자료 파일을 불러오지 못했습니다: {archiveList.error.message}
          </Alert>
        )}
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', mt: 1, minWidth: 0, flexWrap: 'wrap' }}
          aria-label="자료실 경로"
        >
          <Button
            type="button"
            size="small"
            variant={currentFolderCode ? 'text' : 'contained'}
            onClick={() => handleFolderChange('')}
          >
            자료실
          </Button>
          {currentFolderCode && (
            <>
              <Typography color="text.secondary">/</Typography>
              <Typography variant="body2" noWrap>
                {currentFolderName}
              </Typography>
              {!currentFolder?.active && (
                <Chip label="사용 중지" size="small" variant="outlined" />
              )}
            </>
          )}
        </Stack>
      </Box>

      {!archiveList.isLoading && !archiveList.error && fileCount === 0 && (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 1 }}>
          <Alert severity="info">조건에 맞는 파일이 없습니다.</Alert>
        </Box>
      )}

      {(categories.isLoading ||
        mutations.isUploading ||
        mutations.isDeleting ||
        mutations.isUpdating) && (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 1 }}>
          <Alert severity="info">
            {categories.isLoading
              ? '분류 정보를 불러오는 중입니다.'
              : '요청 처리 중입니다.'}
          </Alert>
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, px: { xs: 1, sm: 2 }, pb: 2 }}>
        <ArchiveFileGrid
          rows={rows}
          loading={archiveList.isLoading}
          onFolderOpen={handleFolderChange}
          onDownload={(row) => void handleDownload(row)}
          onEdit={setEditingFile}
          onDelete={setDeletingFile}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileInputChange}
        aria-label="자료 파일 선택"
      />

      <CommonCodeItemHelpDialog
        open={categoryDialogOpen}
        groupId={categories.groupId}
        items={categories.items}
        canEdit={canEditCategories}
        dialogTitle="자료실 폴더 관리"
        gridAriaLabel="자료실 폴더 목록"
        onClose={() => setCategoryDialogOpen(false)}
        onCreateItem={(payload) =>
          createCommonCodeItem(categories.groupId, payload)
        }
        onUpdateItem={(itemId, payload) =>
          updateCommonCodeItem(categories.groupId, itemId, payload)
        }
        onReload={categories.loadCategories}
      />

      <ArchiveFileEditDialog
        file={editingFile}
        categories={categories.categories}
        saving={mutations.isUpdating}
        onClose={() => setEditingFile(null)}
        onSave={(file, payload) => mutations.updateFile(file, payload)}
      />

      <Dialog
        open={deletingFile !== null}
        onClose={mutations.isDeleting ? undefined : () => setDeletingFile(null)}
        aria-labelledby="archive-delete-title"
        aria-describedby="archive-delete-description"
      >
        <DialogTitle id="archive-delete-title">자료 삭제 확인</DialogTitle>
        <DialogContent id="archive-delete-description">
          {deletingFile?.fileName} 파일을 삭제하시겠습니까?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingFile(null)} disabled={mutations.isDeleting}>
            취소
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDelete()}
            disabled={mutations.isDeleting}
          >
            삭제 확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

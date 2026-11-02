import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import { CommonCodeItemHelpDialog } from '../../../../shared/components/common-code/CommonCodeItemHelpDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { useNotification } from '../../../../shared/context/NotificationContext';
import { usePageSearchDefaults } from '../../../../shared/hooks/usePageSearchDefaults';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import {
  createCommonCodeItem,
  updateCommonCodeItem,
} from '../../../co/master/common-code/services/commonCodeManagement.service';
import {
  isPageSearchValues,
  type PageSearchField,
  type PageSearchFieldValue,
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
const ARCHIVE_SEARCH_SESSION_KEY = 's-erp:page:community-archive';
const ARCHIVE_SEARCH_SESSION_VERSION = 1;

const DETAIL_FIELDS: PageSearchField[] = [
  {
    field: 'uploadedAt',
    label: '올린 날짜',
    type: 'date',
    searchSpan: 2,
    defaultValue: {
      from: { type: 'systemDate', offset: { years: -1 } },
      to: { type: 'systemDate' },
    },
  },
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

function getDateSummary(
  from: string,
  to: string,
  defaultRange: { from: string; to: string },
) {
  if (
    defaultRange.from &&
    defaultRange.to &&
    from === defaultRange.from &&
    to === defaultRange.to
  ) {
    return '최근 1년';
  }
  if (!from && !to) return '전체 기간';
  return `${from || '시작 제한 없음'} ~ ${to || '종료 제한 없음'}`;
}

function getFileType(value: PageSearchFieldValue | undefined): ArchiveFileType {
  if (typeof value !== 'string') return 'ALL';
  return FILE_TYPE_VALUES.find((fileType) => fileType === value) ?? 'ALL';
}

type ArchiveSearchSession = {
  keyword: string;
  folderCode: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

function isArchiveSearchSession(value: unknown): value is ArchiveSearchSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArchiveSearchSession>;
  if (
    typeof candidate.keyword !== 'string' ||
    typeof candidate.folderCode !== 'string' ||
    !isPageSearchValues(candidate.detailValues)
  ) {
    return false;
  }
  const fileType = candidate.detailValues.fileType;
  return (
    fileType === undefined ||
    fileType === '' ||
    (typeof fileType === 'string' &&
      FILE_TYPE_VALUES.includes(fileType as ArchiveFileType))
  );
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
  const {
    values: defaultValues,
    loading: defaultsLoading,
    error: defaultsError,
    retry: retryDefaults,
    initialLoad: defaultsInitialLoad,
  } = usePageSearchDefaults(DETAIL_FIELDS);
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<ArchiveSearchSession | null>(
      ARCHIVE_SEARCH_SESSION_KEY,
      null,
      {
        version: ARCHIVE_SEARCH_SESSION_VERSION,
        validate: (value): value is ArchiveSearchSession | null =>
          value === null || isArchiveSearchSession(value),
      },
    );
  const [searchDraft, setSearchDraft] = useState(searchSession?.keyword ?? '');
  const [currentFolderCode, setCurrentFolderCode] = useState(
    searchSession?.folderCode ?? '',
  );
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >(searchSession?.detailValues ?? {});
  const [defaultsInitialized, setDefaultsInitialized] = useState(false);
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
  const archiveList = useArchiveList(defaultsInitialized);
  const isQueryLoading =
    categories.isLoading ||
    archiveList.isLoading ||
    defaultsLoading ||
    (!defaultsInitialized && !defaultsError);
  useEffect(() => {
    if (!defaultValues || defaultsInitialized) return;

    const restoredValues = searchSession?.detailValues ?? defaultValues;
    const dateRange = getDateRange(restoredValues.uploadedAt);
    const initialSession: ArchiveSearchSession = searchSession ?? {
      keyword: '',
      folderCode: '',
      detailValues: restoredValues,
    };
    setDetailValues(restoredValues);
    setSearchDraft(initialSession.keyword);
    setCurrentFolderCode(initialSession.folderCode);
    archiveList.setFilters({
      keyword: initialSession.keyword,
      folderCode: initialSession.folderCode,
      uploadedFrom: dateRange.from,
      uploadedTo: dateRange.to,
      fileType: getFileType(restoredValues.fileType),
    });
    if (!searchSession) setSearchSession(initialSession);
    setDefaultsInitialized(true);
  }, [
    archiveList.setFilters,
    defaultValues,
    defaultsInitialized,
    searchSession,
    setSearchSession,
  ]);
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
  const defaultDateRange = getDateRange(defaultValues?.uploadedAt);
  const dateSummary = defaultsError
    ? '날짜 기본값 오류'
    : defaultsLoading || !defaultsInitialized
      ? '—'
      : getDateSummary(
          archiveList.filters.uploadedFrom,
          archiveList.filters.uploadedTo,
          defaultDateRange,
        );
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

  const applySearch = (
    values: Record<string, PageSearchFieldValue>,
    session: ArchiveSearchSession,
  ) => {
    const dateRange = getDateRange(values.uploadedAt);
    archiveList.setFilters({
      keyword: session.keyword,
      folderCode: session.folderCode,
      uploadedFrom: dateRange.from,
      uploadedTo: dateRange.to,
      fileType: getFileType(values.fileType),
    });
    setSearchSession(session);
    setDetailValues(values);
  };

  const handleDefaultSearch = () => {
    if (!defaultsInitialized) return;
    const session = {
      keyword: searchDraft.trim(),
      folderCode: currentFolderCode,
      detailValues: searchSession?.detailValues ?? detailValues,
    };
    const dateRange = getDateRange(session.detailValues.uploadedAt);
    archiveList.setFilters({
      keyword: session.keyword,
      folderCode: session.folderCode,
      uploadedFrom: dateRange.from,
      uploadedTo: dateRange.to,
      fileType: getFileType(session.detailValues.fileType),
    });
    setSearchSession(session);
    setDetailValues(session.detailValues);
  };

  const handleDetailSearch = (values: Record<string, PageSearchFieldValue>) => {
    const range = getDateRange(values.uploadedAt);
    if (range.from && range.to && range.from > range.to) {
      showError('시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    applySearch(values, {
      keyword: searchDraft.trim(),
      folderCode: currentFolderCode,
      detailValues: values,
    });
  };

  const handleFolderChange = (folderCode: string) => {
    setCurrentFolderCode(folderCode);
    const session: ArchiveSearchSession = {
      keyword: archiveList.filters.keyword,
      folderCode,
      detailValues: searchSession?.detailValues ?? detailValues,
    };
    setSearchSession(session);
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
        breadcrumbItems={[selectedModule.name, '커뮤니티', currentMenuName]}
        description={content.description}
        actionGroups={[
          ...(canCreate
            ? [
                {
                  key: 'archive-create',
                  actions: [
                    {
                      key: 'create-archive-folder',
                      label: '새 폴더',
                      icon: CreateNewFolderOutlined,
                      onClick: () => setCategoryDialogOpen(true),
                    },
                    {
                      key: 'upload-archive',
                      label: '파일 업로드',
                      icon: AddOutlined,
                      onClick: handleUploadClick,
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

      <PageLoadBoundary {...defaultsInitialLoad} label="검색 기본값" onRetry={retryDefaults}>
      <PageLoadBoundary {...categories.initialLoad} label="자료실 분류"
        onRetry={() => { void categories.loadCategories(); }}>
      <PageLoadBoundary {...archiveList.initialLoad} label="자료실 목록" onRetry={archiveList.retry}>
      <PageSearchArea
        searchField={
          <TextField
            fullWidth
            size="small"
            margin="none"
            placeholder="파일명 또는 소유자 검색"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            disabled={!defaultsInitialized}
            slotProps={{
              htmlInput: { 'aria-label': '자료 검색' },
            }}
            sx={{ height: 40 }}
          />
        }
        onDefaultSearch={handleDefaultSearch}
        detailFields={DETAIL_FIELDS}
        detailValues={detailValues}
        appliedDetailValues={searchSession?.detailValues ?? {}}
        defaultValues={defaultValues ?? {}}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={handleDetailSearch}
        onDetailReset={(values) => {
          const range = getDateRange(values.uploadedAt);
          setDetailValues(values);
          setSearchDraft('');
          const session = {
            keyword: '',
            folderCode: currentFolderCode,
            detailValues: values,
          };
          setSearchSession(session);
          archiveList.setFilters({
            keyword: session.keyword,
            folderCode: session.folderCode,
            uploadedFrom: range.from,
            uploadedTo: range.to,
            fileType: getFileType(values.fileType),
          });
        }}
        detailLoading={
          archiveList.isLoading || defaultsLoading || !defaultsInitialized
        }
      >
        <Chip
          size="small"
          variant="outlined"
          label={`올린 날짜: ${dateSummary}`}
          aria-label={`적용된 날짜: ${dateSummary}`}
        />
      </PageSearchArea>

      <Box sx={{ px: { xs: 1.5, sm: 3 }, pt: 1.5, pb: 1 }}>
        {defaultsError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={retryDefaults}
              >
                재시도
              </Button>
            }
          >
            {defaultsError}
          </Alert>
        )}
        {showReadDenied && (
          <Alert severity="warning">
            조회 권한이 없어 자료실을 볼 수 없습니다.
          </Alert>
        )}
        {categories.error && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void categories.loadCategories()}
              >
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

      {defaultsInitialized &&
        !isQueryLoading &&
        !archiveList.error &&
        fileCount === 0 && (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 1 }}>
          <Alert severity="info">조건에 맞는 파일이 없습니다.</Alert>
        </Box>
        )}

      {(mutations.isUploading ||
        mutations.isDeleting ||
        mutations.isUpdating) && (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 1 }}>
          <Alert severity="info">요청 처리 중입니다.</Alert>
        </Box>
      )}

      <Box
        data-testid="archive-grid-container"
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          px: { xs: 1, sm: 2 },
          pb: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <ArchiveFileGrid
          rows={rows}
          loading={isQueryLoading}
          onFolderOpen={handleFolderChange}
          onDownload={(row) => void handleDownload(row)}
          onEdit={setEditingFile}
          onDelete={setDeletingFile}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canExportExcel={selectedMenuPermissions?.excel ?? false}
        />
      </Box>

      </PageLoadBoundary>
      </PageLoadBoundary>
      </PageLoadBoundary>
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
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDelete()}
            disabled={mutations.isDeleting}
          >
            삭제 확인
          </Button>
          <Button
            onClick={() => setDeletingFile(null)}
            disabled={mutations.isDeleting}
          >
            취소
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

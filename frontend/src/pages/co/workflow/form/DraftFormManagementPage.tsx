import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { type F1GridRef } from '../../../../shared/components/f1-grid';
import {
  isPageSearchValues,
  toPageSearchFields,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import { CommonCodeItemHelpDialog } from '../../../../shared/components/common-code/CommonCodeItemHelpDialog';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  createDraftFormCategoryItem,
  updateDraftFormCategoryItem,
} from './services/draftFormManagement.service';
import type {
  DraftFormFilters,
  DraftFormRow,
} from './types/draftFormManagement.types';
import {
  createDraftFormColumns,
  DraftFormGrid,
} from './components/DraftFormGrid';
import { DraftFormTemplateDialog } from './components/DraftFormTemplateDialog';
import { useDraftFormManagement } from './hooks/useDraftFormManagement';

const DRAFT_FORM_SEARCH_SESSION_KEY = 'songyeon-erp:page:draft-form-management';
const DRAFT_FORM_SEARCH_SESSION_VERSION = 1;

type DraftFormSearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

type PendingDraftFormSearch = {
  filters: DraftFormFilters;
  session: DraftFormSearchSession;
};

function isDraftFormSearchSession(value: unknown): value is DraftFormSearchSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DraftFormSearchSession>;
  return typeof candidate.keyword === 'string' && isPageSearchValues(candidate.detailValues);
}

function toDraftFormSearchFilters(
  session: DraftFormSearchSession,
): DraftFormFilters {
  const selected = (value: PageSearchFieldValue | undefined) =>
    value == null || typeof value === 'object' ? '' : String(value).trim();
  const useAt = selected(session.detailValues.useAt);
  return {
    keyword: session.keyword.trim() || undefined,
    categoryItemId: selected(session.detailValues.categoryItemId)
      ? Number(selected(session.detailValues.categoryItemId))
      : undefined,
    regTermId: selected(session.detailValues.regTermId)
      ? Number(selected(session.detailValues.regTermId))
      : undefined,
    useAt: useAt === 'Y' || useAt === 'N' ? useAt : undefined,
  };
}

type DraftFormManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

export function DraftFormManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: DraftFormManagementPageProps) {
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<DraftFormSearchSession | null>(
      DRAFT_FORM_SEARCH_SESSION_KEY,
      null,
      {
        version: DRAFT_FORM_SEARCH_SESSION_VERSION,
        validate: (value): value is DraftFormSearchSession | null =>
          value === null || isDraftFormSearchSession(value),
      },
    );
  const management = useDraftFormManagement(
    searchSession ? toDraftFormSearchFilters(searchSession) : {},
  );
  useUnsavedChangesBeforeUnload(management.hasChanges);
  const gridRef = useRef<F1GridRef<DraftFormRow>>(null);
  const saveAttemptActiveRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >(searchSession?.detailValues ?? {});
  const [helperOpen, setHelperOpen] = useState(false);
  const [templateTarget, setTemplateTarget] = useState<DraftFormRow | null>(null);
  const [pendingTemplateTarget, setPendingTemplateTarget] =
    useState<DraftFormRow | null>(null);
  const [templateDiscardConfirmOpen, setTemplateDiscardConfirmOpen] =
    useState(false);
  const [categoryNoticeDismissed, setCategoryNoticeDismissed] = useState(false);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [pendingSearch, setPendingSearch] =
    useState<PendingDraftFormSearch | null>(null);

  const pagePermissions = {
    read: Boolean(selectedMenuPermissions?.read),
    create: Boolean(isTenantAdmin && selectedMenuPermissions?.create),
    update: Boolean(isTenantAdmin && selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const canEditCategories = Boolean(
    isTenantAdmin &&
    (selectedMenuPermissions?.create || selectedMenuPermissions?.update),
  );
  const canWriteForms = pagePermissions.create || pagePermissions.update;
  const canEditTemplate = pagePermissions.update;
  const handleOpenTemplate = useCallback(
    (row: DraftFormRow) => {
      if (management.saving) return;
      if (management.hasChanges) {
        setPendingTemplateTarget(row);
        setTemplateDiscardConfirmOpen(true);
        return;
      }
      setTemplateTarget(row);
    },
    [management.hasChanges, management.saving],
  );
  const columns = useMemo(
    () =>
      createDraftFormColumns(
        management.categoryItems,
        management.cycleItems,
        management.users,
        canWriteForms && !management.saving,
        canEditTemplate && !management.saving ? handleOpenTemplate : undefined,
      ),
    [
      management.categoryItems,
      management.cycleItems,
      management.users,
      canWriteForms,
      canEditTemplate,
      management.saving,
      handleOpenTemplate,
    ],
  );
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

  const requestSearch = (
    filters: DraftFormFilters,
    session: DraftFormSearchSession,
  ) => {
    if (management.saving) return;
    if (management.hasChanges) {
      setPendingSearch({ filters, session });
      setRefreshConfirmOpen(true);
      return;
    }
    management.applyFilters(filters);
    setSearchSession(session);
    setDetailValues(session.detailValues);
  };

  const handleDetailSearch = (values: Record<string, PageSearchFieldValue>) => {
    const session = { keyword: searchQuery.trim(), detailValues: values };
    requestSearch(toDraftFormSearchFilters(session), session);
  };

  const handleDefaultSearch = () => {
    const session = {
      keyword: searchQuery.trim(),
      detailValues: searchSession?.detailValues ?? {},
    };
    requestSearch(toDraftFormSearchFilters(session), session);
  };

  const cancelPendingSearch = () => {
    setRefreshConfirmOpen(false);
    setPendingSearch(null);
    setDetailValues(searchSession?.detailValues ?? {});
  };

  const confirmPendingSearch = () => {
    const pending = pendingSearch;
    setRefreshConfirmOpen(false);
    setPendingSearch(null);
    if (!pending) return;
    management.discardChanges();
    management.applyFilters(pending.filters);
    setSearchSession(pending.session);
    setDetailValues(pending.session.detailValues);
  };

  const handleGridSave = () => {
    if (management.saving || saveAttemptActiveRef.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    if (!grid.validate()) {
      management.setError('필수 입력 항목을 확인해 주세요.');
      return;
    }
    saveAttemptActiveRef.current = true;
    void management
      .saveChanges(grid.getChanges())
      .finally(() => {
        saveAttemptActiveRef.current = false;
      });
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        {
          label: '분류 설정',
          icon: CategoryOutlinedIcon,
          visible: canEditCategories,
          disabled: management.saving,
          onClick: () => setHelperOpen(true),
        },
        {
          label: '양식 추가',
          icon: AddIcon,
          visible: pagePermissions.create,
          disabled:
            management.loading ||
            management.optionsLoading ||
            management.saving ||
            management.categoryItems.length === 0,
          onClick: () => gridRef.current?.addRow(),
        },
      ],
    },
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pagePermissions.read,
          disabled: management.saving,
          onClick: handleDefaultSearch,
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: SaveIcon,
          saving: management.saving,
          savingAriaLabel: '기안양식 저장 중',
          visible: canWriteForms,
          disabled: !management.hasChanges || management.saving,
          onClick: handleGridSave,
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems?.length
            ? breadcrumbItems
            : [selectedModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageLoadBoundary {...management.initialLoad} label="기안양식 목록"
        onRetry={() => management.applyFilters(management.appliedFilters)}>
      <PageLoadBoundary {...management.optionsInitialLoad} label="기안양식 옵션"
        onRetry={() => { void management.loadOptions(); }}>
      <Box
        component="fieldset"
        disabled={management.saving}
        sx={{ border: 0, m: 0, minWidth: 0, p: 0 }}
      >
        <PageSearchArea
          searchField={
            <TextField
              size="small"
              margin="none"
              placeholder="양식코드/양식명 검색"
              value={searchQuery}
              disabled={management.saving}
              onChange={(event) => setSearchQuery(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '기안양식 검색' },
                input: {
                  endAdornment: searchQuery ? (
                    <IconButton
                      type="button"
                      size="small"
                      edge="end"
                      aria-label="기안양식 검색어 초기화"
                      onClick={() => setSearchQuery('')}
                      sx={{ p: 0.25 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null,
                },
              }}
              sx={(theme) => ({
                width: '100%',
                height: 40,
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  borderRadius: '0 8px 8px 0',
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.72)'
                      : 'rgba(255,255,255,0.72)',
                },
              })}
            />
          }
          onDefaultSearch={handleDefaultSearch}
          detailFields={detailFields}
          detailValues={detailValues}
          appliedDetailValues={searchSession?.detailValues ?? {}}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={handleDetailSearch}
          detailLoading={management.loading || management.saving}
        />
      </Box>
      <PageMessageArea
        message={management.error}
        onClose={() => management.setError('')}
      />
      <PageMessageArea
        message={
          management.optionsLoaded &&
          management.categoryItems.length === 0 &&
          !categoryNoticeDismissed
            ? '분류 항목이 없습니다. 분류를 추가한 뒤 기안양식을 등록할 수 있습니다.'
            : ''
        }
        severity="info"
        onClose={() => setCategoryNoticeDismissed(true)}
      />
      <Box
        onKeyDownCapture={(event) => {
          // The grid's Delete shortcut bypasses its context-menu delete gate.
          if (
            management.saving &&
            event.key === 'Delete' &&
            event.target instanceof HTMLElement &&
            event.target.closest('[role="grid"]')
          ) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        sx={{
          flex: 1,
          minHeight: 280,
          minWidth: 0,
          p: 1,
        }}
      >
        <DraftFormGrid
          rows={management.rows}
          columns={columns}
          canCreate={
            pagePermissions.create &&
            management.categoryItems.length > 0 &&
            !management.saving
          }
          canUpdate={pagePermissions.update && !management.saving}
          canExportExcel={pagePermissions.excel}
          saving={management.saving}
          loading={management.loading}
          gridKey={management.gridKey}
          gridRef={gridRef}
          onChangesChange={management.handleChangesChange}
        />
      </Box>
      {templateTarget && (
        <DraftFormTemplateDialog
          key={String(templateTarget.draftingWorkCategoryId)}
          open
          row={templateTarget}
          onClose={() => setTemplateTarget(null)}
          onSaved={async () => {
            await management.loadRows(management.appliedFilters, { quiet: true });
          }}
        />
      )}
      <CommonCodeItemHelpDialog
        open={helperOpen}
        groupId={management.categoryGroupId}
        items={management.categoryItems}
        canEdit={canEditCategories}
        onClose={() => setHelperOpen(false)}
        onCreateItem={(payload) =>
          createDraftFormCategoryItem(management.categoryGroupId, payload)
        }
        onUpdateItem={(itemId, payload) =>
          updateDraftFormCategoryItem(
            management.categoryGroupId,
            itemId,
            payload,
          )
        }
        onReload={async () => {
          await management.loadOptions();
          await management.loadRows(management.appliedFilters, { quiet: true });
          setCategoryNoticeDismissed(false);
        }}
      />
      <UnsavedChangesConfirmDialog
        open={refreshConfirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 기안양식 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={cancelPendingSearch}
        onContinue={confirmPendingSearch}
      />
      <UnsavedChangesConfirmDialog
        open={templateDiscardConfirmOpen}
        title="저장하지 않은 변경사항"
        description="기안양식 기본정보 변경을 버리고 문서 양식을 여시겠습니까?"
        cancelLabel="계속 편집"
        continueLabel="변경 버리고 열기"
        onCancel={() => {
          setTemplateDiscardConfirmOpen(false);
          setPendingTemplateTarget(null);
        }}
        onContinue={() => {
          const target = pendingTemplateTarget;
          setTemplateDiscardConfirmOpen(false);
          setPendingTemplateTarget(null);
          management.discardChanges();
          if (target) setTemplateTarget(target);
        }}
      />
      </PageLoadBoundary>
      </PageLoadBoundary>
    </Box>
  );
}

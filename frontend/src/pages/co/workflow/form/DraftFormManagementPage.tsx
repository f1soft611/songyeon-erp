import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { Box, CircularProgress, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { type F1GridRef } from '../../../../shared/components/f1-grid';
import {
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

type DraftFormManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  isTenantAdmin?: boolean;
};

function DraftFormSaveProgressIcon() {
  return (
    <CircularProgress size={16} color="inherit" aria-label="기안양식 저장 중" />
  );
}

export function DraftFormManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  isTenantAdmin = false,
}: DraftFormManagementPageProps) {
  const management = useDraftFormManagement();
  const gridRef = useRef<F1GridRef<DraftFormRow>>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailValues, setDetailValues] = useState<
    Record<string, PageSearchFieldValue>
  >({});
  const [helperOpen, setHelperOpen] = useState(false);
  const [templateTarget, setTemplateTarget] = useState<DraftFormRow | null>(null);
  const [pendingTemplateTarget, setPendingTemplateTarget] =
    useState<DraftFormRow | null>(null);
  const [templateDiscardConfirmOpen, setTemplateDiscardConfirmOpen] =
    useState(false);
  const [categoryNoticeDismissed, setCategoryNoticeDismissed] = useState(false);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<DraftFormFilters | null>(
    null,
  );

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
      if (management.hasChanges) {
        setPendingTemplateTarget(row);
        setTemplateDiscardConfirmOpen(true);
        return;
      }
      setTemplateTarget(row);
    },
    [management.hasChanges],
  );
  const columns = useMemo(
    () =>
      createDraftFormColumns(
        management.categoryItems,
        management.cycleItems,
        management.users,
        canWriteForms,
        canEditTemplate ? handleOpenTemplate : undefined,
      ),
    [
      management.categoryItems,
      management.cycleItems,
      management.users,
      canWriteForms,
      canEditTemplate,
      handleOpenTemplate,
    ],
  );
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);

  const requestSearch = (filters: DraftFormFilters) => {
    if (management.hasChanges) {
      setPendingFilters(filters);
      setRefreshConfirmOpen(true);
      return;
    }
    management.applyFilters(filters);
  };

  const handleDetailSearch = (values: Record<string, PageSearchFieldValue>) => {
    const selected = (value: PageSearchFieldValue | undefined) =>
      value == null || typeof value === 'object' ? '' : String(value).trim();
    const useAt = selected(values.useAt);
    requestSearch({
      keyword: searchQuery.trim() || undefined,
      categoryItemId: selected(values.categoryItemId)
        ? Number(selected(values.categoryItemId))
        : undefined,
      regTermId: selected(values.regTermId)
        ? Number(selected(values.regTermId))
        : undefined,
      useAt: useAt === 'Y' || useAt === 'N' ? useAt : undefined,
    });
  };

  const handleDefaultSearch = () => {
    requestSearch({
      ...management.appliedFilters,
      keyword: searchQuery.trim() || undefined,
    });
  };

  const cancelPendingSearch = () => {
    setRefreshConfirmOpen(false);
    setPendingFilters(null);
  };

  const confirmPendingSearch = () => {
    const filters = pendingFilters;
    setRefreshConfirmOpen(false);
    setPendingFilters(null);
    if (!filters) return;
    management.discardChanges();
    management.applyFilters(filters);
  };

  const handleGridSave = () => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!grid.validate()) {
      management.setError('필수 입력 항목을 확인해 주세요.');
      return;
    }
    void management.saveChanges(grid.getChanges());
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'write',
      actions: [
        {
          label: '분류 설정',
          icon: CategoryOutlinedIcon,
          visible: canEditCategories,
          onClick: () => setHelperOpen(true),
        },
        {
          label: '양식 추가',
          icon: AddIcon,
          visible: pagePermissions.create,
          disabled:
            management.loading ||
            management.optionsLoading ||
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
          onClick: handleDefaultSearch,
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: management.saving ? DraftFormSaveProgressIcon : SaveIcon,
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
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="양식코드/양식명 검색"
            value={searchQuery}
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
        onDetailValuesChange={setDetailValues}
        onDetailSearch={handleDetailSearch}
        detailLoading={management.loading}
      />
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
            pagePermissions.create && management.categoryItems.length > 0
          }
          canUpdate={pagePermissions.update}
          canExportExcel={pagePermissions.excel}
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
    </Box>
  );
}

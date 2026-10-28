import { useMemo, useState, type RefObject } from 'react';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, Typography } from '@mui/material';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type { CommonCodeItemRow } from '../../../master/common-code/types/commonCodeManagement.types';
import type {
  DraftFormRow,
  DraftFormUserOption,
} from '../types/draftFormManagement.types';

export type DraftFormGridProps = {
  rows: DraftFormRow[];
  columns: F1GridColumn<DraftFormRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<DraftFormRow> | null>;
  onChangesChange: (changes: F1GridChanges<DraftFormRow>) => void;
};

const DRAFT_FORM_GRID_STORAGE_KEY = 'co-workflow-draft-form-grid';
const DRAFT_FORM_ACTION_PIN_MIGRATION_KEY =
  'co-workflow-draft-form-grid-template-action-pinned-v1';

function migrateDraftFormGridActionPin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (
      window.localStorage.getItem(DRAFT_FORM_ACTION_PIN_MIGRATION_KEY) === '1'
    ) {
      return false;
    }
    const storedValue = window.localStorage.getItem(
      DRAFT_FORM_GRID_STORAGE_KEY,
    );
    if (storedValue) {
      const state = JSON.parse(storedValue) as Record<string, unknown>;
      const currentPinned =
        state.pinned &&
        typeof state.pinned === 'object' &&
        !Array.isArray(state.pinned)
          ? (state.pinned as Record<string, unknown>)
          : {};
      if (!Object.hasOwn(currentPinned, 'hasDocument')) {
        state.pinned = { ...currentPinned, hasDocument: 'right' };
        window.localStorage.setItem(
          DRAFT_FORM_GRID_STORAGE_KEY,
          JSON.stringify(state),
        );
      }
    }
    window.localStorage.setItem(DRAFT_FORM_ACTION_PIN_MIGRATION_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function createDraftFormRow(): DraftFormRow {
  return {
    draftingWorkCategoryId: `new-draft-form-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cataTypeCode: '',
    codeName: '',
    categoryItemId: null,
    categoryName: '',
    regTermId: null,
    regTerm: '',
    reviewerId: null,
    reviewerName: '',
    approverId: null,
    approverName: '',
    assigneeIds: [],
    assigneeSummary: '',
    createdByName: '',
    createdAt: '',
    hasDocument: false,
    useAt: 'Y',
  };
}

export function duplicateDraftFormRow(row: DraftFormRow): DraftFormRow {
  return {
    ...row,
    draftingWorkCategoryId: `new-draft-form-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    cataTypeCode: '',
    codeName: `${row.codeName} 복사`,
    createdByName: '',
    createdAt: '',
  };
}

export function createDraftFormColumns(
  categoryItems: CommonCodeItemRow[],
  cycleItems: CommonCodeItemRow[],
  users: DraftFormUserOption[],
  canEdit: boolean,
  onOpenTemplate?: (row: DraftFormRow) => void,
): F1GridColumn<DraftFormRow>[] {
  const getCodeLabel = (items: CommonCodeItemRow[], value: unknown) =>
    items.find((item) => String(item.id) === String(value))?.itemNm ??
    String(value ?? '');
  const getUserLabel = (value: unknown) => {
    if (value == null || value === '') return '';
    const user = users.find(
      (option) => String(option.loginId) === String(value),
    );
    if (!user) return String(value);
    return user.departmentNm
      ? `${user.userNm} (${user.departmentNm})`
      : user.userNm;
  };
  const getUserOptions = (
    getValue: (user: DraftFormUserOption) => string | number,
  ) =>
    users.map((user) => ({
      value: getValue(user),
      label: user.userNm,
      avatarUrl: user.profileImage,
      positionName: user.levelNm,
      departmentName: user.departmentNm,
    }));

  return [
    {
      field: 'draftingWorkCategoryId',
      headerName: 'No',
      type: 'rownumber',
      width: 50,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
    },
    {
      field: 'cataTypeCode',
      headerName: '양식코드',
      width: 110,
      editable: false,
      align: 'center',
      pinned: 'left',
      form: { group: '기본정보', order: 1, readOnly: true },
      search: { hidden: true },
    },
    {
      field: 'codeName',
      headerName: '양식명',
      flex: 1,
      width: 300,
      editable: canEdit,
      required: true,
      pinned: 'left',
      form: { group: '기본정보', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'categoryItemId',
      headerName: '분류',
      width: 100,
      align: 'center',
      type: 'select',
      options: categoryItems.map((item) => ({
        value: Number(item.id),
        label: item.itemNm,
      })),
      renderCell: ({ value }) => getCodeLabel(categoryItems, value),
      editable: canEdit,
      required: true,
      form: { group: '기본정보', order: 3 },
      search: { label: '분류', order: 1 },
    },
    {
      field: 'regTermId',
      headerName: '등록주기',
      width: 80,
      align: 'center',
      type: 'select',
      options: cycleItems.map((item) => ({
        value: Number(item.id),
        label: item.itemNm,
      })),
      renderCell: ({ value }) => getCodeLabel(cycleItems, value),
      editable: canEdit,
      required: true,
      form: { group: '기본정보', order: 4 },
      search: { label: '등록주기', order: 2 },
    },
    {
      field: 'reviewerId',
      headerGroup: '결재자',
      headerName: '검토자',
      width: 120,
      type: 'user',
      userOptions: getUserOptions((user) => user.loginId),
      renderCell: ({ value }) => getUserLabel(value),
      onValueChange: (_row, value) => ({
        reviewerId: value === '' || value == null ? null : Number(value),
      }),
      editable: canEdit,
      form: { group: '결재자', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'approverId',
      headerGroup: '결재자',
      headerName: '승인자',
      width: 120,
      type: 'user',
      userOptions: getUserOptions((user) => user.loginId),
      renderCell: ({ value }) => getUserLabel(value),
      onValueChange: (_row, value) => ({
        approverId: value === '' || value == null ? null : Number(value),
      }),
      editable: canEdit,
      form: { group: '결재자', order: 2 },
      search: { hidden: true },
    },
    {
      field: 'assigneeIds',
      headerName: '담당자',
      width: 150,
      type: 'user',
      userOptions: getUserOptions((user) => user.userId),
      getValue: (row) => row.assigneeSummary,
      onValueChange: (_row, value) => {
        const assigneeIds = Array.isArray(value) ? value.map(String) : [];
        const names = assigneeIds.map(
          (id) => users.find((user) => user.userId === id)?.userNm ?? id,
        );
        const assigneeSummary =
          names.length === 0
            ? ''
            : names.length === 1
              ? names[0]
              : `${names[0]} 외 ${names.length - 1}명`;
        return { assigneeIds, assigneeSummary };
      },
      editable: canEdit,
      form: { group: '담당자', order: 1, multiple: true, span: 2 },
      search: { hidden: true },
    },
    {
      field: 'createdByName',
      headerName: '등록자',
      width: 80,
      align: 'center',
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'createdAt',
      headerName: '등록일시',
      align: 'center',
      editable: false,
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'useAt',
      headerName: '사용여부',
      width: 80,
      type: 'select',
      align: 'center',
      options: [
        { value: 'Y', label: '사용' },
        { value: 'N', label: '미사용' },
      ],
      editable: canEdit,
      form: { group: '기본정보', order: 5 },
      search: { label: '사용여부', order: 3 },
    },
    {
      field: 'hasDocument',
      headerName: '문서 양식',
      width: 140,
      align: 'center',
      pinned: 'right',
      getValue: () => '',
      editable: false,
      renderCell: ({ row }) => {
        if (!onOpenTemplate) {
          return (
            <Typography variant="caption" color="text.secondary">
              읽기 전용
            </Typography>
          );
        }
        const label = row.hasDocument ? '문서 수정' : '문서 작성';
        const ActionIcon = row.hasDocument
          ? EditOutlinedIcon
          : DescriptionOutlinedIcon;
        return (
          <Button
            size="small"
            aria-label={`${label}: ${row.codeName}`}
            startIcon={<ActionIcon fontSize="small" />}
            onClick={(event) => {
              event.stopPropagation();
              onOpenTemplate(row);
            }}
          >
            {label}
          </Button>
        );
      },
      form: { hidden: true },
      search: { hidden: true },
    },
  ];
}

export function DraftFormGrid({
  rows,
  columns,
  canCreate,
  canUpdate,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: DraftFormGridProps) {
  const [layoutMigrated] = useState(migrateDraftFormGridActionPin);
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '기안양식 등록' : '기안양식 수정',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? canCreate : canUpdate,
    };
  }, [canCreate, canUpdate]);

  return (
    <F1Grid
      key={layoutMigrated ? `${gridKey}-template-action` : gridKey}
      ref={gridRef}
      ariaLabel="기안양식 목록"
      storageKey={DRAFT_FORM_GRID_STORAGE_KEY}
      rows={rows}
      columns={columns}
      rowKey="draftingWorkCategoryId"
      rowFormPlugin={rowFormPlugin}
      createRow={createDraftFormRow}
      createDuplicate={duplicateDraftFormRow}
      onChangesChange={onChangesChange}
      loading={loading}
      height="100%"
      showCheckbox={false}
      canExportExcel={true}
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={canCreate}
      allowDeleteRowInContextMenu={false}
    />
  );
}

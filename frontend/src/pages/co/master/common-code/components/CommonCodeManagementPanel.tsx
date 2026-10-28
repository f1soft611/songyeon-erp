import { readOnlyColumns } from '../../../../../shared/utils/menuPermission';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  buildCommonCodeBatchPayload,
  fetchCommonCodeItems,
  saveCommonCodeBatch,
} from '../services/commonCodeManagement.service';
import Splitter from '../../../../../shared/components/Splitter';
import { UnsavedChangesConfirmDialog } from '../../../../../shared/components/UnsavedChangesConfirmDialog';
import {
  F1Grid,
  F1Tree,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
  type F1TreeRef,
} from '../../../../../shared/components/f1-grid';
import type {
  CommonCodeGroupRow,
  CommonCodeItemRow,
} from '../types/commonCodeManagement.types';

type CommonCodeManagementPanelProps = {
  groups: CommonCodeGroupRow[];
  searchQuery?: string;
  canExportExcel?: boolean;
  // 메뉴 권한(2026-10-21): 쓰기 = 셀 편집 · 오른쪽 클릭 행 추가, 삭제 = 오른쪽 클릭 행 삭제. 안 주면 true
  canWrite?: boolean;
  canDelete?: boolean;
  onGroupsSaved?: (options?: { silent?: boolean }) => Promise<void> | void;
  onSaveSuccess?: (message: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onError?: (message: string) => void;
  commonCodeGridKey?: number;
  groupsLoading?: boolean;
  initialSelectedGroupId?: string;
  onSelectedGroupChange?: (groupId: string) => void;
  initialSelectedGroupRowIds?: string[];
  initialSelectedItemRowIds?: string[];
  onGroupRowSelectionChange?: (rowIds: Array<string | number>) => void;
  onItemRowSelectionChange?: (rowIds: Array<string | number>) => void;
  initialSplitterSize?: number;
  onSplitterSizeChange?: (size: number) => void;
};

export type CommonCodeManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
  deleteSelectedRows?: () => void;
  exportCurrentRows: () => void;
  getDirtyState?: () => boolean;
};

const emptyChanges = <T extends object>(): F1GridChanges<T> => ({
  insertedRows: [],
  updatedRows: [],
  deletedRows: [],
});

function normalizeRowId(value: unknown): string {
  return String(value ?? '').trim();
}

export function getItemCodeValidationMessage(
  itemCode: unknown,
  canAutoGenerate: boolean,
): string | null {
  if (!String(itemCode ?? '').trim() && !canAutoGenerate) {
    return '상세코드는 필수입니다.';
  }
  return null;
}

export function getGroupDeleteBlockedMessage({
  blockedGroupIds,
  groups,
  itemRows,
  deletedGroupIds = [],
  deletedItemIds = [],
}: {
  blockedGroupIds: Array<string | number>;
  groups: CommonCodeGroupRow[];
  itemRows: CommonCodeItemRow[];
  deletedGroupIds?: Array<string | number>;
  deletedItemIds?: Array<string | number>;
}): string | null {
  const blockedIdSet = new Set(
    blockedGroupIds.map((value) => normalizeRowId(value)),
  );
  const deletedGroupIdSet = new Set(
    deletedGroupIds.map((value) => normalizeRowId(value)),
  );
  const deletedItemIdSet = new Set(
    deletedItemIds.map((value) => normalizeRowId(value)),
  );

  const hasChildGroup = groups.some((group) => {
    const parentGroupId = normalizeRowId(group.parentGroupId);
    const groupId = normalizeRowId(group.id);

    return (
      parentGroupId &&
      blockedIdSet.has(parentGroupId) &&
      !deletedGroupIdSet.has(groupId)
    );
  });

  const hasDetailItems = itemRows.some((item) => {
    const itemGroupId = normalizeRowId(item.groupId);
    const itemId = normalizeRowId(item.id);

    return blockedIdSet.has(itemGroupId) && !deletedItemIdSet.has(itemId);
  });

  if (hasChildGroup || hasDetailItems) {
    return '하위 그룹 또는 상세코드가 있는 그룹은 삭제할 수 없습니다.';
  }

  return null;
}

export function resolveCreatedGroupId(response: unknown): string | null {
  const candidate = (response as { item?: unknown } | null)?.item ?? response;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const source = candidate as Record<string, unknown>;
  for (const field of ['commonCodeGroupId', 'groupId', 'id']) {
    const value = source[field];
    const normalized = normalizeRowId(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function resolveCreatedGroupIdMap(
  response: unknown,
  tempGroupIds: Array<string | number | null | undefined>,
): Map<string, string> {
  const candidate = (response as { item?: unknown } | null)?.item ?? response;
  if (!candidate || typeof candidate !== 'object') {
    return new Map();
  }

  const source = candidate as Record<string, unknown>;
  const savedGroups = Array.isArray(source.groups)
    ? (source.groups as Array<Record<string, unknown>>)
    : [];
  const tempIds = tempGroupIds
    .map((value) => normalizeRowId(value))
    .filter((value) => value.startsWith('new-common-group-'));

  const result = new Map<string, string>();
  tempIds.forEach((tempId, index) => {
    const persistedGroup = savedGroups[index];
    const persistedId = persistedGroup
      ? resolveCreatedGroupId(persistedGroup)
      : null;
    if (persistedId) {
      result.set(tempId, persistedId);
    }
  });

  return result;
}

const createGroupRow = (): CommonCodeGroupRow => ({
  id: `new-common-group-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  groupCode: '',
  groupNm: '',
  parentGroupId: null,
  groupDc: '',
  sortOrder: 0,
  useAt: 'Y',
});

const createItemRow = (groupId: string): CommonCodeItemRow => ({
  id: `new-common-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  groupId,
  itemCode: '',
  itemNm: '',
  parentItemId: null,
  parentItemNm: '',
  sortOrder: 0,
  useAt: 'Y',
  itemDc: '',
});

export const groupColumns: F1GridColumn<CommonCodeGroupRow>[] = [
  {
    field: 'groupCode',
    headerName: '그룹코드',
    editable: true,
    required: true,
    width: 120,
  },
  {
    field: 'groupNm',
    headerName: '그룹명',
    editable: true,
    required: true,
    pinned: 'left',
    flex: 1,
  },
  {
    field: 'groupDc',
    headerName: '그룹 설명',
    editable: true,
    search: { span: 2 },
    flex: 1,
  },
];

const itemColumns = (
  onOpenParentPicker?: (
    row: CommonCodeItemRow,
    applyPatch: (changes: Partial<CommonCodeItemRow>) => void,
  ) => void,
): F1GridColumn<CommonCodeItemRow>[] => [
    {
      field: 'id',
      type: 'rownumber',
      width: 60,
      headerName: '순번',
      headerAlign: 'center',
      align: 'center',
      pinned: 'left',
    },
    {
      field: 'itemCode',
      headerName: '상세코드',
      editable: true,
      required: false,
      width: 140,
    },
    {
      field: 'itemNm',
      headerName: '상세코드명',
      editable: true,
      required: true,
      flex: 1,
      width: 220,
    },
    {
      field: 'parentItemNm',
      headerName: '상위코드명',
      editable: () => Boolean(onOpenParentPicker),
      width: 150,
      type: 'code',
      onOpenCodePicker: onOpenParentPicker
        ? (row, applyPatch) => {
          onOpenParentPicker(row, applyPatch);
        }
        : undefined,
    },
    {
      field: 'useAt',
      headerName: '사용여부',
      width: 100,
      type: 'checkbox',
      headerCheckbox: true,
      align: 'center',
      headerAlign: 'center',
      onValueChange: (_row, value) => ({
        useAt: Boolean(value) ? 'Y' : 'N',
      }),
    },
    {
      field: 'sortOrder',
      headerName: '정렬순서',
      editable: true,
      width: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'center',
      min: 0,
      onValueChange: (_row, value) => ({
        sortOrder: Number(value ?? 0),
      }),
    },
    {
      field: 'itemDc',
      headerName: '비고',
      editable: true,
      flex: 1,
      headerAlign: 'center',
      width: 220,
    },
  ];

export const CommonCodeManagementPanel = forwardRef<
  CommonCodeManagementPanelHandle,
  CommonCodeManagementPanelProps
>(function CommonCodeManagementPanel(
  {
    groups,
    searchQuery = '',
    canExportExcel = false,
    canWrite = true,
    canDelete = true,
    onGroupsSaved,
    onSaveSuccess,
    onDirtyChange,
    onError,
    commonCodeGridKey = 0,
    groupsLoading = false,
    initialSelectedGroupId = '',
    onSelectedGroupChange,
    initialSelectedGroupRowIds = [],
    initialSelectedItemRowIds = [],
    onGroupRowSelectionChange,
    onItemRowSelectionChange,
    initialSplitterSize = 600,
    onSplitterSizeChange,
  },
  ref,
) {
  const [selectedGroupId, setSelectedGroupId] = useState(
    initialSelectedGroupId,
  );
  const [itemRows, setItemRows] = useState<CommonCodeItemRow[]>([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState('');
  const [itemGridKey, setItemGridKey] = useState(0);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentPickerOptions, setParentPickerOptions] = useState<
    CommonCodeItemRow[]
  >([]);
  const [groupGridDirty, setGroupGridDirty] = useState(false);
  const [itemGridDirty, setItemGridDirty] = useState(false);
  const [pendingGroupId, setPendingGroupId] = useState<string>();
  const [groupSwitchDialogOpen, setGroupSwitchDialogOpen] = useState(false);
  const [_saving, setSaving] = useState(false);

  const treeRef = useRef<F1TreeRef<CommonCodeGroupRow>>(null);
  const gridRef = useRef<F1GridRef<CommonCodeItemRow>>(null);
  const parentPickerApplyRef = useRef<
    ((changes: Partial<CommonCodeItemRow>) => void) | null
  >(null);
  const itemRequestIdRef = useRef(0);
  const selectedGroupIdRef = useRef(selectedGroupId);
  const itemGridDirtyRef = useRef(false);
  const saveInFlightRef = useRef<Promise<void> | undefined>(undefined);
  const groupSelectionRestoredRef = useRef(false);
  const itemSelectionRestoredRef = useRef(false);

  useEffect(() => {
    itemSelectionRestoredRef.current = false;
  }, [selectedGroupId]);

  useEffect(() => {
    groupSelectionRestoredRef.current = false;
  }, [commonCodeGridKey]);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
    onSelectedGroupChange?.(selectedGroupId);
  }, [onSelectedGroupChange, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    return groups;
  }, [groups, searchQuery]);

  useEffect(() => {
    if (!groupSelectionRestoredRef.current) {
      const selectedIds =
        initialSelectedGroupRowIds.length > 0
          ? initialSelectedGroupRowIds
          : initialSelectedGroupId
            ? [initialSelectedGroupId]
            : [];
      if (selectedIds.length === 0) {
        groupSelectionRestoredRef.current = true;
        return undefined;
      }
      const timerId = window.setTimeout(() => {
        treeRef.current?.setSelectedRowIds(selectedIds);
        groupSelectionRestoredRef.current = true;
      }, 50);
      return () => window.clearTimeout(timerId);
    }
    return undefined;
  }, [filteredGroups, initialSelectedGroupId, initialSelectedGroupRowIds]);

  useEffect(() => {
    if (
      !itemSelectionRestoredRef.current &&
      !itemLoading &&
      initialSelectedItemRowIds.length > 0
    ) {
      const timerId = window.setTimeout(() => {
        gridRef.current?.setSelectedRowIds(initialSelectedItemRowIds);
        itemSelectionRestoredRef.current = true;
      }, 50);
      return () => window.clearTimeout(timerId);
    }
    return undefined;
  }, [initialSelectedItemRowIds, itemLoading, itemRows]);

  const loadItemRows = useCallback(
    async (groupId: string, options: { silent?: boolean } = {}) => {
      const requestId = ++itemRequestIdRef.current;
      if (!groupId || groupId.startsWith('new-common-group-')) {
        setItemRows([]);
        setItemError('');
        itemGridDirtyRef.current = false;
        setItemGridDirty(false);
        setItemGridKey((current) => current + 1);
        if (!options.silent) {
          setItemLoading(false);
        }
        return;
      }

      if (!options.silent) {
        setItemLoading(true);
      }
      setItemError('');
      try {
        const result = await fetchCommonCodeItems(groupId);
        if (
          requestId !== itemRequestIdRef.current ||
          selectedGroupIdRef.current !== groupId
        ) {
          return;
        }
        setItemRows(result);
        itemGridDirtyRef.current = false;
        setItemGridDirty(false);
        setItemGridKey((current) => current + 1);
      } catch (error) {
        if (requestId !== itemRequestIdRef.current) return;
        const message =
          error instanceof Error
            ? error.message
            : '공통코드 상세 목록을 불러오지 못했습니다.';
        setItemRows([]);
        setItemError(message);
        onError?.(message);
      } finally {
        if (requestId === itemRequestIdRef.current && !options.silent) {
          setItemLoading(false);
        }
      }
    },
    [onError],
  );

  useEffect(() => {
    if (groupsLoading) {
      return;
    }
    if (!filteredGroups.length) {
      setSelectedGroupId('');
      return;
    }
    if (selectedGroupId.startsWith('new-common-group-')) {
      return;
    }
    if (
      !filteredGroups.some(
        (group) => normalizeRowId(group.id) === normalizeRowId(selectedGroupId),
      )
    ) {
      setSelectedGroupId(String(filteredGroups[0].id));
    }
  }, [filteredGroups, groupsLoading, selectedGroupId]);

  const selectedGroup = filteredGroups.find(
    (group) => normalizeRowId(group.id) === normalizeRowId(selectedGroupId),
  );

  useEffect(() => {
    void loadItemRows(selectedGroupId);
  }, [loadItemRows, selectedGroupId]);

  const handleGroupSelection = useCallback((rowIds: Array<string | number>) => {
    const nextGroupId = rowIds[0] == null ? '' : String(rowIds[0]);
    if (!nextGroupId || nextGroupId === selectedGroupIdRef.current) return;
    if (itemGridDirtyRef.current) {
      setPendingGroupId(nextGroupId);
      setGroupSwitchDialogOpen(true);
      return;
    }
    setSelectedGroupId(nextGroupId);
  }, []);

  const handleGroupGridChanges = useCallback(
    (changes: F1GridChanges<CommonCodeGroupRow>) => {
      setGroupGridDirty(
        changes.insertedRows.length > 0 ||
        changes.updatedRows.length > 0 ||
        changes.deletedRows.length > 0,
      );
    },
    [],
  );

  const handleItemGridChanges = useCallback(
    (changes: F1GridChanges<CommonCodeItemRow>) => {
      const dirty =
        changes.insertedRows.length > 0 ||
        changes.updatedRows.length > 0 ||
        changes.deletedRows.length > 0;
      itemGridDirtyRef.current = dirty;
      setItemGridDirty(dirty);
    },
    [],
  );

  useEffect(() => {
    onDirtyChange?.(groupGridDirty || itemGridDirty);
  }, [groupGridDirty, itemGridDirty, onDirtyChange]);

  const parentGroup =
    selectedGroup && selectedGroup.parentGroupId
      ? (filteredGroups.find(
        (group) =>
          normalizeRowId(group.id) ===
          normalizeRowId(selectedGroup.parentGroupId),
      ) ?? null)
      : null;

  const openParentPicker = useCallback(
    async (
      row: CommonCodeItemRow,
      applyPatch: (changes: Partial<CommonCodeItemRow>) => void,
    ) => {
      if (!parentGroup) {
        setParentPickerOpen(false);
        return;
      }

      parentPickerApplyRef.current = applyPatch;
      try {
        const parentItems = await fetchCommonCodeItems(String(parentGroup.id));
        setParentPickerOptions(
          parentItems.filter(
            (item) => normalizeRowId(item.id) !== normalizeRowId(row.id),
          ),
        );
        setParentPickerOpen(true);
      } catch (error) {
        onError?.('상위 그룹의 상세코드를 불러오지 못했습니다.');
      }
    },
    [onError, parentGroup],
  );

  const itemGridColumns = itemColumns(
    parentGroup ? openParentPicker : undefined,
  );

  const checkGroupDeleteBlockedMessage = useCallback(
    (blockedGroupIds: Array<string | number>) => {
      const currentTreeChanges =
        treeRef.current?.getChanges() ?? emptyChanges<CommonCodeGroupRow>();
      const currentItemChanges =
        gridRef.current?.getChanges() ?? emptyChanges<CommonCodeItemRow>();

      return getGroupDeleteBlockedMessage({
        blockedGroupIds,
        groups: filteredGroups,
        itemRows,
        deletedGroupIds: currentTreeChanges.deletedRows.map((row) => row.id),
        deletedItemIds: currentItemChanges.deletedRows.map((row) => row.id),
      });
    },
    [filteredGroups, itemRows],
  );

  const isGroupDeleteDisabled = useCallback(
    (group: CommonCodeGroupRow) => {
      const groupId = normalizeRowId(group.id);
      if (!groupId) return false;

      const currentTreeChanges =
        treeRef.current?.getChanges() ?? emptyChanges<CommonCodeGroupRow>();
      const currentItemChanges =
        gridRef.current?.getChanges() ?? emptyChanges<CommonCodeItemRow>();
      const deletedGroupIds = new Set(
        currentTreeChanges.deletedRows.map((row) => normalizeRowId(row.id)),
      );
      const deletedItemIds = new Set(
        currentItemChanges.deletedRows.map((row) => normalizeRowId(row.id)),
      );

      const hasChildGroup = filteredGroups.some(
        (candidate) =>
          normalizeRowId(candidate.parentGroupId) === groupId &&
          !deletedGroupIds.has(normalizeRowId(candidate.id)),
      );
      const hasDetailItems = itemRows.some(
        (item) =>
          normalizeRowId(item.groupId) === groupId &&
          !deletedItemIds.has(normalizeRowId(item.id)),
      );

      return hasChildGroup || hasDetailItems;
    },
    [filteredGroups, itemRows],
  );

  const saveCurrentChanges = useCallback(() => {
    if (saveInFlightRef.current) return saveInFlightRef.current;

    const savePromise = (async () => {
      setSaving(true);
      const groupChanges =
        treeRef.current?.getChanges() ?? emptyChanges<CommonCodeGroupRow>();
      const groupId = selectedGroupIdRef.current;
      const itemChanges =
        gridRef.current?.getChanges() ?? emptyChanges<CommonCodeItemRow>();

      const hasGroupChanges =
        groupChanges.insertedRows.length > 0 ||
        groupChanges.updatedRows.length > 0 ||
        groupChanges.deletedRows.length > 0;
      const hasItemChanges =
        itemChanges.insertedRows.length > 0 ||
        itemChanges.updatedRows.length > 0 ||
        itemChanges.deletedRows.length > 0;

      if (!hasGroupChanges && !hasItemChanges) {
        return;
      }

      try {
        const rowsToValidate = [
          ...groupChanges.insertedRows,
          ...groupChanges.updatedRows,
          ...itemChanges.insertedRows,
          ...itemChanges.updatedRows,
        ];

        const deletedGroupIds = groupChanges.deletedRows
          .map((row) => normalizeRowId(row.id))
          .filter(Boolean);
        const deletedItemIds = itemChanges.deletedRows
          .map((row) => normalizeRowId(row.id))
          .filter(Boolean);
        const autoGeneratedItemIds = new Set(
          itemChanges.insertedRows.map((row) => normalizeRowId(row.id)),
        );

        if (deletedGroupIds.length > 0) {
          const blockedMessage = getGroupDeleteBlockedMessage({
            blockedGroupIds: deletedGroupIds,
            groups: filteredGroups,
            itemRows,
            deletedGroupIds,
            deletedItemIds,
          });

          if (blockedMessage) {
            throw new Error(blockedMessage);
          }
        }

        for (const row of rowsToValidate) {
          if ('groupCode' in row) {
            if (!String(row.groupCode ?? '').trim()) {
              throw new Error('그룹 코드는 필수입니다.');
            }
            if (!String(row.groupNm ?? '').trim()) {
              throw new Error('그룹명은 필수입니다.');
            }
          }
          if ('itemCode' in row) {
            const itemCodeError = getItemCodeValidationMessage(
              row.itemCode,
              autoGeneratedItemIds.has(normalizeRowId(row.id)),
            );
            if (itemCodeError) {
              throw new Error(itemCodeError);
            }
            if (!String(row.itemNm ?? '').trim()) {
              throw new Error('상세코드명은 필수입니다.');
            }
          }
        }

        const batchPayload = buildCommonCodeBatchPayload({
          groups: groupChanges,
          items: itemChanges,
        });

        const response = await saveCommonCodeBatch(batchPayload);
        const createdGroupIdMap = resolveCreatedGroupIdMap(
          response,
          groupChanges.insertedRows.map((row) => row.id),
        );
        const persistedGroupId =
          (groupId && createdGroupIdMap.get(String(groupId))) ?? groupId;

        // Clear dirty state before switching the selected group ID so that
        // the group-refresh side effects below can't be misread as an
        // in-progress (unsaved) group switch and pop the confirm dialog.
        setGroupGridDirty(false);
        setItemGridDirty(false);
        itemGridDirtyRef.current = false;

        if (
          persistedGroupId &&
          persistedGroupId !== selectedGroupIdRef.current
        ) {
          selectedGroupIdRef.current = persistedGroupId;
          setSelectedGroupId(persistedGroupId);
        }

        await onGroupsSaved?.();

        if (
          persistedGroupId &&
          !persistedGroupId.startsWith('new-common-group-')
        ) {
          await loadItemRows(persistedGroupId, { silent: true });
        }

        onSaveSuccess?.('공통코드를 저장했습니다.');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '공통코드 저장에 실패했습니다.';
        onError?.(message);
        throw error;
      } finally {
        setSaving(false);
      }
    })();

    saveInFlightRef.current = savePromise;
    void savePromise.then(
      () => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = undefined;
        }
      },
      () => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = undefined;
        }
      },
    );
    return savePromise;
  }, [
    filteredGroups,
    itemRows,
    loadItemRows,
    onError,
    onGroupsSaved,
    onSaveSuccess,
  ]);

  const closeGroupSwitchDialog = useCallback(() => {
    setGroupSwitchDialogOpen(false);
    setPendingGroupId(undefined);
    treeRef.current?.clearSelection();
  }, []);

  const discardItemsAndMove = useCallback(() => {
    if (!pendingGroupId) return;
    ++itemRequestIdRef.current;
    itemGridDirtyRef.current = false;
    setGroupGridDirty(false);
    setItemGridDirty(false);
    setItemGridKey((current) => current + 1);
    const nextGroupId = pendingGroupId;
    closeGroupSwitchDialog();
    selectedGroupIdRef.current = nextGroupId;
    setSelectedGroupId(nextGroupId);
  }, [closeGroupSwitchDialog, pendingGroupId]);

  const exportCurrentRows = useCallback(() => {
    const rows = gridRef.current?.getActiveRows() ?? [];
    if (!rows.length) return;

    const csv = [
      itemGridColumns.map((column) => column.headerName).join(','),
      ...rows.map((row) =>
        itemGridColumns
          .map((column) => {
            const value = row[column.field as keyof CommonCodeItemRow];
            const stringValue = value == null ? '' : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'common-code-export.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [itemGridColumns]);

  useImperativeHandle(
    ref,
    () => ({
      saveCurrentChanges,
      deleteSelectedRows: () => {
        gridRef.current?.deleteSelectedRows();
      },
      exportCurrentRows,
      getDirtyState: () => groupGridDirty || itemGridDirty,
    }),
    [exportCurrentRows, groupGridDirty, itemGridDirty, saveCurrentChanges],
  );

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Splitter
        direction="horizontal"
        mobileMode="stacked"
        mobileBreakpoint={768}
        minSize={400}
        maxSize={1000}
        initialSize={initialSplitterSize}
        onSizeChange={onSplitterSizeChange}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <Card
          sx={{
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              '&:last-child': { pb: 1 },
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 1.2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                공통코드 그룹 관리
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <F1Tree
                key={commonCodeGridKey}
                ref={treeRef}
                rows={filteredGroups}
                columns={readOnlyColumns(groupColumns, canWrite)}
                rowKey="id"
                parentKey="parentGroupId"
                treeColumn="groupNm"
                height="100%"
                storageKey="menu-com-common-code-tree"
                defaultExpandAll
                showCheckbox={false}
                createRow={createGroupRow}
                loading={groupsLoading}
                allowAddRootInContextMenu={canWrite}
                allowAddRowInContextMenu={canWrite}
                allowDuplicateRowInContextMenu={false}
                allowDeleteRowInContextMenu={canDelete}
                deleteMenuDisabled={Boolean(
                  selectedGroup && isGroupDeleteDisabled(selectedGroup),
                )}
                ariaLabel="공통코드 그룹 트리"
                initialSelectedRowIds={
                  initialSelectedGroupRowIds.length > 0
                    ? initialSelectedGroupRowIds
                    : initialSelectedGroupId
                      ? [initialSelectedGroupId]
                      : []
                }
                onSelectionChange={(rowIds) => {
                  handleGroupSelection(rowIds);
                  if (groupSelectionRestoredRef.current && rowIds.length > 0) {
                    onGroupRowSelectionChange?.(rowIds);
                  }
                }}
                onChangesChange={handleGroupGridChanges}
                isDeleteDisabled={isGroupDeleteDisabled}
                onDeleteBlocked={(blockedIds) => {
                  const message = checkGroupDeleteBlockedMessage(blockedIds);
                  if (message) {
                    onError?.(message);
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              '&:last-child': { pb: 1 },
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 1.2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                공통코드 상세 관리
              </Typography>
              {selectedGroup ? (
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '60%',
                    textAlign: 'right',
                  }}
                >
                  선택 그룹: {selectedGroup.groupNm}
                </Typography>
              ) : (
                <Typography variant="subtitle2" color="text.secondary">
                  선택 그룹이 없습니다
                </Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              {itemError ? (
                <Typography variant="body2" color="error.main">
                  {itemError}
                </Typography>
              ) : (
                <F1Grid
                  key={itemGridKey}
                  ref={gridRef}
                  rows={itemRows}
                  columns={readOnlyColumns(itemGridColumns, canWrite)}
                  rowKey="id"
                  ariaLabel="공통코드 상세코드"
                  height="100%"
                  storageKey="menu-com-common-code-grid"
                  canExportExcel={canExportExcel}
                  showCheckbox={false}
                  createRow={() => createItemRow(selectedGroupId)}
                  initialSelectedRowIds={initialSelectedItemRowIds}
                  loading={itemLoading}
                  allowAddRowInContextMenu={canWrite}
                  allowDeleteRowInContextMenu={canDelete}
                  allowDuplicateRowInContextMenu={false}
                  onChangesChange={handleItemGridChanges}
                  onSelectionChange={(rowIds) => {
                    if (itemSelectionRestoredRef.current) {
                      onItemRowSelectionChange?.(rowIds);
                    }
                  }}
                />
              )}
            </Box>
            <Dialog
              open={parentPickerOpen}
              onClose={() => setParentPickerOpen(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>상위코드 선택</DialogTitle>
              <DialogContent dividers sx={{ p: 0 }}>
                <List disablePadding>
                  {parentPickerOptions.length > 0 ? (
                    parentPickerOptions.map((item) => (
                      <ListItemButton
                        key={item.id}
                        onClick={() => {
                          parentPickerApplyRef.current?.({
                            parentItemId: item.id,
                            parentItemNm: item.itemNm,
                          });
                          setParentPickerOpen(false);
                        }}
                      >
                        <ListItemText
                          primary={item.itemNm}
                          secondary={item.itemCode}
                        />
                      </ListItemButton>
                    ))
                  ) : (
                    <ListItemText
                      primary="선택 가능한 상위코드가 없습니다."
                      sx={{ px: 2, py: 2 }}
                    />
                  )}
                </List>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </Splitter>
      <UnsavedChangesConfirmDialog
        open={Boolean(groupSwitchDialogOpen && pendingGroupId)}
        title="저장하지 않은 변경사항"
        description="현재 그룹의 변경사항을 유지하지 않고 다른 그룹으로 이동하시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={closeGroupSwitchDialog}
        onContinue={discardItemsAndMove}
      />
    </Box>
  );
});

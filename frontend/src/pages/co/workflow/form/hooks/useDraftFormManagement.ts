import { useCallback, useEffect, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import type { CommonCodeItemRow } from '../../../master/common-code/types/commonCodeManagement.types';
import {
  createDraftForm,
  fetchDraftFormOptions,
  fetchDraftForms,
  updateDraftForm,
} from '../services/draftFormManagement.service';
import type {
  DraftFormFilters,
  DraftFormPayload,
  DraftFormRow,
  DraftFormUserOption,
} from '../types/draftFormManagement.types';

function toPayload(
  row: DraftFormRow,
  useAt: 'Y' | 'N' = row.useAt,
): DraftFormPayload {
  if (row.categoryItemId == null || row.regTermId == null) {
    throw new Error('분류와 등록주기를 선택해 주세요.');
  }
  return {
    cataTypeCode: row.cataTypeCode.trim(),
    codeName: row.codeName.trim(),
    categoryItemId: Number(row.categoryItemId),
    regTermId: Number(row.regTermId),
    reviewerId: row.reviewerId == null ? null : Number(row.reviewerId),
    approverId: row.approverId == null ? null : Number(row.approverId),
    assigneeIds: row.assigneeIds.map(String),
    useAt,
  };
}

export function useDraftFormManagement() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<DraftFormRow[]>([]);
  const [categoryItems, setCategoryItems] = useState<CommonCodeItemRow[]>([]);
  const [cycleItems, setCycleItems] = useState<CommonCodeItemRow[]>([]);
  const [users, setUsers] = useState<DraftFormUserOption[]>([]);
  const [categoryGroupId, setCategoryGroupId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<DraftFormFilters>({});

  const loadRows = useCallback(
    async (
      filters: DraftFormFilters = {},
      options: { quiet?: boolean } = {},
    ) => {
      if (!options.quiet) setLoading(true);
      setError('');
      try {
        setRows(await fetchDraftForms(filters));
        return true;
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : '기안양식 목록을 불러오지 못했습니다.',
        );
        return false;
      } finally {
        if (!options.quiet) setLoading(false);
      }
    },
    [],
  );

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsLoaded(false);
    try {
      const options = await fetchDraftFormOptions();
      setCategoryGroupId(options.categoryGroup?.id ?? '');
      setCategoryItems(options.categoryItems);
      setCycleItems(options.cycleItems);
      setUsers(options.users);
      setOptionsLoaded(true);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : '공통코드 또는 사용자 목록을 불러오지 못했습니다.',
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadRows({}), loadOptions()]);
  }, [loadOptions, loadRows]);

  const applyFilters = useCallback(
    (filters: DraftFormFilters) => {
      setAppliedFilters(filters);
      void loadRows(filters);
    },
    [loadRows],
  );

  const discardChanges = useCallback(() => {
    setHasChanges(false);
    setGridKey((current) => current + 1);
  }, []);

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<DraftFormRow>) => {
      setHasChanges(
        changes.insertedRows.length > 0 ||
          changes.updatedRows.length > 0 ||
          changes.deletedRows.length > 0,
      );
    },
    [],
  );

  const saveChanges = useCallback(
    async (changes: F1GridChanges<DraftFormRow>) => {
      if (
        !changes.insertedRows.length &&
        !changes.updatedRows.length &&
        !changes.deletedRows.length
      )
        return;
      setSaving(true);
      setError('');
      try {
        for (const row of changes.insertedRows) {
          await createDraftForm(toPayload(row));
        }
        for (const row of changes.updatedRows) {
          await updateDraftForm(
            Number(row.draftingWorkCategoryId),
            toPayload(row),
          );
        }
        for (const row of changes.deletedRows) {
          await updateDraftForm(
            Number(row.draftingWorkCategoryId),
            toPayload(row, 'N'),
          );
        }
        const refreshed = await loadRows(appliedFilters, { quiet: true });
        if (!refreshed) return;
        setHasChanges(false);
        setGridKey((current) => current + 1);
        showSuccess('기안양식을 저장했습니다.');
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : '기안양식을 저장하지 못했습니다.',
        );
      } finally {
        setSaving(false);
      }
    },
    [appliedFilters, loadRows, showSuccess],
  );

  return {
    rows,
    categoryItems,
    cycleItems,
    users,
    categoryGroupId,
    error,
    setError,
    loading,
    optionsLoading,
    optionsLoaded,
    saving,
    hasChanges,
    setHasChanges,
    gridKey,
    discardChanges,
    appliedFilters,
    loadRows,
    loadOptions,
    applyFilters,
    handleChangesChange,
    saveChanges,
  };
}

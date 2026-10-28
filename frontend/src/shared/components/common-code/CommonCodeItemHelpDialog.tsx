import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import { UnsavedChangesConfirmDialog } from '../UnsavedChangesConfirmDialog';
import { CommonDialog } from '../CommonDialog';
import { useNotification } from '../../context/NotificationContext';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../f1-grid';
import type { CommonCodeItemRow } from '../../../pages/co/master/common-code/types/commonCodeManagement.types';

type ItemSavePayload = Pick<
  CommonCodeItemRow,
  'itemCode' | 'itemNm' | 'itemDc' | 'sortOrder' | 'useAt'
>;

type CommonCodeItemHelpDialogProps = {
  open: boolean;
  groupId: string;
  items: CommonCodeItemRow[];
  canEdit: boolean;
  dialogTitle?: string;
  gridAriaLabel?: string;
  onClose: () => void;
  onCreateItem: (payload: ItemSavePayload) => Promise<unknown>;
  onUpdateItem: (itemId: string, payload: ItemSavePayload) => Promise<unknown>;
  onReload: () => Promise<void>;
};

function createItemRow(groupId: string): CommonCodeItemRow {
  return {
    id: `new-common-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    groupId,
    itemCode: '',
    itemNm: '',
    parentItemId: null,
    parentItemNm: '',
    sortOrder: 0,
    useAt: 'Y',
    itemDc: '',
  };
}

function toSavePayload(row: CommonCodeItemRow): ItemSavePayload {
  return {
    itemCode: row.itemCode.trim(),
    itemNm: row.itemNm.trim(),
    itemDc: row.itemDc.trim(),
    sortOrder: Number(row.sortOrder) || 0,
    useAt: row.useAt,
  };
}

export function CommonCodeItemHelpDialog({
  open,
  groupId,
  items,
  canEdit,
  dialogTitle = '기안양식 분류 설정',
  gridAriaLabel = '기안양식 분류 목록',
  onClose,
  onCreateItem,
  onUpdateItem,
  onReload,
}: CommonCodeItemHelpDialogProps) {
  const { showSuccess } = useNotification();
  const gridRef = useRef<F1GridRef<CommonCodeItemRow>>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const columns = useMemo<F1GridColumn<CommonCodeItemRow>[]>(() => {
    return [
      {
        field: 'id',
        headerName: 'No',
        type: 'rownumber',
        width: 50,
        align: 'center',
        pinned: 'left',
        search: { hidden: true },
      },
      {
        field: 'itemCode',
        headerName: '상세코드',
        width: 100,
        editable: false,
        align: 'center',
        required: false,
      },
      {
        field: 'itemNm',
        headerName: '상세코드명',
        flex: 1,
        // width: 100,
        editable: canEdit,
        required: true,
      },
      {
        field: 'sortOrder',
        headerName: '정렬순서',
        width: 80,
        align: 'right',
        type: 'number',
        min: 0,
        editable: canEdit,
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
      },
      {
        field: 'itemDc',
        headerName: '비고',
        flex: 1,
        // width: 100,
        editable: canEdit,
        form: { span: 2 },
      },
    ];
  }, [canEdit]);

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<CommonCodeItemRow>) => {
      setHasChanges(
        changes.insertedRows.length > 0 || changes.updatedRows.length > 0,
      );
    },
    [],
  );

  const handleSave = async () => {
    if (!canEdit || !gridRef.current || !hasChanges) return;
    if (!gridRef.current.validate()) {
      setError('필수 입력 항목을 확인해 주세요.');
      return;
    }
    const changes = gridRef.current.getChanges();
    setSaving(true);
    setError('');
    try {
      for (const row of changes.insertedRows) {
        await onCreateItem(toSavePayload(row));
      }
      for (const row of changes.updatedRows) {
        await onUpdateItem(row.id, toSavePayload(row));
      }
      await onReload();
      showSuccess('공통코드를 저장했습니다.');
      setHasChanges(false);
      setGridKey((current) => current + 1);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : '분류 항목 저장에 실패했습니다.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    if (!groupId) return;
    gridRef.current?.addRow();
  };

  const requestClose = () => {
    if (saving) return;
    if (hasChanges) {
      setCloseConfirmOpen(true);
      return;
    }
    onClose();
  };

  const cancelClose = () => setCloseConfirmOpen(false);

  const discardAndClose = () => {
    setCloseConfirmOpen(false);
    setHasChanges(false);
    setGridKey((current) => current + 1);
    onClose();
  };

  return (
    <>
      <CommonDialog
        open={open}
        onClose={requestClose}
        title={dialogTitle}
        size="lg"
        bodyMode="fill"
        paperHeight="60vh"
        fullScreenOnMobile
        actions={
          <>
            {canEdit && (
              <Button
                variant="contained"
                startIcon={
                  saving ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : undefined
                }
                sx={{
                  borderRadius: 1.5,
                  fontWeight: 700,
                  minWidth: 96,
                  px: 2.5,
                }}
                disabled={!hasChanges || saving}
                onClick={() => void handleSave()}
              >
                저장
              </Button>
            )}
            <Button onClick={requestClose} disabled={saving}>
              취소
            </Button>
          </>
        }
      >
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, height: '100%' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {canEdit && (
              <Button
                startIcon={<AddIcon />}
                onClick={addItem}
                disabled={!groupId || saving}
              >
                분류 추가
              </Button>
            )}
          </Box>
          <Box
            sx={{
              flex: 1,
              height: '100%',
              minHeight: 0,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <F1Grid
              key={gridKey}
              ref={gridRef}
              ariaLabel={gridAriaLabel}
              rows={items}
              columns={columns}
              rowKey="id"
              storageKey="co-workflow-draft-form-category-items-grid"
              showCheckbox={false}
              createRow={() => createItemRow(groupId)}
              createDuplicate={(row) => ({
                ...row,
                id: createItemRow(groupId).id,
                itemCode: '',
                itemNm: `${row.itemNm} 복사`,
              })}
              onChangesChange={handleChangesChange}
              height="100%"
              allowDuplicateRowInContextMenu={canEdit}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Stack>
      </CommonDialog>
      <UnsavedChangesConfirmDialog
        open={closeConfirmOpen}
        title="저장하지 않은 변경사항"
        description="분류 변경사항을 버리고 설정 창을 닫으시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={cancelClose}
        onContinue={discardAndClose}
      />
    </>
  );
}

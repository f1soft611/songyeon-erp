import { Box, Button, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, SyntheticEvent } from 'react';
import { CommonDialog } from '../../CommonDialog';
import type {
  F1GridColumn,
  F1GridFormMode,
  F1GridRowFormPlugin,
  F1GridValidationError,
} from '../types/grid.types';
import { getGridRowId } from '../utils/grid.utils';
import {
  createGridValidationContext,
  validateGridRow,
} from '../validation/GridValidation';
import { GridFormField } from './GridFormField';
import {
  buildGridFormSections,
  isGridFormFieldDisabled,
  isGridFormFieldReadOnly,
} from './GridFormModel';

export type F1GridFormModalProps<T extends object> = {
  open: boolean;
  mode: F1GridFormMode;
  row: T;
  originalRow?: T;
  columns: F1GridColumn<T>[];
  rowKey: keyof T;
  validationRows?: T[];
  plugin: F1GridRowFormPlugin<T>;
  externalErrors?: Record<string, string>;
  onCancel: () => void;
  onApply: (draftRow: T) => void;
  onDraftChange?: (fields: string[]) => void;
  onValidationErrors?: (errors: F1GridValidationError[]) => void;
};

export function F1GridFormModal<T extends object>({
  open,
  mode,
  row,
  originalRow,
  columns,
  rowKey,
  validationRows = [],
  plugin,
  externalErrors = {},
  onCancel,
  onApply,
  onDraftChange,
  onValidationErrors,
}: F1GridFormModalProps<T>) {
  const fieldRefs = useRef(new Map<string, HTMLDivElement>());
  const [draftRow, setDraftRow] = useState<T>(() => ({ ...row }));
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [focusRequest, setFocusRequest] = useState<{ field: string }>();

  useEffect(() => {
    if (!open) return;

    setDraftRow({ ...row });
    setValidationErrors({});
    setFocusRequest(undefined);
  }, [open, row]);

  useEffect(() => {
    if (!focusRequest) return;

    const field = fieldRefs.current.get(focusRequest.field);
    const input = field?.querySelector<HTMLElement>(
      'input, textarea, [role="combobox"]',
    );
    input?.focus();
  }, [focusRequest]);

  const sections = buildGridFormSections(columns, draftRow);
  const includedColumns = sections.flatMap((section) =>
    section.fields.map((field) => ({
      ...field.column,
      headerName: field.label,
    })),
  );
  const errors = { ...validationErrors, ...externalErrors };
  const context = { mode, row: draftRow };
  const title =
    plugin.getTitle?.(context) ??
    (mode === 'create' ? '신규 등록' : '정보 수정');
  const descriptionRow = originalRow ?? draftRow;
  const targetColumn = columns.find(
    (column) => column.form?.targetField !== undefined,
  );
  const targetField = (targetColumn?.form?.targetField ?? rowKey) as keyof T;
  const targetLabel = targetColumn?.form?.targetLabel ?? '대상';
  const targetValue = descriptionRow[targetField];
  const defaultDescription =
    mode === 'edit' && targetValue !== undefined && targetValue !== null
      ? `${targetLabel}: ${String(targetValue)}`
      : undefined;
  const description = plugin.getDescription?.(context) ?? defaultDescription;

  const patchDraft = (patch: Partial<T>) => {
    setDraftRow((current) => ({ ...current, ...patch }));
    const patchedFields = Object.keys(patch);
    if (patchedFields.length === 0) return;
    onDraftChange?.(patchedFields);
    setValidationErrors((current) => {
      const nextErrors = { ...current };
      patchedFields.forEach((field) => delete nextErrors[field]);
      return nextErrors;
    });
  };

  const applyDraft = () => {
    const validationContext = createGridValidationContext(
      validationRows,
      includedColumns,
      rowKey,
    );
    const nextValidationErrors = validateGridRow(
      draftRow,
      includedColumns,
      validationContext,
    );
    const nextErrors = { ...nextValidationErrors, ...externalErrors };
    const firstInvalidField = includedColumns
      .map((column) => String(column.field))
      .find((field) => Boolean(nextErrors[field]));

    setValidationErrors(nextValidationErrors);
    onValidationErrors?.(
      Object.entries(nextErrors).map(([field, message]) => ({
        rowId: getGridRowId(draftRow, rowKey),
        field,
        message,
      })),
    );
    if (firstInvalidField) {
      setFocusRequest({ field: firstInvalidField });
      return;
    }

    const appliedDraft = { ...draftRow };
    const shouldContinue = plugin.onBeforeApply?.({
      mode,
      originalRow,
      draftRow: appliedDraft,
    });
    if (shouldContinue === false) return;

    onApply(appliedDraft);
  };

  const stopGridEventPropagation = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <CommonDialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="lg"
      fullScreenOnMobile
      dialogProps={{
        onContextMenu: stopGridEventPropagation,
        onCopy: stopGridEventPropagation,
        onKeyDown: stopGridEventPropagation,
        onPaste: stopGridEventPropagation,
      }}
      footerStart={
        <Typography
          color="text.secondary"
          sx={{ fontSize: '0.78rem', fontWeight: 500 }}
          variant="caption"
        >
          적용 후 화면의 저장 버튼으로 최종 저장됩니다.
        </Typography>
      }
      actions={
        <>
          <Button
            onClick={applyDraft}
            sx={{
              borderRadius: 1.5,
              fontWeight: 700,
              minWidth: 96,
              px: 2.5,
            }}
            variant="contained"
          >
            적용
          </Button>
          <Button
            onClick={onCancel}
            sx={{
              borderRadius: 1.5,
              fontWeight: 600,
              px: 2,
            }}
          >
            취소
          </Button>
        </>
      }
    >
      <Box data-testid="f1-grid-form-content">
        <Box
          data-testid="f1-grid-form-grid"
          style={{ display: 'grid' }}
          sx={{
            gap: 1.5,
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            mt: 1,
          }}
        >
          {sections.map((section) => (
            <Box
              component="section"
              key={section.group}
              sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderLeft: 2,
                borderLeftColor: 'primary.main',
                borderRadius: '10px',
                boxShadow: '0 1px 0 rgba(15, 23, 42, 0.03)',
                display: 'grid',
                gap: 1.15,
                gridColumn: '1 / -1',
                gridTemplateColumns: 'subgrid',
                p: 1.5,
              }}
            >
              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  gridColumn: '1 / -1',
                  pb: 0.75,
                }}
              >
                <Typography
                  component="h3"
                  sx={{
                    color: 'text.primary',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                  variant="subtitle2"
                >
                  {section.group}
                </Typography>
              </Box>
              {section.fields.map((field) => {
                const fieldName = String(field.field);
                const smSpan = Math.min(field.span, 2);
                const fieldStyle = {
                  '--f1-form-span-xs': 1,
                  '--f1-form-span-sm': smSpan,
                  '--f1-form-span-lg': field.span,
                } as CSSProperties;
                const renderColumn = {
                  ...field.column,
                  headerName: field.label,
                };

                return (
                  <Box
                    data-testid={`f1-grid-form-field-${fieldName}`}
                    data-form-field="true"
                    data-field={fieldName}
                    key={fieldName}
                    ref={(element: HTMLDivElement | null) => {
                      if (element) fieldRefs.current.set(fieldName, element);
                      else fieldRefs.current.delete(fieldName);
                    }}
                    id={`f1-grid-form-field-${fieldName}`}
                    style={fieldStyle}
                    sx={{
                      gridColumn: {
                        xs: 'span var(--f1-form-span-xs)',
                        sm: 'span var(--f1-form-span-sm)',
                        lg: 'span var(--f1-form-span-lg)',
                      },
                      minWidth: 0,
                    }}
                  >
                    <GridFormField
                      column={renderColumn}
                      row={draftRow}
                      mode={mode}
                      value={draftRow[field.field]}
                      readOnly={isGridFormFieldReadOnly(
                        field.column,
                        draftRow,
                        mode,
                      )}
                      disabled={isGridFormFieldDisabled(
                        field.column,
                        draftRow,
                        mode,
                      )}
                      error={errors[fieldName]}
                      onPatch={patchDraft}
                    />
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </CommonDialog>
  );
}

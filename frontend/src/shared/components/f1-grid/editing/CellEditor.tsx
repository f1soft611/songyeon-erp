import type { KeyboardEvent } from 'react';
import type { F1GridColumn, F1GridDraftValue } from '../types/grid.types';
import { DateEditor } from './DateEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor } from './SelectEditor';
import { TextEditor } from './TextEditor';
import { CodePickerEditor } from './CodePickerEditor';
import { AutocompleteEditor } from './AutocompleteEditor';
import { CurrencyEditor } from './CurrencyEditor';
import { DateTimeEditor } from './DateTimeEditor';
import { DecimalEditor } from './DecimalEditor';
import { TimeEditor } from './TimeEditor';
import { UserSelectEditor } from './UserSelectEditor';

type CellEditorProps<T extends object> = {
  column: F1GridColumn<T>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: unknown) => void;
  userValue: F1GridDraftValue;
  userAnchorEl?: HTMLElement | null;
  onUserChange: (value: F1GridDraftValue) => void;
  onCommitEdit: () => void;
  onStopEdit: () => void;
  onCodePick: () => void;
};

export function CellEditor<T extends object>({
  column,
  value,
  onChange,
  onKeyDown,
  onSelectChange,
  userValue,
  userAnchorEl,
  onUserChange,
  onCommitEdit,
  onStopEdit,
  onCodePick,
}: CellEditorProps<T>) {
  const selectOnFocus = column.selectOnFocus ?? true;

  if (column.type === 'user')
    return (
      <UserSelectEditor
        value={userValue}
        options={column.userOptions ?? []}
        multiple={Boolean(column.form?.multiple)}
        autoFocus
        compact
        anchorEl={userAnchorEl}
        label={column.headerName}
        onChange={(nextValue) => {
          if (column.form?.multiple) onUserChange(nextValue);
          else onSelectChange(nextValue);
        }}
        onCommit={onCommitEdit}
        onKeyDown={onKeyDown}
      />
    );

  if (column.type === 'code') return <CodePickerEditor onPick={onCodePick} />;
  if (column.type === 'autocomplete')
    return (
      <AutocompleteEditor
        value={value}
        options={column.options ?? []}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelectChange={onSelectChange}
        selectOnFocus={selectOnFocus}
      />
    );
  if (column.type === 'currency')
    return (
      <CurrencyEditor
        value={value}
        decimalPlaces={column.decimalPlaces}
        onChange={onChange}
        onKeyDown={onKeyDown}
        selectOnFocus={selectOnFocus}
      />
    );
  if (column.type === 'decimal')
    return (
      <DecimalEditor
        value={value}
        decimalPlaces={column.decimalPlaces}
        onChange={onChange}
        onKeyDown={onKeyDown}
        selectOnFocus={selectOnFocus}
      />
    );
  if (column.type === 'datetime')
    return (
      <DateTimeEditor
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        selectOnFocus={selectOnFocus}
      />
    );
  if (column.type === 'time')
    return (
      <TimeEditor
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        selectOnFocus={selectOnFocus}
      />
    );
  if (column.type === 'date')
    return (
      <DateEditor
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        selectOnFocus={selectOnFocus}
      />
    );
  if (column.type === 'number')
    return (
      <NumberEditor
        value={value}
        decimalPlaces={column.decimalPlaces}
        onChange={onChange}
        onKeyDown={onKeyDown}
        selectOnFocus={selectOnFocus}
      />
    );
  if (column.type === 'select')
    return (
      <SelectEditor
        value={value}
        options={column.options ?? []}
        selectOptionIcon={column.selectOptionIcon}
        onChange={onSelectChange}
        onClose={onStopEdit}
      />
    );
  return (
    <TextEditor
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      selectOnFocus={selectOnFocus}
      inputFormat={column.inputFormat}
      sanitizeInput={column.sanitizeInput}
    />
  );
}

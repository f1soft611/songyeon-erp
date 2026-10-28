import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { DateEditor, normalizeDateInput } from './f1-grid/editing/DateEditor';
import { useF1GridFormattedInput } from './f1-grid/editing/useF1GridFormattedInput';
import type {
  PageSearchField,
  PageSearchFieldValue,
} from './page-search/searchFields';

type SearchRenderBlock =
  | { group: string; fields: PageSearchField[] }
  | { field: PageSearchField };

const EMPTY_SEARCH_VALUES: Record<string, PageSearchFieldValue> = {};

type PageSearchTextFieldProps = {
  field: PageSearchField;
  value: PageSearchFieldValue;
  onChange: (value: string) => void;
};

function PageSearchTextField({
  field,
  value,
  onChange,
}: PageSearchTextFieldProps) {
  const inputValue =
    value == null || typeof value === 'object' ? '' : String(value);
  const { inputRef, handleChange } = useF1GridFormattedInput({
    value: inputValue,
    inputFormat: field.inputFormat,
    sanitizeInput: field.sanitizeInput,
    onChange,
  });

  return (
    <TextField
      fullWidth
      size="small"
      margin="none"
      type={
        ['number', 'decimal', 'currency'].includes(field.type)
          ? 'number'
          : 'text'
      }
      label={field.label}
      value={inputValue}
      inputRef={inputRef}
      onChange={handleChange}
      slotProps={{ htmlInput: { 'aria-label': field.label } }}
    />
  );
}

function groupSearchFields(fields: PageSearchField[]): SearchRenderBlock[] {
  const blocks: SearchRenderBlock[] = [];

  fields.forEach((field) => {
    if (!field.group) {
      blocks.push({ field });
      return;
    }

    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && 'group' in lastBlock && lastBlock.group === field.group) {
      lastBlock.fields.push(field);
      return;
    }

    blocks.push({ group: field.group, fields: [field] });
  });

  return blocks;
}

export type PageSearchAreaProps = {
  children?: ReactNode;
  searchField?: ReactNode;
  onDefaultSearch?: () => void;
  detailFields?: PageSearchField[];
  detailValues?: Record<string, PageSearchFieldValue>;
  defaultValues?: Record<string, PageSearchFieldValue>;
  onDetailValuesChange?: (values: Record<string, PageSearchFieldValue>) => void;
  onDetailSearch?: (values: Record<string, PageSearchFieldValue>) => void;
  onDetailReset?: (values: Record<string, PageSearchFieldValue>) => void;
  onDetailClose?: () => void;
  detailLoading?: boolean;
};

function getFieldValue(
  values: Record<string, PageSearchFieldValue>,
  field: PageSearchField,
  defaultValues: Record<string, PageSearchFieldValue>,
): PageSearchFieldValue {
  if (values[field.field] !== undefined) return values[field.field];
  if (defaultValues[field.field] !== undefined) {
    return defaultValues[field.field];
  }
  return field.type === 'date' ? { from: '', to: '' } : '';
}

function mergeSearchValues(
  defaults: Record<string, PageSearchFieldValue>,
  values: Record<string, PageSearchFieldValue>,
): Record<string, PageSearchFieldValue> {
  return { ...defaults, ...values };
}

function getDateValue(value: PageSearchFieldValue, key: 'from' | 'to'): string {
  if (!value || typeof value !== 'object') return '';
  return value[key] ?? '';
}

function areSearchValuesEqual(
  current: Record<string, PageSearchFieldValue>,
  next: Record<string, PageSearchFieldValue>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  for (const key of keys) {
    const currentValue = current[key];
    const nextValue = next[key];
    if (currentValue === nextValue) continue;
    if (
      currentValue &&
      nextValue &&
      typeof currentValue === 'object' &&
      typeof nextValue === 'object' &&
      currentValue.from === nextValue.from &&
      currentValue.to === nextValue.to
    ) {
      continue;
    }
    return false;
  }
  return true;
}

export function PageSearchArea({
  children,
  searchField,
  onDefaultSearch,
  detailFields = [],
  detailValues = EMPTY_SEARCH_VALUES,
  defaultValues = EMPTY_SEARCH_VALUES,
  onDetailValuesChange,
  onDetailSearch,
  onDetailReset,
  onDetailClose,
  detailLoading = false,
}: PageSearchAreaProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [draftValues, setDraftValues] = useState(() =>
    mergeSearchValues(defaultValues, detailValues),
  );
  const [dateErrors, setDateErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const resolvedValues = mergeSearchValues(defaultValues, detailValues);
    setDraftValues((current) =>
      areSearchValuesEqual(current, resolvedValues) ? current : resolvedValues,
    );
  }, [defaultValues, detailValues]);

  const updateValue = (field: string, value: PageSearchFieldValue) => {
    const next = { ...draftValues, [field]: value };
    setDraftValues(next);
    onDetailValuesChange?.(next);
  };

  const closeDetails = () => {
    setDetailOpen(false);
    onDetailClose?.();
  };

  const updateDateValue = (
    field: PageSearchField,
    endpoint: 'from' | 'to',
    input: string,
    commit = false,
  ) => {
    const normalized = input ? normalizeDateInput(input) : '';
    const invalid = Boolean(input && !normalized);
    if (commit || !invalid) {
      setDateErrors((current) => ({
        ...current,
        [`${field.field}.${endpoint}`]: invalid,
      }));
    }
    if (commit && invalid) return;
    const value = getFieldValue(draftValues, field, defaultValues);
    updateValue(field.field, {
      from: getDateValue(value, 'from'),
      to: getDateValue(value, 'to'),
      [endpoint]: commit ? normalized : input,
    });
  };

  const searchDetails = () => {
    const next = { ...draftValues };
    const errors: Record<string, boolean> = {};
    for (const field of detailFields) {
      if (field.type !== 'date') continue;
      const value = getFieldValue(draftValues, field, defaultValues);
      const range = { from: '', to: '' };
      for (const endpoint of ['from', 'to'] as const) {
        const input = getDateValue(value, endpoint);
        range[endpoint] = input ? normalizeDateInput(input) : '';
        if (input && !range[endpoint]) {
          errors[`${field.field}.${endpoint}`] = true;
        }
      }
      if (
        draftValues[field.field] !== undefined ||
        defaultValues[field.field] !== undefined
      ) {
        next[field.field] = range;
      }
    }
    setDateErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setDraftValues(next);
    if (!areSearchValuesEqual(draftValues, next)) {
      onDetailValuesChange?.(next);
    }
    onDetailSearch?.(next);
    closeDetails();
  };

  const renderSearchField = (field: PageSearchField) => {
    const value = getFieldValue(draftValues, field, defaultValues);
    const span = field.searchSpan ?? 1;
    const gridColumn = {
      xs: 'span 1',
      sm: `span ${Math.min(span, 2)}`,
      md: `span ${span}`,
    };

    return (
      <Box
        key={field.field}
        data-search-field={field.field}
        data-search-span={span}
        sx={{ gridColumn, minWidth: 0 }}
      >
        {field.type === 'date' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
              gap: 1,
              minWidth: 0,
            }}
          >
            {(['from', 'to'] as const).map((endpoint) => {
              const input = getDateValue(value, endpoint);
              const error = Boolean(
                dateErrors[`${field.field}.${endpoint}`] &&
                  input &&
                  !normalizeDateInput(input),
              );
              return (
                <DateEditor
                  key={endpoint}
                  variant="outlined"
                  autoFocus={false}
                  selectOnFocus={false}
                  label={`${field.label} ${endpoint === 'from' ? '시작일' : '종료일'}`}
                  value={input}
                  onChange={(next) => updateDateValue(field, endpoint, next)}
                  onBlur={() => updateDateValue(field, endpoint, input, true)}
                  error={error}
                  helperText={error ? '올바른 날짜를 입력하세요.' : undefined}
                />
              );
            })}
          </Box>
        ) : field.type === 'select' || field.type === 'checkbox' ? (
          <FormControl size="small" fullWidth>
            <InputLabel id={`${field.field}-search-label`}>
              {field.label}
            </InputLabel>
            <Select
              labelId={`${field.field}-search-label`}
              label={field.label}
              value={
                value === null || value === undefined ? '' : String(value)
              }
              onChange={(event) => updateValue(field.field, event.target.value)}
              inputProps={{ 'aria-label': field.label }}
            >
              <MenuItem value="">전체</MenuItem>
              {(field.options ?? []).map((option) => (
                <MenuItem
                  key={String(option.value)}
                  value={String(option.value)}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <PageSearchTextField
            field={field}
            value={value}
            onChange={(nextValue) => updateValue(field.field, nextValue)}
          />
        )}
      </Box>
    );
  };

  const searchRenderBlocks = groupSearchFields(detailFields);

  const handleDefaultSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && onDefaultSearch) {
      event.preventDefault();
      onDefaultSearch();
    }
  };

  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        zIndex: detailOpen ? 10 : 1,
        px: 3,
        py: 1.25,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor:
          theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.72)'
            : 'rgba(148, 163, 184, 0.03)',
        backdropFilter: 'blur(8px)',
        transition: 'background-color 0.2s ease',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minWidth: 0,
          flexWrap: 'nowrap',
        }}
      >
        {searchField ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1.5,
              flex: { xs: '1 1 100%', md: 1 },
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                gap: 1.5,
                flex: { xs: '1 1 100%', md: '1 1 auto' },
                minWidth: 0,
                order: 2,
              }}
              onKeyDown={handleDefaultSearchKeyDown}
            >
              {children}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: { xs: '1 1 100%', md: '1 1 220px' },
                maxWidth: 360,
                minWidth: { xs: '100%', md: 220 },
                order: 1,
                height: 40,
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 40,
                  height: 40,
                  flex: '0 0 40px',
                  borderRadius: '8px 0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: '#fff',
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.23)'
                      : 'rgba(0, 0, 0, 0.23)',
                  borderRight: 0,
                  boxShadow: '0 8px 16px rgba(59,130,246,0.2)',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <SearchRoundedIcon fontSize="small" />
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  '& .MuiOutlinedInput-root': {
                    height: '100%',
                    borderRadius: '0 8px 8px 0',
                  },
                }}
                onKeyDown={handleDefaultSearchKeyDown}
              >
                {searchField}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flex: { xs: '1 1 100%', md: '1 1 220px' },
              maxWidth: 360,
              minWidth: { xs: '100%', md: 220 },
              height: 40,
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 40,
                height: 40,
                flex: '0 0 40px',
                borderRadius: '8px 0 0 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: '#fff',
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.23)'
                    : 'rgba(0, 0, 0, 0.23)',
                borderRight: 0,
                boxShadow: '0 8px 16px rgba(59,130,246,0.2)',
                transition: 'background-color 0.2s ease',
              }}
            >
              <SearchRoundedIcon fontSize="small" />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                gap: 0,
                flex: 1,
                minWidth: 0,
                height: '100%',
                '& > :first-of-type .MuiOutlinedInput-root': {
                  borderRadius: '0 8px 8px 0',
                },
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  borderRadius: '0 8px 8px 0',
                },
              }}
              onKeyDown={handleDefaultSearchKeyDown}
            >
              {children}
            </Box>
          </Box>
        )}
        {detailFields.length > 0 && (
          <IconButton
            type="button"
            size="small"
            aria-label={detailOpen ? '상세 검색 닫기' : '상세 검색 열기'}
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((current) => !current)}
            sx={{
              flex: '0 0 auto',
              ml: 'auto',
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {detailOpen ? (
              <KeyboardArrowUpRoundedIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownRoundedIcon fontSize="small" />
            )}
          </IconButton>
        )}
      </Box>

      {detailOpen && detailFields.length > 0 && (
        <Paper
          role="dialog"
          aria-label="상세 검색"
          elevation={8}
          sx={{
            position: 'absolute',
            zIndex: 2,
            top: '100%',
            left: 0,
            right: 0,
            p: { xs: 2, sm: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 1.5,
            }}
          >
            {searchRenderBlocks.map((block, index) =>
              'group' in block ? (
                <Box
                  key={`${block.group}-${index}`}
                  data-search-group={block.group}
                  sx={{
                    gridColumn: '1 / -1',
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(5, minmax(0, 1fr))',
                    },
                    gap: 1.5,
                    minWidth: 0,
                  }}
                >
                  {block.fields.map(renderSearchField)}
                </Box>
              ) : (
                renderSearchField(block.field)
              ),
            )}
          </Box>
          <Divider
            role="separator"
            aria-orientation="horizontal"
            sx={{ my: 2 }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
            }}
          >
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setDraftValues(defaultValues);
                setDateErrors({});
                onDetailValuesChange?.(defaultValues);
                onDetailReset?.(defaultValues);
              }}
              disabled={detailLoading}
            >
              초기화
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={searchDetails}
              disabled={detailLoading}
            >
              조회
            </Button>
            <Button
              type="button"
              // variant="outlined"
              aria-label="검색 닫기"
              onClick={closeDetails}
              disabled={detailLoading}
            >
              닫기
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

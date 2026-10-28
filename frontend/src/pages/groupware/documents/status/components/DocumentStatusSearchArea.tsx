import ClearIcon from '@mui/icons-material/Clear';
import { IconButton, TextField } from '@mui/material';
import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import type { PageSearchField } from '../../../../../shared/components/page-search/searchFields';
import type { DocumentStatusSearchValues } from '../types/documentStatusSearch.types';

type DocumentStatusSearchAreaProps = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  detailFields: PageSearchField[];
  detailValues: DocumentStatusSearchValues;
  defaultValues: DocumentStatusSearchValues;
  onDetailValuesChange: (values: DocumentStatusSearchValues) => void;
  onSearch: (values?: DocumentStatusSearchValues) => void;
  onReset: () => void;
  initialized: boolean;
  loading: boolean;
};

export function DocumentStatusSearchArea({
  keyword,
  onKeywordChange,
  detailFields,
  detailValues,
  defaultValues,
  onDetailValuesChange,
  onSearch,
  onReset,
  initialized,
  loading,
}: DocumentStatusSearchAreaProps) {
  return (
    <PageSearchArea
      searchField={
        <TextField
          size="small"
          margin="none"
          placeholder="문서번호/제목/기안자 검색"
          value={keyword}
          disabled={!initialized}
          onChange={(event) => onKeywordChange(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': '문서현황 빠른 검색' },
            input: {
              endAdornment: keyword ? (
                <IconButton
                  type="button"
                  size="small"
                  edge="end"
                  aria-label="문서현황 검색어 초기화"
                  onClick={() => onKeywordChange('')}
                  sx={{ p: 0.25 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
            },
          }}
          sx={{ width: '100%', height: 40 }}
        />
      }
      onDefaultSearch={() => {
        if (initialized) onSearch();
      }}
      detailFields={detailFields}
      detailValues={detailValues}
      defaultValues={defaultValues}
      onDetailValuesChange={onDetailValuesChange}
      onDetailSearch={onSearch}
      onDetailReset={(values) => {
        onDetailValuesChange(values);
        onReset();
      }}
      detailLoading={loading || !initialized}
    />
  );
}

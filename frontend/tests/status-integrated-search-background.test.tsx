import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentStatusSearchArea } from '../src/pages/groupware/documents/status/components/DocumentStatusSearchArea';
import { SalesOrderStatusSearchArea } from '../src/pages/sales/order/status/components/SalesOrderStatusSearchArea';
import { createAppTheme, type AppThemeMode } from '../src/theme/theme';

function renderSearchAreas(mode: AppThemeMode) {
  const searchValues = {};
  const commonProps = {
    keyword: '',
    onKeywordChange: () => {},
    detailFields: [],
    detailValues: searchValues,
    appliedDetailValues: searchValues,
    defaultValues: searchValues,
    onDetailValuesChange: () => {},
    onSearch: () => {},
    onReset: () => {},
    initialized: true,
    loading: false,
  };

  render(
    <ThemeProvider theme={createAppTheme(mode)}>
      <>
        <DocumentStatusSearchArea {...commonProps} />
        <SalesOrderStatusSearchArea {...commonProps} />
      </>
    </ThemeProvider>,
  );
}

describe('status integrated search backgrounds', () => {
  it.each([
    ['light', 'rgb(255, 255, 255)'],
    ['dark', 'rgb(17, 24, 39)'],
  ] as const)(
    'matches the %s theme surface color on both status pages',
    (mode, expectedBackground) => {
      renderSearchAreas(mode);

      for (const label of ['문서현황 빠른 검색', '수주현황 빠른 검색']) {
        const input = screen.getByRole('textbox', { name: label });
        const outlinedInput = input.closest('.MuiOutlinedInput-root');

        expect(outlinedInput).not.toBeNull();
        expect(getComputedStyle(outlinedInput!).backgroundColor).toBe(
          expectedBackground,
        );
      }
    },
  );
});

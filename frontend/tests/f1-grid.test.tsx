import { createRef, Profiler, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Dialog } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import dayjs from 'dayjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../src/theme/theme';
import { AppSettingsProvider } from '../src/shared/context/AppSettingsContext';
import {
  addGridRow,
  createGridData,
  duplicateGridRows,
  F1Grid,
  getGridChanges,
  getAutoFitColumnWidth,
  getCellDisplayValue,
  getGridMergeInfo,
  clampGridRowHeight,
  getGridRowHeightByKey,
  getGridColumnTrack,
  getGridColumnTracks,
  getNextEditableCell,
  getSelectedRowIds,
  hasGridRowId,
  markRowsDeleted,
  parseGridTsv,
  restoreGridRows,
  toGridTsv,
  updateGridRow,
  validateGridRow,
  coerceClipboardValue,
  canHideGridColumn,
  getVisibleGridColumns,
  reorderGridColumns,
  moveGridColumnOrder,
  toggleGridSort,
  sortGridRows,
  getGridSortIndicator,
  getGridFilterOperators,
  matchesGridFilter,
  applyGridFilters,
  getPinnedGridColumns,
  getGridColumnPinOffsets,
  type F1GridColumn,
  type F1GridRef,
  type F1GridSort,
} from '../src/shared/components/f1-grid';
import { normalizeDateInput } from '../src/shared/components/f1-grid/editing/DateEditor';
import { getGridCellBottomBorder } from '../src/shared/components/f1-grid/core/GridCell';
import {
  getActiveMergeGroupStartKeys,
  getMergeGroupStartIndex,
} from '../src/shared/components/f1-grid/core/GridRow';
import { NumberEditor } from '../src/shared/components/f1-grid/editing/NumberEditor';
import { SelectEditor } from '../src/shared/components/f1-grid/editing/SelectEditor';
import { TextEditor } from '../src/shared/components/f1-grid/editing/TextEditor';
import { MenuManagementPanel } from '../src/pages/settings/system/menus/components/MenuManagementPanel';

type MenuRow = {
  id: string;
  code: string;
  order: number;
  enabled: boolean;
  startDate: string;
  status: string;
};

const rows: MenuRow[] = [
  {
    id: 'dashboard',
    code: 'DASH',
    order: 1,
    enabled: true,
    startDate: '2026-08-27',
    status: 'draft',
  },
  {
    id: 'settings',
    code: 'SET',
    order: 2,
    enabled: true,
    startDate: '2026-08-28',
    status: 'confirmed',
  },
];

const columns: F1GridColumn<MenuRow>[] = [
  { field: 'code', headerName: '肄붾뱶', editable: true },
  {
    field: 'order',
    headerName: '?占쎈젹',
    editable: true,
    type: 'number',
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'enabled',
    headerName: '?占쎌슜 ?占쏙옙?',
    editable: true,
    type: 'checkbox',
    headerCheckbox: true,
  },
  {
    field: 'startDate',
    headerName: 'Start date',
    editable: true,
    type: 'date',
  },
  {
    field: 'status',
    headerName: '?占쏀깭',
    editable: (row) => row.status === 'draft',
    type: 'select',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'confirmed', label: '?占쎌젙' },
    ],
  },
];

describe('F1-GRID default prop behavior', () => {
  it('keeps column lines and alternating row striping enabled by default', () => {
    render(
      <F1Grid rows={rows} columns={columns} rowKey="id" ariaLabel="grid" />,
    );

    const secondRowCodeCell = screen.getByRole('gridcell', { name: 'SET' });
    expect(secondRowCodeCell.getAttribute('data-f1-grid-column-line')).toBe(
      'true',
    );
    expect(secondRowCodeCell.getAttribute('data-f1-grid-striped')).toBe('true');
  });

  it('commits an edited cell when focus moves inside its parent dialog', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(
      <Dialog open>
        <F1Grid
          ref={gridRef}
          rows={rows}
          columns={columns}
          rowKey="id"
          ariaLabel="dialog grid"
        />
      </Dialog>,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'DASH' }));
    const editor = screen.getByDisplayValue('DASH');
    fireEvent.change(editor, { target: { value: 'DASH-UPDATED' } });
    fireEvent.click(screen.getByRole('gridcell', { name: 'SET' }));

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', code: 'DASH-UPDATED' }),
    ]);
  });

  it('allows disabling column lines and row striping explicitly', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="grid without visual helpers"
        columnLine={false}
        stripeRows={false}
      />,
    );

    const secondRowCodeCell = screen.getByRole('gridcell', { name: 'SET' });
    expect(secondRowCodeCell.getAttribute('data-f1-grid-column-line')).toBe(
      'false',
    );
    expect(secondRowCodeCell.getAttribute('data-f1-grid-striped')).toBe(
      'false',
    );
  });
});

describe('F1-GRID size props', () => {
  it('does not recurse when a parent recreates equivalent row arrays on every render', () => {
    const baseRows = [
      { id: 'row-1', code: 'A' },
      { id: 'row-2', code: 'B' },
    ];
    const columns: F1GridColumn<(typeof baseRows)[number]>[] = [
      { field: 'code', headerName: 'Code', editable: true },
    ];

    function Demo() {
      const [tick, setTick] = useState(0);
      const rows = baseRows.filter(() => true);

      return (
        <>
          <button type="button" onClick={() => setTick((value) => value + 1)}>
            rerender
          </button>
          <F1Grid
            rows={rows}
            columns={columns}
            rowKey="id"
            ariaLabel="grid with equivalent row arrays"
            height={220}
          />
          <span>{tick}</span>
        </>
      );
    }

    const { unmount } = render(<Demo />);

    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: 'rerender' }));
    }).not.toThrow();

    expect(screen.getByRole('grid')).toBeInTheDocument();
    unmount();
  });

  it('keeps cell render work limited when a cell is selected', () => {
    const renderCellSpy = vi.fn(({ value }) => <span>{String(value)}</span>);
    const manyRows = Array.from({ length: 64 }, (_, index) => ({
      id: `row-${index}`,
      value: `value-${index}`,
    }));
    const manyColumns: F1GridColumn<(typeof manyRows)[number]>[] = [
      {
        field: 'value',
        headerName: 'Value',
        editable: true,
        renderCell: renderCellSpy,
      },
    ];

    render(
      <F1Grid
        rows={manyRows}
        columns={manyColumns}
        rowKey="id"
        ariaLabel="grid with limited rerender"
        height={240}
      />,
    );

    const before = renderCellSpy.mock.calls.length;
    fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'value-0' }));
    fireEvent.mouseUp(screen.getByRole('gridcell', { name: 'value-0' }));

    expect(renderCellSpy.mock.calls.length - before).toBeLessThan(12);
  });

  it('applies a numeric minHeight as a CSS pixel value', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="grid with min height"
        minHeight={240}
      />,
    );

    expect(screen.getByRole('grid')).toHaveStyle({ minHeight: '240px' });
  });

  it('keeps a string minHeight value when specified', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="grid with min height string"
        minHeight="18rem"
      />,
    );

    expect(screen.getByRole('grid')).toHaveStyle({ minHeight: '18rem' });
  });
});

describe('F1-GRID loading overlay', () => {
  it('commits fetched and empty rows before loading-complete updates return', () => {
    const fetchedRows = [{ id: 'fetched', code: 'FETCHED' }];
    const fetchedColumns: F1GridColumn<(typeof fetchedRows)[number]>[] = [
      { field: 'code', headerName: 'Code' },
    ];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const reactActEnvironment = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    const previousActEnvironment = reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;

    try {
      act(() => {
        flushSync(() => {
          root.render(
            <F1Grid
              rows={[]}
              columns={fetchedColumns}
              rowKey="id"
              loading
            />,
          );
        });
      });
      act(() => {
        flushSync(() => {
          root.render(
            <F1Grid
              rows={fetchedRows}
              columns={fetchedColumns}
              rowKey="id"
              loading={false}
            />,
          );
        });
        expect(container.querySelector('[role="gridcell"]')?.textContent).toBe(
          'FETCHED',
        );
        expect(
          container.querySelector('[data-testid="f1-grid-loading-overlay"]'),
        ).toBeNull();
      });
      act(() => {
        flushSync(() => {
          root.render(
            <F1Grid
              rows={fetchedRows}
              columns={fetchedColumns}
              rowKey="id"
              loading
            />,
          );
        });
      });
      act(() => {
        flushSync(() => {
          root.render(
            <F1Grid
              rows={[]}
              columns={fetchedColumns}
              rowKey="id"
              loading={false}
            />,
          );
        });
        expect(container.querySelector('[role="gridcell"]')).toBeNull();
        expect(
          container.querySelector('[data-testid="f1-grid-loading-overlay"]'),
        ).toBeNull();
      });
    } finally {
      act(() => {
        flushSync(() => root.unmount());
      });
      reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      container.remove();
    }
  });

  it('matches the shared app spinner and restores grid editing after loading', () => {
    const theme = createAppTheme('light');
    const { rerender } = render(
      <ThemeProvider theme={theme}>
        <F1Grid
          rows={rows}
          columns={columns}
          rowKey="id"
          ariaLabel="grid loading overlay"
          loading
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.queryByTestId('grid-loading-skeleton'),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('grid-loading-row-skeleton')).toHaveLength(
      0,
    );
    const overlay = screen.getByTestId('f1-grid-loading-overlay');
    const progress = screen.getByRole('progressbar');
    const progressCircle = progress.querySelector('circle');

    expect(progress).toHaveStyle({ width: '34px', height: '34px' });
    expect(progressCircle).not.toBeNull();
    expect(progressCircle).toHaveAttribute('stroke-width', '2.4');
    expect(getComputedStyle(overlay).backgroundColor).toBe(
      'rgba(244, 247, 251, 0.84)',
    );

    rerender(
      <ThemeProvider theme={theme}>
        <F1Grid
          rows={rows}
          columns={columns}
          rowKey="id"
          ariaLabel="grid loading overlay"
        />
      </ThemeProvider>,
    );

    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('grid')).not.toHaveAttribute('aria-busy');
    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    expect(codeCell).toBeInTheDocument();
    fireEvent.doubleClick(codeCell);
    expect(screen.getByDisplayValue('DASH')).toBeInTheDocument();
  });

  it('renders only the visible window for large row sets to keep the grid responsive', () => {
    const largeRows = Array.from({ length: 1500 }, (_, index) => ({
      id: `row-${index}`,
      code: `ITEM-${String(index).padStart(4, '0')}`,
    }));

    const largeColumns: F1GridColumn<{ id: string; code: string }>[] = [
      { field: 'code', headerName: 'Code', width: 160 },
    ];

    render(
      <F1Grid
        rows={largeRows}
        columns={largeColumns}
        rowKey="id"
        ariaLabel="large row virtualized grid"
        height={240}
      />,
    );

    expect(screen.getAllByRole('row').length).toBeLessThan(250);
  });

  it('moves the virtual row window after vertical scrolling', async () => {
    const largeRows = Array.from({ length: 1500 }, (_, index) => ({
      id: `row-${index}`,
      code: `ITEM-${String(index).padStart(4, '0')}`,
    }));
    const largeColumns: F1GridColumn<{ id: string; code: string }>[] = [
      { field: 'code', headerName: 'Code', width: 160 },
    ];

    const { container } = render(
      <F1Grid
        rows={largeRows}
        columns={largeColumns}
        rowKey="id"
        height={240}
      />,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'clientHeight', {
      configurable: true,
      value: 240,
    });
    bodyScroll.scrollTop = 3200;
    fireEvent.scroll(bodyScroll);

    await waitFor(() =>
      expect(
        container.querySelector('[data-f1-grid-row-id="row-92"]'),
      ).toBeInTheDocument(),
    );
    expect(
      container.querySelector('[data-f1-grid-row-id="row-0"]'),
    ).not.toBeInTheDocument();
  });

  it('keeps the drag overlay visible after the grid body is scrolled vertically', async () => {
    const rowsWithLongList = [
      { id: 'row-1', code: 'A', name: 'Alpha' },
      { id: 'row-2', code: 'B', name: 'Beta' },
    ];

    render(
      <F1Grid
        rows={rowsWithLongList}
        columns={[
          { field: 'code', headerName: 'Code', width: 160 },
          { field: 'name', headerName: 'Name', width: 160 },
        ]}
        rowKey="id"
        height={180}
      />,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'scrollTop', {
      configurable: true,
      value: 1200,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 420,
        bottom: 180,
        width: 420,
        height: 180,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const startCell = screen.getByRole('gridcell', { name: 'A' });
    const endCell = screen.getByRole('gridcell', { name: 'Beta' });
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function () {
        if (this === startCell) {
          return {
            left: 10,
            top: 120,
            right: 170,
            bottom: 160,
            width: 160,
            height: 40,
            x: 10,
            y: 120,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === endCell) {
          return {
            left: 10,
            top: 180,
            right: 170,
            bottom: 220,
            width: 160,
            height: 40,
            x: 10,
            y: 180,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === bodyScroll) {
          return {
            left: 0,
            top: 0,
            right: 420,
            bottom: 180,
            width: 420,
            height: 180,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRect;
        }
        return originalRect.call(this);
      },
    );

    fireEvent.mouseDown(startCell);
    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: 'A' })).toBeInTheDocument();
    });
    fireEvent.mouseEnter(endCell);

    await waitFor(() => {
      expect(
        document.querySelector('[data-range-overlay="drag"]'),
      ).not.toBeNull();
    });

    const overlay = document.querySelector(
      '[data-range-overlay="drag"]',
    ) as HTMLElement;
    expect(Number.parseFloat(getComputedStyle(overlay).top)).toBeGreaterThan(0);
    expect(
      Number.parseFloat(getComputedStyle(overlay).left),
    ).toBeGreaterThanOrEqual(0);
  });

  it('positions the selection overlay in scrolled content coordinates', async () => {
    const rowsWithLongList = [
      { id: 'row-1', code: 'A', name: 'Alpha' },
      { id: 'row-2', code: 'B', name: 'Beta' },
    ];

    render(
      <F1Grid
        rows={rowsWithLongList}
        columns={[
          { field: 'code', headerName: 'Code', width: 160 },
          { field: 'name', headerName: 'Name', width: 160 },
        ]}
        rowKey="id"
        height={180}
      />,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'scrollTop', {
      configurable: true,
      value: 210,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'scrollLeft', {
      configurable: true,
      value: 120,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 20,
        top: 10,
        right: 420,
        bottom: 190,
        width: 400,
        height: 180,
        x: 20,
        y: 10,
        toJSON: () => ({}),
      }),
    });

    const startCell = screen.getByRole('gridcell', { name: 'A' });
    const endCell = screen.getByRole('gridcell', { name: 'Beta' });
    Object.defineProperty(startCell, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          left: 80,
          top: 220,
          right: 240,
          bottom: 260,
          width: 160,
          height: 40,
          x: 80,
          y: 220,
          toJSON: () => ({}),
        }) as DOMRect,
    });
    Object.defineProperty(endCell, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          left: 80,
          top: 260,
          right: 240,
          bottom: 300,
          width: 160,
          height: 40,
          x: 80,
          y: 260,
          toJSON: () => ({}),
        }) as DOMRect,
    });
    Object.defineProperty(bodyScroll, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          left: 20,
          top: 10,
          right: 420,
          bottom: 190,
          width: 400,
          height: 180,
          x: 20,
          y: 10,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    fireEvent.mouseDown(startCell);
    fireEvent.mouseEnter(endCell);

    await waitFor(() => {
      expect(
        document.querySelector('[data-range-overlay="drag"]'),
      ).not.toBeNull();
    });

    const overlay = document.querySelector(
      '[data-range-overlay="drag"]',
    ) as HTMLElement;
    expect(Number.parseFloat(getComputedStyle(overlay).left)).toBeCloseTo(
      181,
      1,
    );
    expect(Number.parseFloat(getComputedStyle(overlay).top)).toBeCloseTo(
      421,
      1,
    );
  });

  it('continues the range drag after the viewport scrolls while the pointer stays in place', async () => {
    const largeRows = Array.from({ length: 80 }, (_, index) => ({
      id: `row-${index}`,
      code: `CODE-${index}`,
      name: `Name-${index}`,
    }));

    render(
      <F1Grid
        rows={largeRows}
        columns={[
          { field: 'code', headerName: 'Code', width: 120 },
          { field: 'name', headerName: 'Name', width: 120 },
        ]}
        rowKey="id"
        height={180}
      />,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'scrollTop', {
      configurable: true,
      value: 950,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'clientHeight', {
      configurable: true,
      value: 180,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 260,
        bottom: 180,
        width: 260,
        height: 180,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const startCell = screen.getByRole('gridcell', { name: 'CODE-30' });
    const endCell = screen.getByRole('gridcell', { name: 'Name-35' });
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: (clientX: number, clientY: number) => {
        if (
          clientX >= 20 &&
          clientX <= 140 &&
          clientY >= 90 &&
          clientY <= 130
        ) {
          return endCell;
        }
        return startCell;
      },
    });

    fireEvent.mouseDown(startCell, { clientX: 40, clientY: 100 });
    fireEvent.scroll(bodyScroll);
    fireEvent.pointerMove(window, { clientX: 80, clientY: 110 });

    await waitFor(() => {
      const overlay = document.querySelector('[data-range-overlay]');
      expect(overlay).not.toBeNull();
    });
  });

  it('keeps the range selection alive when the pointer sits on a cell border after the viewport scrolls', async () => {
    const largeRows = Array.from({ length: 80 }, (_, index) => ({
      id: `row-${index}`,
      code: `CODE-${index}`,
      name: `Name-${index}`,
    }));

    render(
      <F1Grid
        rows={largeRows}
        columns={[
          { field: 'code', headerName: 'Code', width: 120 },
          { field: 'name', headerName: 'Name', width: 120 },
        ]}
        rowKey="id"
        height={180}
      />,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'scrollTop', {
      configurable: true,
      value: 980,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'clientHeight', {
      configurable: true,
      value: 180,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        right: 260,
        bottom: 180,
        width: 260,
        height: 180,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const startCell = screen.getByRole('gridcell', { name: 'CODE-31' });
    const nextCell = screen.getByRole('gridcell', { name: 'CODE-32' });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function () {
        if (this === startCell) {
          return {
            left: 10,
            top: 90,
            right: 130,
            bottom: 120,
            width: 120,
            height: 30,
            x: 10,
            y: 90,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === nextCell) {
          return {
            left: 10,
            top: 120,
            right: 130,
            bottom: 150,
            width: 120,
            height: 30,
            x: 10,
            y: 120,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === bodyScroll) {
          return {
            left: 0,
            top: 0,
            right: 260,
            bottom: 180,
            width: 260,
            height: 180,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRect;
        }
        return {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      },
    );

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: (clientX: number, clientY: number) => {
        if (
          clientX >= 120 &&
          clientX <= 130 &&
          clientY >= 110 &&
          clientY <= 120
        ) {
          return [bodyScroll];
        }
        if (
          clientX >= 10 &&
          clientX <= 130 &&
          clientY >= 120 &&
          clientY <= 150
        ) {
          return [nextCell];
        }
        return [startCell];
      },
    });

    fireEvent.mouseDown(startCell, { clientX: 20, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 125, clientY: 117 });

    await waitFor(() => {
      const overlay = document.querySelector('[data-range-overlay]');
      expect(overlay).not.toBeNull();
    });
  });

  it('renders only viewport columns while keeping pinned columns mounted', () => {
    type WideRow = { id: string } & Record<string, string>;
    const wideRows: WideRow[] = [
      Object.fromEntries([
        ['id', 'row-1'],
        ...Array.from({ length: 20 }, (_, index) => [
          `field${index}`,
          `value-${index}`,
        ]),
      ]) as WideRow,
    ];
    const wideColumns: F1GridColumn<WideRow>[] = Array.from(
      { length: 20 },
      (_, index) => ({
        field: `field${index}`,
        headerName: `Column ${index}`,
        width: 120,
        pinned: index === 0 ? 'left' : index === 19 ? 'right' : undefined,
      }),
    );

    render(
      <F1Grid
        rows={wideRows}
        columns={wideColumns}
        rowKey="id"
        ariaLabel="wide virtualized grid"
        height={240}
        virtualizeColumns
        columnOverscan={1}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: 'Column 0' }),
    ).toBeVisible();
    expect(
      screen.getByRole('columnheader', { name: 'Column 19' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('columnheader', { name: 'Column 10' }),
    ).not.toBeInTheDocument();
  });

  it('does not rerender a non-virtualized grid for horizontal scrolling', async () => {
    const commits = vi.fn();
    const wideRows = [{ id: 'row-1', first: 'A', second: 'B', third: 'C' }];
    const wideColumns: F1GridColumn<(typeof wideRows)[number]>[] = [
      { field: 'first', headerName: 'First', width: 120 },
      { field: 'second', headerName: 'Second', width: 120 },
      { field: 'third', headerName: 'Third', width: 120 },
    ];

    render(
      <Profiler id="non-virtualized-scroll" onRender={commits}>
        <F1Grid rows={wideRows} columns={wideColumns} rowKey="id" />
      </Profiler>,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve()),
          );
        }),
    );
    expect(commits).toHaveBeenCalled();
    commits.mockClear();

    bodyScroll.scrollLeft = 32;
    fireEvent.scroll(bodyScroll);
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve()),
          );
        }),
    );

    expect(commits).not.toHaveBeenCalled();
  });

  it('updates virtualized columns only when the rendered column window changes', async () => {
    type WideRow = { id: string } & Record<string, string>;
    const wideRows: WideRow[] = [
      Object.fromEntries([
        ['id', 'row-1'],
        ...Array.from({ length: 20 }, (_, index) => [
          `field${index}`,
          `value-${index}`,
        ]),
      ]) as WideRow,
    ];
    const wideColumns: F1GridColumn<WideRow>[] = Array.from(
      { length: 20 },
      (_, index) => ({
        field: `field${index}`,
        headerName: `Column ${index}`,
        width: 120,
        pinned: index === 0 ? 'left' : index === 19 ? 'right' : undefined,
      }),
    );
    const commits = vi.fn();

    render(
      <Profiler id="virtualized-scroll" onRender={commits}>
        <F1Grid
          rows={wideRows}
          columns={wideColumns}
          rowKey="id"
          height={240}
          virtualizeColumns
          columnOverscan={1}
        />
      </Profiler>,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'clientWidth', {
      configurable: true,
      value: 360,
    });
    fireEvent.resize(window);
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve()),
          );
        }),
    );
    await waitFor(() => expect(commits).toHaveBeenCalled());
    commits.mockClear();

    bodyScroll.scrollLeft = 20;
    fireEvent.scroll(bodyScroll);
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve()),
          );
        }),
    );

    expect(commits).not.toHaveBeenCalled();
    expect(
      screen.getByRole('columnheader', { name: 'Column 19' }),
    ).toBeInTheDocument();

    bodyScroll.scrollLeft = 1500;
    fireEvent.scroll(bodyScroll);

    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: 'Column 12' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Column 0' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Column 19' }),
      ).toBeInTheDocument();
    });
    expect(commits).toHaveBeenCalled();
  });

  it('reserves a stable scrollbar gutter when both vertical and horizontal scrolling are active', () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      id: `row-${index}`,
      code: `ITEM-${index}`,
      label: `Label ${index}`,
    }));
    const columns: F1GridColumn<(typeof rows)[number]>[] = [
      { field: 'code', headerName: 'Code', width: 160 },
      { field: 'label', headerName: 'Label', width: 160 },
    ];

    render(<F1Grid rows={rows} columns={columns} rowKey="id" height={240} />);

    const grid = screen.getByRole('grid');
    const [headerScroll, bodyScroll] = Array.from(
      grid.children,
    ) as HTMLElement[];

    expect(headerScroll).toHaveStyle({ scrollbarGutter: 'stable' });
    expect(bodyScroll).toHaveStyle({ scrollbarGutter: 'stable' });
  });

  it('keeps the header scroll range aligned with the body when the vertical scrollbar gutter is present', async () => {
    type WideRow = { id: string } & Record<string, string>;
    const wideRows: WideRow[] = Array.from(
      { length: 80 },
      (_, rowIndex) =>
        Object.fromEntries([
          ['id', `row-${rowIndex}`],
          ...Array.from({ length: 24 }, (_, columnIndex) => [
            `field${columnIndex}`,
            `value-${rowIndex}-${columnIndex}`,
          ]),
        ]) as WideRow,
    );
    const wideColumns: F1GridColumn<WideRow>[] = Array.from(
      { length: 24 },
      (_, index) => ({
        field: `field${index}`,
        headerName: `Column ${index}`,
        width: 120,
      }),
    );

    render(
      <F1Grid rows={wideRows} columns={wideColumns} rowKey="id" height={240} />,
    );

    const grid = screen.getByRole('grid');
    const [headerScroll] = Array.from(grid.children) as HTMLElement[];
    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'clientWidth', {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(bodyScroll, 'offsetWidth', {
      configurable: true,
      value: 377,
    });
    Object.defineProperty(bodyScroll, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(bodyScroll, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    bodyScroll.scrollLeft = 2564;
    fireEvent.resize(window);

    await waitFor(() => {
      expect(headerScroll).toHaveStyle({ paddingRight: '17px' });
    });
  });

  it('keeps the action header aligned with the body action cell when vertical scrolling is active', async () => {
    const rows = Array.from({ length: 80 }, (_, index) => ({
      id: `row-${index}`,
      code: `ITEM-${index}`,
    }));

    render(
      <F1Grid
        rows={rows}
        columns={[{ field: 'code', headerName: 'Code', width: 180 }]}
        rowKey="id"
        height={240}
        rowFormPlugin={{}}
        showCheckbox={false}
      />,
    );

    const grid = screen.getByRole('grid');
    const [headerScroll] = Array.from(grid.children) as HTMLElement[];
    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'clientWidth', {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(bodyScroll, 'offsetWidth', {
      configurable: true,
      value: 377,
    });
    Object.defineProperty(bodyScroll, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(bodyScroll, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    fireEvent.scroll(bodyScroll);

    await waitFor(() => {
      expect(headerScroll).toHaveStyle({ paddingRight: '17px' });
    });
    expect(screen.getByRole('columnheader', { name: '상세' })).toHaveStyle({
      width: '65px',
      right: '-17px',
    });
    expect(
      screen.getByRole('columnheader', { name: '상세' }),
    ).toBeInTheDocument();
  });

  it('clears the header scrollbar gutter when rows shrink below the vertical scroll threshold', async () => {
    const manyRows = Array.from({ length: 80 }, (_, index) => ({
      id: `row-${index}`,
      code: `ITEM-${index}`,
    }));
    const fewRows = manyRows.slice(0, 2);
    const { rerender } = render(
      <F1Grid
        rows={manyRows}
        columns={[{ field: 'code', headerName: 'Code', width: 180 }]}
        rowKey="id"
        height={240}
        rowFormPlugin={{}}
        showCheckbox={false}
      />,
    );

    const grid = screen.getByRole('grid');
    const [headerScroll] = Array.from(grid.children) as HTMLElement[];
    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'clientWidth', {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(bodyScroll, 'clientHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(bodyScroll, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(bodyScroll, 'offsetWidth', {
      configurable: true,
      value: 377,
    });
    fireEvent.scroll(bodyScroll);
    await waitFor(() => {
      expect(headerScroll).toHaveStyle({ paddingRight: '17px' });
    });

    Object.defineProperty(bodyScroll, 'clientWidth', {
      configurable: true,
      value: 377,
    });
    Object.defineProperty(bodyScroll, 'scrollHeight', {
      configurable: true,
      value: 200,
    });
    rerender(
      <F1Grid
        rows={fewRows}
        columns={[{ field: 'code', headerName: 'Code', width: 180 }]}
        rowKey="id"
        height={240}
        rowFormPlugin={{}}
        showCheckbox={false}
      />,
    );
    fireEvent.resize(window);

    await waitFor(() => {
      expect(headerScroll).toHaveStyle({ paddingRight: '0px' });
    });
  });

  it('moves the virtual column window on horizontal scroll and selects the mounted cell', async () => {
    type WideRow = { id: string } & Record<string, string>;
    const wideRows: WideRow[] = [
      Object.fromEntries([
        ['id', 'row-1'],
        ...Array.from({ length: 20 }, (_, index) => [
          `field${index}`,
          `value-${index}`,
        ]),
      ]) as WideRow,
    ];
    const wideColumns: F1GridColumn<WideRow>[] = Array.from(
      { length: 20 },
      (_, index) => ({
        field: `field${index}`,
        headerName: `Column ${index}`,
        width: 120,
      }),
    );

    render(
      <F1Grid
        rows={wideRows}
        columns={wideColumns}
        rowKey="id"
        height={240}
        virtualizeColumns
        columnOverscan={1}
      />,
    );

    const bodyScroll = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperty(bodyScroll, 'clientWidth', {
      configurable: true,
      value: 360,
    });
    bodyScroll.scrollLeft = 1200;
    fireEvent.scroll(bodyScroll);

    const targetCell = await screen.findByRole('gridcell', {
      name: 'value-10',
    });
    fireEvent.mouseDown(targetCell);

    expect(targetCell).toHaveAttribute('data-grid-selected', 'true');
  });

  it('uses fixed row heights above the configured large-data threshold', () => {
    const largeRows = Array.from({ length: 200 }, (_, index) => ({
      id: `fixed-${index}`,
      code: `ITEM-${index}`,
    }));
    const largeColumns: F1GridColumn<{ id: string; code: string }>[] = [
      { field: 'code', headerName: 'Code', width: 160 },
    ];

    render(
      <F1Grid
        rows={largeRows}
        columns={largeColumns}
        rowKey="id"
        height={240}
        fixedRowHeightThreshold={100}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'fixed-0 행 높이 조절' }),
    ).not.toBeInTheDocument();
  });
});

describe('F1-GRID menu layout', () => {
  it('keeps the menu tree grid at a minimum height without clipping the bottom or forcing fixed height', () => {
    render(
      <div style={{ height: 360, display: 'flex', flexDirection: 'column' }}>
        <MenuManagementPanel
          menus={[]}
          selectedModule={{ moduleId: 1, moduleName: '湲곤옙? 紐⑤뱢' }}
          selectedRoleId="role-1"
          permissions={[]}
          canExportExcel={false}
          menuGridLoading={false}
        />
      </div>,
    );

    expect(screen.getByRole('grid')).toHaveStyle({
      minHeight: '280px',
      height: 'auto',
    });
  });
});

describe('F1-GRID editor behavior', () => {
  it('selects the current value when the editor receives focus by default', () => {
    render(
      <ThemeProvider theme={createAppTheme()}>
        <TextEditor
          value="HELLO"
          onChange={() => undefined}
          onKeyDown={() => undefined}
        />
      </ThemeProvider>,
    );

    const input = screen.getByDisplayValue('HELLO') as HTMLInputElement;
    input.setSelectionRange(1, 3);

    fireEvent.focus(input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(5);
  });

  it('selects the current value for number editors when focused', () => {
    render(
      <ThemeProvider theme={createAppTheme()}>
        <NumberEditor
          value="12345"
          onChange={() => undefined}
          onKeyDown={() => undefined}
        />
      </ThemeProvider>,
    );

    const input = screen.getByDisplayValue('12345') as HTMLInputElement;
    fireEvent.focus(input);

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(5);
  });
});

describe('F1-GRID number formatting', () => {
  it('formats numeric values with a custom decimal precision', () => {
    const column: F1GridColumn<{ amount: number }>[][0] = {
      field: 'amount',
      headerName: '湲덉븸',
      type: 'number',
      format: 'number',
      decimalPlaces: 2,
    };

    expect(getCellDisplayValue(column, 12345.6)).toBe('12,345.60');
  });

  it('normalizes integer and decimal editor input to the configured precision', () => {
    const handleChange = vi.fn();

    render(
      <ThemeProvider theme={createAppTheme()}>
        <NumberEditor
          value="12.34"
          decimalPlaces={0}
          onChange={handleChange}
          onKeyDown={() => undefined}
        />
      </ThemeProvider>,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '12.34' },
    });
    expect(handleChange).toHaveBeenLastCalledWith('12');

    render(
      <ThemeProvider theme={createAppTheme()}>
        <NumberEditor
          value="12.34"
          decimalPlaces={1}
          onChange={handleChange}
          onKeyDown={() => undefined}
        />
      </ThemeProvider>,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '12.34' },
    });
    expect(handleChange).toHaveBeenLastCalledWith('12.3');
  });

  it('formats currency values when a custom number format is specified', () => {
    const column: F1GridColumn<{ amount: number }>[][0] = {
      field: 'amount',
      headerName: '湲덉븸',
      type: 'currency',
      format: 'currency',
      decimalPlaces: 0,
    };

    expect(getCellDisplayValue(column, 12345.6)).toBe('??2,346');
  });

  it('renders a required marker in the header for required columns', () => {
    render(
      <F1Grid
        rows={rows}
        columns={[
          { field: 'code', headerName: '코드', editable: true, required: true },
          { field: 'status', headerName: '상태', editable: true },
        ]}
        rowKey="id"
      />,
    );

    const codeHeader = screen.getByRole('columnheader', { name: /코드/ });
    expect(codeHeader).toHaveTextContent('코드*');
  });
});

describe('F1-GRID editor plugins', () => {
  it('does not start editing by default unless an editor plugin is registered', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="grid without editor plugin"
      />,
    );

    const codeCell = screen.getByText('DASH');
    fireEvent.doubleClick(codeCell);

    expect(screen.queryByDisplayValue('DASH')).not.toBeInTheDocument();
  });

  it('invokes before/after edit hooks only when an editor plugin allows editing', () => {
    const onBeforeEdit = vi.fn(() => true);
    const onAfterEdit = vi.fn();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="grid with editor plugin"
        editorPlugins={[
          {
            canEdit: () => true,
          },
        ]}
        onBeforeEdit={onBeforeEdit}
        onAfterEdit={onAfterEdit}
      />,
    );

    const codeCell = screen.getByText('DASH');
    fireEvent.doubleClick(codeCell);

    expect(onBeforeEdit).toHaveBeenCalled();
    expect(onAfterEdit).toHaveBeenCalled();
    expect(screen.getByDisplayValue('DASH')).toBeInTheDocument();
  });

  it('does not enable editing from a plugin when the column is not explicitly editable', () => {
    const columnsWithoutEditableFlag: F1GridColumn<MenuRow>[] = [
      { field: 'code', headerName: '肄붾뱶', editable: false },
    ];

    render(
      <F1Grid
        rows={rows}
        columns={columnsWithoutEditableFlag}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    fireEvent.doubleClick(screen.getByText('DASH'));

    expect(screen.queryByDisplayValue('DASH')).not.toBeInTheDocument();
  });
});

describe('F1-GRID clipboard', () => {
  it('serializes rows to tab-separated values in column order', () => {
    expect(toGridTsv(rows, columns)).toBe(
      'DASH\t1\ttrue\t2026-08-27\tdraft\nSET\t2\ttrue\t2026-08-28\tconfirmed',
    );
  });

  it('parses TSV and coerces numeric and checkbox column values', () => {
    expect(parseGridTsv('ITEM-1\t12\tY')).toEqual([['ITEM-1', '12', 'Y']]);
    expect(
      coerceClipboardValue('12', {
        field: 'order',
        headerName: '?占쎈젹',
        type: 'number',
      }),
    ).toBe(12);
    expect(
      coerceClipboardValue('Y', {
        field: 'enabled',
        headerName: '?占쎌슜 ?占쏙옙?',
        type: 'checkbox',
      }),
    ).toBe(true);
  });
});

describe('F1-GRID custom cell rendering', () => {
  it('preserves drop target shadows without an editable header indicator', () => {
    const theme = createAppTheme();
    render(
      <ThemeProvider theme={theme}>
        <F1Grid
          rows={rows}
          columns={[
            { field: 'code', headerName: 'Source' },
            { field: 'status', headerName: 'Target', editable: true },
          ]}
          rowKey="id"
          showCheckbox={false}
          editorPlugins={[{}]}
        />
      </ThemeProvider>,
    );
    const source = screen.getByRole('columnheader', { name: 'Source' });
    const target = screen.getByRole('columnheader', { name: 'Target' });
    const dataTransfer = { setData: vi.fn(), effectAllowed: 'move' };
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });

    expect(target).toHaveAttribute('data-drop-target', 'true');
    const dropShadow = getComputedStyle(target).boxShadow;
    expect(dropShadow).not.toContain('inset 0 2px');
    expect(dropShadow).toContain('inset 0 0 0 1px rgba(25, 118, 210, 0.35)');
    expect(dropShadow).toContain('0 0 0 1px rgba(25, 118, 210, 0.15)');
    fireEvent.dragEnd(source);
    expect(getComputedStyle(target).boxShadow).toBe('');
  });

  it.each([
    { mode: 'light', pinned: undefined, headerGroup: undefined },
    { mode: 'dark', pinned: undefined, headerGroup: 'Details' },
    { mode: 'light', pinned: 'left', headerGroup: undefined },
    { mode: 'dark', pinned: 'right', headerGroup: undefined },
  ] as const)('does not highlight editable headers while preserving existing dividers and shadows: %j', ({
    mode,
    pinned,
    headerGroup,
  }) => {
    const theme = createAppTheme(mode);
    render(
      <ThemeProvider theme={theme}>
        <F1Grid
          rows={rows}
          columns={[
            { field: 'code', headerName: 'Editable', editable: true, pinned, headerGroup },
            { field: 'status', headerName: 'Read only' },
          ]}
          rowKey="id"
          showCheckbox={false}
          editorPlugins={[{}]}
        />
      </ThemeProvider>,
    );

    const header = screen.getByRole('columnheader', { name: 'Editable' });
    const style = getComputedStyle(header);
    expect(header).toHaveAttribute('data-editable-column', 'true');
    expect(style.boxShadow).not.toContain('inset 0 2px');
    if (!pinned) expect(style.boxShadow).toBe('');
    expect(style.borderBottomWidth).not.toBe('2px');
    expect(style.borderTopWidth).toBe(headerGroup ? '1px' : '0px');
    if (pinned) {
      expect(style.boxShadow).toContain(
        `${pinned === 'left' ? '2px' : '-2px'} 0 4px -2px rgba(0, 0, 0, 0.32)`,
      );
    }
    const readOnlyHeader = screen.getByRole('columnheader', { name: 'Read only' });
    expect(readOnlyHeader).not.toHaveAttribute('data-editable-column');
    expect(getComputedStyle(readOnlyHeader).boxShadow).not.toContain('inset 0 2px');
  });

  it('renders custom cell markup and applies dynamic styling and properties', () => {
    const customColumns: F1GridColumn<MenuRow>[] = [
      {
        field: 'status',
        headerName: '?占쏀깭',
        renderCell: ({ value }) => (
          <span>{String(value) === 'draft' ? 'Draft' : 'Confirmed'}</span>
        ),
        getCellStyle: ({ value }) => ({
          backgroundColor: String(value) === 'draft' ? '#fff8e1' : '#e8f5e9',
          color: String(value) === 'draft' ? '#ed6c02' : '#2e7d32',
        }),
        getCellProps: ({ value }) => ({
          className: `status-${String(value)}`,
          title: `status:${String(value)}`,
        }),
      },
    ];

    render(
      <F1Grid
        rows={rows}
        columns={customColumns}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    const statusCell = screen.getByText('Draft').closest('[role="gridcell"]');
    expect(statusCell).toBeInTheDocument();
    expect(statusCell).toHaveClass('status-draft');
    expect(statusCell).toHaveStyle({
      backgroundColor: '#fff8e1',
      color: '#ed6c02',
    });
    expect(statusCell).toHaveAttribute('title', 'status:draft');
  });

  it('marks editable headers when a registered editor plugin allows editing', () => {
    render(
      <F1Grid
        rows={rows}
        columns={[
          {
            field: 'status',
            headerName: '?占쏀깭',
            editable: (row) => row.status === 'draft',
            type: 'select',
            options: [
              { value: 'draft', label: 'Draft' },
              { value: 'confirmed', label: '?占쎌젙' },
            ],
          },
        ]}
        rowKey="id"
        showCheckbox={false}
        editorPlugins={[
          {
            canEdit: ({ column, row }) =>
              column.field === 'status' && row.status === 'draft',
          },
        ]}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: '?占쏀깭' }),
    ).toHaveAttribute('data-editable-column', 'true');
  });
});

describe('F1-GRID select icon rendering', () => {
  it('does not render option icons by default for a plain select editor', () => {
    const { container } = render(
      <ThemeProvider theme={createAppTheme()}>
        <SelectEditor
          value="draft"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'confirmed', label: '?占쎌젙' },
          ]}
          onChange={() => undefined}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-f1grid-option-icon="true"]').length,
    ).toBe(0);
  });

  it('renders a custom icon only when a select icon renderer is configured', () => {
    const { container } = render(
      <ThemeProvider theme={createAppTheme()}>
        <SelectEditor
          value="draft"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'confirmed', label: '?占쎌젙' },
          ]}
          selectOptionIcon={(option) => (
            <span data-testid={`icon-${String(option.value)}`}>
              {String(option.value)}
            </span>
          )}
          onChange={() => undefined}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('icon-draft')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-f1grid-option-icon="true"]').length,
    ).toBe(1);
  });
});

describe('F1-GRID column management', () => {
  it('creates proportional grid tracks for flex columns', () => {
    expect(
      getGridColumnTrack({ field: 'code', headerName: '肄붾뱶', flex: 1 }),
    ).toBe('minmax(0px, 1fr)');
    expect(
      getGridColumnTrack(
        { field: 'order', headerName: '?占쎈젹', flex: 2, width: 80 },
        140,
      ),
    ).toBe('140px');
  });

  it('uses the configured width for a pinned flex column', () => {
    expect(
      getGridColumnTrack(
        { field: 'code', headerName: '肄붾뱶', flex: 1, width: 130 },
        undefined,
        true,
      ),
    ).toBe('130px');
  });

  it('resolves flex columns into shared pixel tracks for the header and body', () => {
    expect(
      getGridColumnTracks(
        [
          { field: 'code', headerName: '肄붾뱶', width: 100 },
          { field: 'order', headerName: '?占쎈젹', width: 120, flex: 2 },
          { field: 'status', headerName: '?占쏀깭', width: 60, flex: 1 },
        ],
        {},
        new Map(),
        600,
        44,
      ),
    ).toBe('44px 100px 304px 152px');
  });

  it('filters hidden columns while preserving the configured order', () => {
    const configuredColumns = [
      { field: 'code', headerName: '肄붾뱶' },
      { field: 'order', headerName: '?占쎈젹' },
      { field: 'status', headerName: '?占쏀깭' },
    ] satisfies F1GridColumn<MenuRow>[];

    expect(
      getVisibleGridColumns(configuredColumns, new Set(['order'])).map(
        (column) => column.field,
      ),
    ).toEqual(['code', 'status']);
  });

  it('prevents hiding the last visible column', () => {
    const configuredColumn = {
      field: 'code',
      headerName: '肄붾뱶',
    } satisfies F1GridColumn<MenuRow>;

    expect(canHideGridColumn([configuredColumn], configuredColumn)).toBe(false);
    expect(
      canHideGridColumn([configuredColumn, columns[1]], configuredColumn),
    ).toBe(true);
  });

  it('reorders columns according to the given field order, keeping unknown fields at the end', () => {
    const configuredColumns = [
      { field: 'code', headerName: '肄붾뱶' },
      { field: 'order', headerName: '?占쎈젹' },
      { field: 'status', headerName: '?占쏀깭' },
    ] satisfies F1GridColumn<MenuRow>[];

    expect(
      reorderGridColumns(configuredColumns, ['status', 'code']).map(
        (column) => column.field,
      ),
    ).toEqual(['status', 'code', 'order']);
  });

  it('moves a field before the target field position', () => {
    expect(moveGridColumnOrder(['a', 'b', 'c'], 'a', 'c')).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(moveGridColumnOrder(['a', 'b', 'c'], 'c', 'a')).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('hides and restores a column through the header column list menu', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '而щ읆 紐⑸줉' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '?占쎈젹 ?占쎌떆' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('columnheader', { name: /\?占쎈젹/ }),
      ).toBeNull();
    });

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '而щ읆 紐⑸줉' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '?占쎈젹 ?占쎌떆' }));
    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: /\?占쎈젹/ }),
      ).toBeInTheDocument();
    });
  });
});

describe('F1-GRID cell range selection', () => {
  it('clears cell range and drag state when loading starts', () => {
    const gridRef = createRef<F1GridRef<{ id: string; code: string }>>();
    const rangeRows = [
      { id: 'dashboard', code: 'DASH' },
      { id: 'settings', code: 'SET' },
    ];
    const rangeColumns: F1GridColumn<(typeof rangeRows)[number]>[] = [
      { field: 'code', headerName: 'Code', editable: true },
    ];
    const { rerender } = render(
      <F1Grid
        ref={gridRef}
        rows={rangeRows}
        columns={rangeColumns}
        rowKey="id"
        initialSelectedRowIds={['dashboard']}
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'DASH' }));
    fireEvent.change(screen.getByDisplayValue('DASH'), {
      target: { value: 'DASH-UPDATED' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('DASH-UPDATED'), {
      key: 'Enter',
    });
    const changesBeforeLoading = gridRef.current?.getChanges();
    expect(changesBeforeLoading?.updatedRows).toEqual([
      { id: 'dashboard', code: 'DASH-UPDATED' },
    ]);

    const startCell = screen.getByRole('gridcell', { name: 'DASH-UPDATED' });
    const endCell = screen.getByRole('gridcell', { name: 'SET' });
    fireEvent.mouseDown(startCell);
    fireEvent.mouseEnter(endCell);
    fireEvent.mouseUp(endCell);

    expect(document.querySelector('[data-range-overlay="drag"]')).toBeInTheDocument();

    rerender(
      <F1Grid
        ref={gridRef}
        rows={rangeRows}
        columns={rangeColumns}
        rowKey="id"
        initialSelectedRowIds={['dashboard']}
        loading
      />,
    );

    expect(document.querySelector('[data-range-overlay]')).not.toBeInTheDocument();
    expect(gridRef.current?.getSelectedRowIds()).toEqual(['dashboard']);
    expect(gridRef.current?.getChanges()).toEqual(changesBeforeLoading);

    rerender(
      <F1Grid
        ref={gridRef}
        rows={rangeRows}
        columns={rangeColumns}
        rowKey="id"
        initialSelectedRowIds={['dashboard']}
      />,
    );

    expect(document.querySelector('[data-range-overlay]')).not.toBeInTheDocument();
    expect(
      document.querySelector<HTMLInputElement>(
        '[data-f1-grid-row-id="dashboard"] input[type="checkbox"]',
      ),
    ).toBeChecked();
    expect(
      screen.getByRole('gridcell', { name: 'DASH-UPDATED' }),
    ).toBeInTheDocument();
  });

  it('clears a copied range when loading starts', () => {
    const rangeRows = [
      { id: 'one', code: 'A' },
      { id: 'two', code: 'B' },
    ];
    const rangeColumns: F1GridColumn<(typeof rangeRows)[number]>[] = [
      { field: 'code', headerName: 'Code' },
    ];
    const { rerender } = render(
      <F1Grid rows={rangeRows} columns={rangeColumns} rowKey="id" />,
    );

    const startCell = screen.getByRole('gridcell', { name: 'A' });
    const endCell = screen.getByRole('gridcell', { name: 'B' });
    fireEvent.mouseDown(startCell);
    fireEvent.mouseEnter(endCell);
    fireEvent.mouseUp(endCell);
    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: {
        getData: vi.fn(() => 'A\nB'),
        setData: vi.fn(),
      },
    });

    expect(
      document.querySelector('[data-range-overlay="copy"]'),
    ).toBeInTheDocument();

    rerender(
      <F1Grid
        rows={rangeRows}
        columns={rangeColumns}
        rowKey="id"
        loading
      />,
    );

    expect(document.querySelector('[data-range-overlay]')).not.toBeInTheDocument();
  });

  it('does not apply a pending pointer move after loading resets a drag', () => {
    const rows = [
      { id: 'one', code: 'A' },
      { id: 'two', code: 'B' },
      { id: 'three', code: 'C' },
    ];
    const columns: F1GridColumn<(typeof rows)[number]>[] = [
      { field: 'code', headerName: 'Code' },
    ];
    const frameCallbacks = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const requestFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        const frameId = nextFrameId++;
        frameCallbacks.set(frameId, callback);
        return frameId;
      });
    const cancelFrame = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation((frameId) => {
        frameCallbacks.delete(frameId);
      });
    const elementsFromPointDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'elementsFromPoint',
    );

    try {
      const { rerender } = render(
        <F1Grid rows={rows} columns={columns} rowKey="id" />,
      );
      const firstCell = screen.getByRole('gridcell', { name: 'A' });
      const thirdCell = screen.getByRole('gridcell', { name: 'C' });
      frameCallbacks.clear();
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        value: () => [thirdCell],
      });

      fireEvent.mouseDown(firstCell);
      fireEvent.pointerMove(window, { clientX: 10, clientY: 10 });
      expect(frameCallbacks.size).toBe(1);

      rerender(
        <F1Grid rows={rows} columns={columns} rowKey="id" loading />,
      );
      rerender(<F1Grid rows={rows} columns={columns} rowKey="id" />);

      const secondCellAfterLoading = screen.getByRole('gridcell', {
        name: 'B',
      });
      const thirdCellAfterLoading = screen.getByRole('gridcell', {
        name: 'C',
      });
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        value: () => [thirdCellAfterLoading],
      });
      fireEvent.mouseDown(secondCellAfterLoading);
      act(() => {
        frameCallbacks.forEach((callback) => callback(16));
      });

      expect(secondCellAfterLoading).toHaveAttribute(
        'data-grid-selected',
        'true',
      );
      expect(thirdCellAfterLoading).not.toHaveAttribute(
        'data-grid-selected',
        'true',
      );
      expect(document.querySelector('[data-range-overlay="drag"]')).not.toBeInTheDocument();
    } finally {
      requestFrame.mockRestore();
      cancelFrame.mockRestore();
      if (elementsFromPointDescriptor) {
        Object.defineProperty(
          document,
          'elementsFromPoint',
          elementsFromPointDescriptor,
        );
      } else {
        Reflect.deleteProperty(document, 'elementsFromPoint');
      }
    }
  });

  it('does not scan all rows during cell range drag', async () => {
    let rowIdReads = 0;
    const largeRows = Array.from({ length: 10_000 }, (_, index) => {
      const row = { id: `row-${index}`, code: `CODE-${index}` };
      Object.defineProperty(row, 'id', {
        configurable: true,
        enumerable: true,
        get: () => {
          rowIdReads += 1;
          return `row-${index}`;
        },
      });
      return row;
    });
    const largeColumns: F1GridColumn<(typeof largeRows)[number]>[] = [
      { field: 'code', headerName: 'Code' },
    ];
    const { container } = render(
      <F1Grid
        rows={largeRows}
        columns={largeColumns}
        rowKey="id"
        showCheckbox={false}
        virtualizeRows
        height={240}
        rowHeight={32}
      />,
    );
    const bodyScroll = container.querySelector<HTMLElement>(
      '[data-testid="f1-grid-body-scroll"]',
    );
    if (!bodyScroll) throw new Error('Expected the grid body to be rendered.');
    Object.defineProperty(bodyScroll, 'scrollTop', {
      configurable: true,
      value: 320_000,
      writable: true,
    });
    Object.defineProperty(bodyScroll, 'clientHeight', {
      configurable: true,
      value: 240,
    });
    fireEvent.scroll(bodyScroll);
    await waitFor(() => {
      const renderedRows = container.querySelectorAll('[data-f1-grid-row-id]');
      const lastRenderedRow = renderedRows.item(renderedRows.length - 1);
      expect(
        Number(lastRenderedRow?.getAttribute('data-f1-grid-row-id')?.slice(4)),
      ).toBeGreaterThan(9_000);
    });
    const renderedRows = container.querySelectorAll('[data-f1-grid-row-id]');
    const startCell = renderedRows
      .item(0)
      .querySelector<HTMLElement>('[role="gridcell"]');
    const targetCell = renderedRows
      .item(renderedRows.length - 1)
      .querySelector<HTMLElement>('[role="gridcell"]');
    if (!startCell || !targetCell) {
      throw new Error('Expected virtualized grid cells to be rendered.');
    }
    const elementsFromPointDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'elementsFromPoint',
    );

    try {
      Object.defineProperty(document, 'elementsFromPoint', {
        configurable: true,
        value: () => [targetCell],
      });

      fireEvent.mouseDown(startCell);
      rowIdReads = 0;
      fireEvent.pointerMove(window, { clientX: 10, clientY: 10 });

      await waitFor(() => {
        expect(
          document.querySelector('[data-range-overlay="drag"]'),
        ).toBeInTheDocument();
      });

      expect(rowIdReads).toBeLessThan(100);
    } finally {
      if (elementsFromPointDescriptor) {
        Object.defineProperty(
          document,
          'elementsFromPoint',
          elementsFromPointDescriptor,
        );
      } else {
        Reflect.deleteProperty(document, 'elementsFromPoint');
      }
    }
  });

  it('keeps the drag overlay within the selected cell bounds', async () => {
    const { container } = render(
      <ThemeProvider theme={createAppTheme()}>
        <AppSettingsProvider>
          <F1Grid
            rows={rows}
            columns={columns}
            rowKey="id"
            showCheckbox={false}
          />
        </AppSettingsProvider>
      </ThemeProvider>,
    );

    const cells = Array.from(container.querySelectorAll('[role="gridcell"]'));
    expect(cells.length).toBeGreaterThanOrEqual(4);

    const startCell = cells[0] as HTMLElement;
    const endCell = cells[1] as HTMLElement;
    const bodyScroll = container.querySelector(
      '[role="grid"] > div:last-child',
    );
    const mockGetBoundingClientRect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
        if (this === startCell) {
          return {
            left: 100,
            top: 40,
            right: 180,
            bottom: 90,
            width: 80,
            height: 50,
            x: 100,
            y: 40,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === endCell) {
          return {
            left: 100,
            top: 90,
            right: 180,
            bottom: 160,
            width: 80,
            height: 70,
            x: 100,
            y: 90,
            toJSON: () => ({}),
          } as DOMRect;
        }
        if (this === bodyScroll) {
          return {
            left: 0,
            top: 0,
            right: 400,
            bottom: 220,
            width: 400,
            height: 220,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          } as DOMRect;
        }
        return {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    fireEvent.mouseDown(startCell);
    fireEvent.mouseEnter(endCell);

    await waitFor(() => {
      expect(document.querySelector('[data-range-overlay]')).not.toBeNull();
    });

    const overlay = document.querySelector(
      '[data-range-overlay]',
    ) as HTMLElement;
    const overlayStyle = window.getComputedStyle(overlay);

    expect(parseFloat(overlayStyle.width)).toBeLessThanOrEqual(80);
    expect(parseFloat(overlayStyle.height)).toBeLessThanOrEqual(120);
    expect(parseFloat(overlayStyle.left)).toBeGreaterThanOrEqual(100);
    expect(parseFloat(overlayStyle.top)).toBeGreaterThanOrEqual(40);
    expect(parseFloat(overlayStyle.width)).toBeLessThanOrEqual(80 - 2);
    expect(parseFloat(overlayStyle.height)).toBeLessThanOrEqual(120 - 2);

    mockGetBoundingClientRect.mockRestore();
  });
});

describe('F1-GRID validation', () => {
  it('returns field errors for required, bounds, and custom validation', () => {
    const errors = validateGridRow(
      { id: 'line-1', itemCode: '', qty: 0, name: '湲덌옙? ?占쎈ぉ' },
      [
        { field: 'itemCode', headerName: '?占쎈ぉ肄붾뱶', required: true },
        { field: 'qty', headerName: '?占쎈웾', min: 1, max: 9 },
        {
          field: 'name',
          headerName: 'Item name',
          validate: (value) =>
            value === '湲덌옙? ?占쎈ぉ'
              ? '?占쎈줉?????占쎈뒗 ?占쎈ぉ?占쎈땲??'
              : true,
        },
      ],
    );

    expect(errors).toEqual({
      itemCode: '?占쎈ぉ肄붾뱶?占??? ?占쎌닔?占쎈땲??',
      qty: '?占쎈웾?占??? 1 ?占쎌긽?占쎌뼱???占쎈땲??',
      name: '?占쎈줉?????占쎈뒗 ?占쎈ぉ?占쎈땲??',
    });
  });

  it('renders an empty-state message when there are no rows', () => {
    render(<F1Grid rows={[]} columns={columns} rowKey="id" />);

    expect(
      screen.getByText('?占쎌씠?占쏙옙? ?占쎌뒿?占쎈떎'),
    ).toBeInTheDocument();
  });
});

describe('F1-GRID extended editors', () => {
  it('normalizes supported date input shortcuts from the current date', () => {
    const now = dayjs('2026-08-28T12:00:00');

    expect(normalizeDateInput('01', now)).toBe('2026-08-01');
    expect(normalizeDateInput('0701', now)).toBe('2026-07-01');
    expect(normalizeDateInput('250604', now)).toBe('2025-06-04');
    expect(normalizeDateInput('20260801', now)).toBe('2026-08-01');
    expect(normalizeDateInput('6-5', now)).toBe('2026-06-05');
    expect(normalizeDateInput('1', now)).toBe('2026-08-01');
    expect(normalizeDateInput('0231', now)).toBe('');
  });

  it('formats currency values for display', () => {
    expect(
      getCellDisplayValue(
        { field: 'price', headerName: '?占쏙옙?', type: 'currency' },
        12000,
      ),
    ).toBe('12,000');
  });

  it('applies a code picker patch to related row fields', () => {
    const gridRef =
      createRef<
        F1GridRef<{ id: string; itemCode: string; itemName: string }>
      >();
    const onOpenCodePicker = () => ({
      itemCode: 'ITEM-002',
      itemName: '?占쎌뒪???占쎈ぉ',
    });

    render(
      <F1Grid
        ref={gridRef}
        rows={[
          { id: 'line-1', itemCode: 'ITEM-001', itemName: '湲곗〈 ?占쎈ぉ' },
        ]}
        columns={[
          {
            field: 'itemCode',
            headerName: '?占쎈ぉ肄붾뱶',
            type: 'code',
            editable: true,
            onOpenCodePicker,
          },
          { field: 'itemName', headerName: 'Item name', editable: true },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ITEM-001' }));
    fireEvent.click(screen.getByRole('button', { name: '肄붾뱶 ?占쏀깮' }));

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        itemCode: 'ITEM-002',
        itemName: '?占쎌뒪???占쎈ぉ',
      }),
    ]);
  });

  it('fills the code picker button to the editor cell width', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', itemCode: 'ITEM-001' }]}
        columns={[
          {
            field: 'itemCode',
            headerName: '품목코드',
            type: 'code',
            editable: true,
            onOpenCodePicker: () => ({}),
          },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ITEM-001' }));

    expect(screen.getByRole('button', { name: '코드 선택' })).toHaveStyle({
      width: '100%',
    });
  });

  it.each([
    ['code', 'another cell'],
    ['code', 'outside the grid'],
    ['select', 'another cell'],
    ['select', 'outside the grid'],
  ] as const)(
    'dismisses an unselected %s editor on clicking %s without changing the value',
    (type, target) => {
      type PickerRow = { id: string; code: number; name: string };
      const gridRef = createRef<F1GridRef<PickerRow>>();
      const onOpenCodePicker = vi.fn();
      const onValueChange = vi.fn();
      render(
        <F1Grid
          ref={gridRef}
          rows={[{ id: 'line-1', code: 101, name: 'Original item' }]}
          columns={[
            {
              field: 'code',
              headerName: 'Code',
              type,
              editable: true,
              options: [{ value: 101, label: '101' }],
              onOpenCodePicker,
              onValueChange,
            },
            { field: 'name', headerName: 'Name' },
          ]}
          rowKey="id"
        />,
      );
      fireEvent.doubleClick(screen.getByRole('gridcell', { name: '101' }));
      expect(
        screen.getByRole(type === 'code' ? 'button' : 'combobox', {
          ...(type === 'code' ? { name: '코드 선택' } : {}),
        }),
      ).toBeInTheDocument();

      const clickTarget =
        target === 'another cell'
          ? screen.getByRole('gridcell', { name: 'Original item' })
          : document.body;
      fireEvent.mouseDown(clickTarget);
      fireEvent.mouseUp(clickTarget);
      fireEvent.click(clickTarget);

      expect(screen.queryByRole('button', { name: '코드 선택' })).toBeNull();
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.getByRole('gridcell', { name: '101' })).toBeVisible();
      expect(gridRef.current?.getChanges().updatedRows).toEqual([]);
      expect(onOpenCodePicker).not.toHaveBeenCalled();
      if (type === 'code') expect(onValueChange).not.toHaveBeenCalled();
    },
  );

  it.each(['backdrop', 'Escape'] as const)(
    'exits a select editor without changes when its menu closes via %s',
    (dismissal) => {
      type PickerRow = { id: string; code: number };
      const gridRef = createRef<F1GridRef<PickerRow>>();
      render(
        <F1Grid
          ref={gridRef}
          rows={[{ id: 'line-1', code: 101 }]}
          columns={[
            {
              field: 'code',
              headerName: 'Code',
              type: 'select',
              editable: true,
              options: [
                { value: 101, label: 'Original code' },
                { value: 102, label: 'Another code' },
              ],
            },
          ]}
          rowKey="id"
        />,
      );
      fireEvent.doubleClick(
        screen.getByRole('gridcell', { name: 'Original code' }),
      );
      fireEvent.mouseDown(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeVisible();

      if (dismissal === 'backdrop') {
        const backdrop = document.querySelector('.MuiBackdrop-root')!;
        fireEvent.mouseDown(backdrop);
        fireEvent.mouseUp(backdrop);
        fireEvent.click(backdrop);
      } else {
        fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
      }

      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.getByRole('gridcell', { name: 'Original code' })).toBeVisible();
      expect(gridRef.current?.getChanges().updatedRows).toEqual([]);
    },
  );

  it('keeps a selected numeric code when the select menu closes', () => {
    type PickerRow = { id: string; code: number };
    const gridRef = createRef<F1GridRef<PickerRow>>();
    const endEdit = vi.fn();
    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'line-1', code: 101 }]}
        columns={[
          {
            field: 'code',
            headerName: 'Code',
            type: 'select',
            editable: true,
            options: [
              { value: 101, label: 'Original code' },
              { value: 102, label: 'Another code' },
            ],
          },
        ]}
        rowKey="id"
        editorPlugins={[{ endEdit }]}
      />,
    );
    fireEvent.doubleClick(
      screen.getByRole('gridcell', { name: 'Original code' }),
    );
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Another code' }));
    fireEvent.click(screen.getByRole('option', { name: 'Another code' }));

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('gridcell', { name: 'Another code' })).toBeVisible();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ code: 102 }),
    ]);
    expect(endEdit).toHaveBeenCalledTimes(1);
  });

  it('stores autocomplete, decimal, datetime, and time editor values', () => {
    type ExtendedRow = {
      id: string;
      status: string;
      ratio: number;
      deliveryAt: string;
      workTime: string;
    };
    const gridRef = createRef<F1GridRef<ExtendedRow>>();
    const extendedColumns: F1GridColumn<ExtendedRow>[] = [
      {
        field: 'status',
        headerName: '?占쏀깭',
        type: 'autocomplete',
        editable: true,
        options: [
          { value: 'ready', label: 'Ready' },
          { value: 'done', label: '?占쎈즺' },
        ],
      },
      { field: 'ratio', headerName: '鍮꾩쑉', type: 'decimal', editable: true },
      {
        field: 'deliveryAt',
        headerName: '?占쎄린 ?占쎌떆',
        type: 'datetime',
        editable: true,
      },
      {
        field: 'workTime',
        headerName: '?占쎌뾽 ?占쎄컖',
        type: 'time',
        editable: true,
      },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={[
          {
            id: 'line-1',
            status: 'ready',
            ratio: 1.5,
            deliveryAt: '2026-08-28T09:30',
            workTime: '09:30',
          },
        ]}
        columns={extendedColumns}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ready' }));
    fireEvent.change(screen.getByDisplayValue('ready'), {
      target: { value: '?占쎈즺' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('?占쎈즺'), { key: 'Enter' });
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '1.5' }));
    fireEvent.change(screen.getByDisplayValue('1.5'), {
      target: { value: '2.75' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('2.75'), { key: 'Enter' });
    fireEvent.doubleClick(
      screen.getByRole('gridcell', { name: '2026-08-28T09:30' }),
    );
    fireEvent.change(screen.getByDisplayValue('2026-08-28T09:30'), {
      target: { value: '2026-08-29T11:45' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('2026-08-29T11:45'), {
      key: 'Enter',
    });
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '09:30' }));
    fireEvent.change(screen.getByDisplayValue('09:30'), {
      target: { value: '14:15' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('14:15'), { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        status: 'done',
        ratio: 2.75,
        deliveryAt: '2026-08-29T11:45',
        workTime: '14:15',
      }),
    ]);
  });

  it('stores the option value when an autocomplete edit is committed via Tab', () => {
    type StatusRow = { id: string; status: string; note: string };
    const gridRef = createRef<F1GridRef<StatusRow>>();
    const statusColumns: F1GridColumn<StatusRow>[] = [
      {
        field: 'status',
        headerName: '?占쏀깭',
        type: 'autocomplete',
        editable: true,
        options: [
          { value: 'ready', label: 'Ready' },
          { value: 'done', label: '?占쎈즺' },
        ],
      },
      { field: 'note', headerName: '鍮꾧퀬', editable: true },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'line-1', status: 'ready', note: '' }]}
        columns={statusColumns}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ready' }));
    fireEvent.change(screen.getByDisplayValue('ready'), {
      target: { value: '?占쎈즺' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('?占쎈즺'), { key: 'Tab' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'line-1', status: 'done' }),
    ]);
  });

  it('opens the time picker when the time editor button is clicked', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', workTime: '09:30' }]}
        columns={[
          {
            field: 'workTime',
            headerName: '?占쎌뾽 ?占쎄컖',
            type: 'time',
            editable: true,
          },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '09:30' }));
    fireEvent.click(screen.getByRole('button', { name: /Choose time/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('F1-GRID dirty indicator across column types', () => {
  type MixedRow = {
    id: string;
    name: string;
    qty: number;
    active: boolean;
    startDate: string;
    workTime: string;
  };
  const mixedColumns: F1GridColumn<MixedRow>[] = [
    { field: 'name', headerName: '?占쎈쫫', editable: true },
    { field: 'qty', headerName: '?占쎈웾', type: 'number', editable: true },
    {
      field: 'active',
      headerName: '?占쎌슜',
      type: 'checkbox',
      editable: true,
    },
    {
      field: 'startDate',
      headerName: 'Status',
      type: 'date',
      editable: true,
    },
    {
      field: 'workTime',
      headerName: '?占쎌뾽?占쎄컖',
      type: 'time',
      editable: true,
    },
  ];
  const mixedRows: MixedRow[] = [
    {
      id: 'line-1',
      name: 'Item',
      qty: 5,
      active: false,
      startDate: '2026-08-27',
      workTime: '09:30',
    },
  ];

  it('marks a text cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const nameCell = screen.getByRole('gridcell', { name: 'Item' });
    fireEvent.doubleClick(nameCell);
    fireEvent.change(screen.getByDisplayValue('Item'), {
      target: { value: 'Item-2' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('Item-2'), { key: 'Enter' });

    expect(nameCell).toHaveAttribute('data-dirty-cell', 'true');
  });

  it('marks a number cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const qtyCell = screen.getByRole('gridcell', { name: '5' });
    fireEvent.doubleClick(qtyCell);
    fireEvent.change(screen.getByDisplayValue('5'), {
      target: { value: '9' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('9'), { key: 'Enter' });

    expect(qtyCell).toHaveAttribute('data-dirty-cell', 'true');
  });

  it('keeps an unchanged empty nullable number cell clean after edit commit', () => {
    type NullableNumberRow = { id: string; expiryedCount: number | null };
    const gridRef = createRef<F1GridRef<NullableNumberRow>>();
    const nullableNumberRows: NullableNumberRow[] = [
      { id: 'material-1', expiryedCount: null },
    ];
    const nullableNumberColumns: F1GridColumn<NullableNumberRow>[] = [
      {
        field: 'expiryedCount',
        headerName: '소비기한 숫자',
        type: 'number',
        editable: true,
      },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={nullableNumberRows}
        columns={nullableNumberColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const countCell = screen.getByRole('gridcell');
    fireEvent.doubleClick(countCell);
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter' });

    expect(gridRef.current?.getRows()[0].expiryedCount).toBeNull();
    expect(countCell).toHaveAttribute('data-dirty-cell', 'false');
    expect(gridRef.current?.getChanges()).toEqual({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [],
    });
  });

  it('keeps an explicitly entered zero distinct from an empty nullable number', () => {
    type NullableNumberRow = { id: string; expiryedCount: number | null };
    const gridRef = createRef<F1GridRef<NullableNumberRow>>();
    const nullableNumberRows: NullableNumberRow[] = [
      { id: 'material-1', expiryedCount: null },
    ];
    const nullableNumberColumns: F1GridColumn<NullableNumberRow>[] = [
      {
        field: 'expiryedCount',
        headerName: '소비기한 숫자',
        type: 'number',
        editable: true,
      },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={nullableNumberRows}
        columns={nullableNumberColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell'));
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '0' },
    });
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter' });

    expect(gridRef.current?.getRows()[0].expiryedCount).toBe(0);
    expect(screen.getByRole('gridcell')).toHaveAttribute(
      'data-dirty-cell',
      'true',
    );
    expect(gridRef.current?.getChanges().updatedRows).toHaveLength(1);
  });

  it('marks a checkbox cell dirty after a toggle', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const checkbox = screen.getByRole('checkbox', { name: '?占쎌슜 line-1' });
    fireEvent.click(checkbox);

    expect(checkbox.closest('[role="gridcell"]')).toHaveAttribute(
      'data-dirty-cell',
      'true',
    );
  });

  it('marks a date cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const dateCell = screen.getByRole('gridcell', { name: '2026-08-27' });
    fireEvent.doubleClick(dateCell);
    fireEvent.change(screen.getByDisplayValue('2026-08-27'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('2026-09-01'), {
      key: 'Enter',
    });

    expect(dateCell).toHaveAttribute('data-dirty-cell', 'true');
  });

  it('marks a time cell dirty after an edit', () => {
    render(
      <F1Grid
        rows={mixedRows}
        columns={mixedColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    const timeCell = screen.getByRole('gridcell', { name: '09:30' });
    fireEvent.doubleClick(timeCell);
    fireEvent.change(screen.getByDisplayValue('09:30'), {
      target: { value: '14:15' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('14:15'), { key: 'Enter' });

    expect(timeCell).toHaveAttribute('data-dirty-cell', 'true');
  });
});

describe('F1-GRID clipboard, validation, and keyboard commands', () => {
  type ItemRow = {
    id: string;
    itemCode: string;
    itemName: string;
    qty: number;
  };
  const itemColumns: F1GridColumn<ItemRow>[] = [
    {
      field: 'itemCode',
      headerName: '?占쎈ぉ肄붾뱶',
      editable: true,
      required: true,
    },
    { field: 'itemName', headerName: 'Item name', editable: true },
    {
      field: 'qty',
      headerName: '?占쎈웾',
      type: 'number',
      editable: true,
      min: 1,
    },
  ];
  const itemRows: ItemRow[] = [
    { id: 'line-1', itemCode: 'ITEM-001', itemName: '湲곗〈 ?占쎈ぉ', qty: 1 },
  ];

  it('pastes TSV from the focused cell and adds overflow rows as inserted', () => {
    const gridRef = createRef<F1GridRef<ItemRow>>();
    let nextId = 2;
    render(
      <F1Grid
        ref={gridRef}
        rows={itemRows}
        columns={itemColumns}
        rowKey="id"
        createRow={() => ({
          id: `line-${nextId++}`,
          itemCode: '',
          itemName: '',
          qty: 0,
        })}
      />,
    );

    const itemCodeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    fireEvent.click(itemCodeCell);
    fireEvent.paste(itemCodeCell, {
      clipboardData: {
        getData: () =>
          'ITEM-010\t?占쎄퇋 ?占쎈ぉ\t3\nITEM-011\t異뷂옙? ?占쎈ぉ\t4',
      },
    });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        id: 'line-1',
        itemCode: 'ITEM-010',
        itemName: '?占쎄퇋 ?占쎈ぉ',
        qty: 3,
      }),
    ]);
    expect(gridRef.current?.getChanges().insertedRows).toEqual([
      expect.objectContaining({
        id: 'line-2',
        itemCode: 'ITEM-011',
        itemName: '異뷂옙? ?占쎈ぉ',
        qty: 4,
      }),
    ]);
  });

  it('copies selected rows as tab-separated clipboard text', () => {
    render(<F1Grid rows={itemRows} columns={itemColumns} rowKey="id" />);
    fireEvent.click(screen.getByLabelText('line-1 ???占쏀깮'));
    const setData = vi.fn();

    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: { setData },
    });

    expect(setData).toHaveBeenCalledWith(
      'text/plain',
      'ITEM-001\t湲곗〈 ?占쎈ぉ\t1',
    );
  });

  it('returns false and marks invalid cells through validate()', () => {
    const gridRef = createRef<F1GridRef<ItemRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={[{ ...itemRows[0], itemCode: '', qty: 0 }]}
        columns={itemColumns}
        rowKey="id"
      />,
    );

    let valid = true;
    act(() => {
      valid = gridRef.current?.validate() ?? true;
    });
    expect(valid).toBe(false);
    expect(
      screen.getByRole('gridcell', {
        name: '?占쎈ぉ肄붾뱶?占??? ?占쎌닔?占쎈땲??',
      }),
    ).toHaveAttribute(
      'data-grid-error',
      '?占쎈ぉ肄붾뱶?占??? ?占쎌닔?占쎈땲??',
    );
  });

  it('uses Home, End, Insert, and Ctrl+D while leaving Backspace to the editor', () => {
    const gridRef = createRef<F1GridRef<ItemRow>>();
    let nextId = 2;
    render(
      <F1Grid
        ref={gridRef}
        rows={itemRows}
        columns={itemColumns}
        rowKey="id"
        createRow={() => ({
          id: `line-${nextId++}`,
          itemCode: '',
          itemName: '',
          qty: 0,
        })}
        createDuplicate={(row) => ({ ...row, id: `line-${nextId++}` })}
      />,
    );

    const codeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    fireEvent.click(codeCell);
    fireEvent.keyDown(codeCell, { key: 'End' });
    expect(document.activeElement).toBe(
      screen.getByRole('gridcell', { name: '1' }),
    );
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(codeCell);
    act(() => {
      gridRef.current?.clearSelection();
    });
    fireEvent.keyDown(codeCell, { key: 'Backspace' });
    expect(gridRef.current?.getChanges().updatedRows).toHaveLength(0);
    fireEvent.keyDown(codeCell, { key: 'Insert' });
    expect(gridRef.current?.getChanges().insertedRows).toHaveLength(1);
    act(() => {
      gridRef.current?.clearSelection();
    });
    fireEvent.click(screen.getByLabelText('line-1 ???占쏀깮'));
    fireEvent.keyDown(codeCell, { key: 'd', ctrlKey: true });
    expect(gridRef.current?.getChanges().insertedRows).toHaveLength(2);
  });
});

describe('F1-GRID row state', () => {
  it('rejects a duplicate row ID before adding a row', () => {
    const data = createGridData(rows, 'id');
    const duplicate = addGridRow(data, rows[0], 'id');

    expect(hasGridRowId(data.rows, 'id', 'dashboard')).toBe(true);
    expect(hasGridRowId(data.rows, 'id', 'new-row')).toBe(false);
    expect(duplicate.rows).toHaveLength(data.rows.length);
  });

  it('keeps inserted rows inserted after edits and returns them as changes', () => {
    const added = addGridRow(
      createGridData(rows, 'id'),
      { id: 'menus', code: 'MENU', order: 3, enabled: true },
      'id',
    );
    const updated = updateGridRow(added, 'id', 'menus', { order: 4 });

    expect(updated.stateById.menus).toBe('inserted');
    expect(getGridChanges(updated, 'id').insertedRows).toEqual([
      { id: 'menus', code: 'MENU', order: 4, enabled: true },
    ]);
  });

  it('removes newly inserted rows from all changes when deleted', () => {
    const added = addGridRow(
      createGridData(rows, 'id'),
      {
        id: 'menus',
        code: 'MENU',
        order: 3,
        enabled: true,
        startDate: '2026-08-29',
        status: 'draft',
      },
      'id',
    );
    const deleted = markRowsDeleted(added, 'id', ['menus']);

    expect(getGridChanges(deleted, 'id')).toEqual({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [],
    });
  });

  it('marks edited original rows as updated', () => {
    const updated = updateGridRow(
      createGridData(rows, 'id'),
      'id',
      'settings',
      {
        enabled: false,
      },
    );

    expect(updated.stateById.settings).toBe('updated');
    expect(getGridChanges(updated, 'id').updatedRows).toEqual([
      expect.objectContaining({
        id: 'settings',
        code: 'SET',
        order: 2,
        enabled: false,
      }),
    ]);
  });

  it('keeps deleted rows in the change set and restores their prior states', () => {
    const deleted = markRowsDeleted(
      updateGridRow(createGridData(rows, 'id'), 'id', 'settings', { order: 9 }),
      'id',
      ['dashboard', 'settings'],
    );

    expect(getGridChanges(deleted, 'id').deletedRows).toEqual([
      expect.objectContaining({
        id: 'dashboard',
        code: 'DASH',
        order: 1,
        enabled: true,
      }),
      expect.objectContaining({
        id: 'settings',
        code: 'SET',
        order: 9,
        enabled: true,
      }),
    ]);
    expect(restoreGridRows(deleted).stateById).toEqual({
      dashboard: 'normal',
      settings: 'updated',
    });
  });

  it('duplicates selected rows as inserted rows with consumer-provided IDs', () => {
    const duplicated = duplicateGridRows(
      createGridData(rows, 'id'),
      'id',
      ['dashboard'],
      (row) => ({ ...row, id: `${row.id}-copy` }),
    );

    expect(duplicated.rows.at(-1)).toEqual(
      expect.objectContaining({
        id: 'dashboard-copy',
        code: 'DASH',
        order: 1,
        enabled: true,
      }),
    );
    expect(duplicated.stateById['dashboard-copy']).toBe('inserted');
  });
});

describe('F1-GRID row merge', () => {
  it('merges only contiguous equal values and exposes each group span', () => {
    const mergeInfo = getGridMergeInfo(
      [
        { id: '1', group: 'A' },
        { id: '2', group: 'A' },
        { id: '3', group: 'B' },
        { id: '4', group: 'A' },
      ],
      'group',
    );

    expect(mergeInfo).toEqual([
      { isStart: true, span: 2 },
      { isStart: false, span: 0 },
      { isStart: true, span: 1 },
      { isStart: true, span: 1 },
    ]);
  });

  it('keeps a lower merge inside the active parent merge group', () => {
    const rows = [
      { id: '1', itemName: '?占쎈ぉ A', category: 'RAW' },
      { id: '2', itemName: '?占쎈ぉ A', category: 'RAW' },
      { id: '3', itemName: '?占쎈ぉ B', category: 'RAW' },
      { id: '4', itemName: '?占쎈ぉ B', category: 'RAW' },
    ];
    const itemNameInfo = getGridMergeInfo(rows, 'itemName');
    const parentGroupByRow: number[] = [];

    itemNameInfo.forEach((info, rowIndex) => {
      parentGroupByRow[rowIndex] = info.isStart
        ? rowIndex
        : rowIndex > 0
          ? parentGroupByRow[rowIndex - 1]
          : rowIndex;
    });

    const categoryInfo = getGridMergeInfo(rows, 'category', parentGroupByRow);

    expect(categoryInfo).toEqual([
      { isStart: true, span: 2 },
      { isStart: false, span: 0 },
      { isStart: true, span: 2 },
      { isStart: false, span: 0 },
    ]);
  });

  it('renders a bottom boundary for a merged span', () => {
    expect(getGridCellBottomBorder(false, true, true, 2)).toBe(1);
    expect(getGridCellBottomBorder(false, false, true, 2)).toBe(1);
    expect(getGridCellBottomBorder(false, false, false, 2, true)).toBe(1);
    expect(getGridCellBottomBorder(false, false, true, 1)).toBeUndefined();
    expect(getGridCellBottomBorder(false, true, false)).toBe(0);
    expect(getGridCellBottomBorder(true, true, false)).toBe(0);
    expect(getGridCellBottomBorder(true, false, false)).toBe(1);
  });

  it('resolves the merge-group start from a later row in the same merged group', () => {
    const rows = [
      { id: '1', itemName: '?占쎈ぉ A' },
      { id: '2', itemName: '?占쎈ぉ A' },
      { id: '3', itemName: '?占쎈ぉ B' },
    ];

    expect(getMergeGroupStartIndex(rows, 1, 'itemName')).toBe(0);
    expect(getMergeGroupStartIndex(rows, 2, 'itemName')).toBe(2);
  });

  it('uses any active row inside a merged group to resolve the active group start', () => {
    const rows = [
      { id: '1', itemName: '?占쎈ぉ A' },
      { id: '2', itemName: '?占쎈ぉ A' },
      { id: '3', itemName: '?占쎈ぉ B' },
    ];
    const columns = [
      { field: 'itemName', headerName: 'Item', mergeRows: true },
    ];

    const activeKeys = getActiveMergeGroupStartKeys({
      columns,
      mergeInfoByColumn: [getGridMergeInfo(rows, 'itemName')],
      visibleRows: rows,
      rowKey: 'id',
      selectedIds: ['3', '2'],
    });

    expect(activeKeys.has('0:0')).toBe(true);
    expect(activeKeys.has('0:2')).toBe(false);
  });

  it('keeps the merged group border visible when a later row is selected', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', itemName: '?占쎈ぉ A' },
          { id: '2', itemName: '?占쎈ぉ A' },
          { id: '3', itemName: '?占쎈ぉ B' },
        ]}
        columns={[{ field: 'itemName', headerName: 'Item', mergeRows: true }]}
        rowKey="id"
      />,
    );

    const mergedCells = screen.getAllByRole('gridcell');
    expect(mergedCells).toHaveLength(3);

    fireEvent.click(mergedCells[1]);

    expect(mergedCells[0]).toHaveAttribute('tabIndex', '0');
    expect(getComputedStyle(mergedCells[0]).borderBottomWidth).toBe('1px');
    expect(getComputedStyle(mergedCells[0]).outline).toContain('2px solid');
  });
});

describe('F1-GRID row height', () => {
  it('clamps row heights and applies keyboard resize steps', () => {
    expect(clampGridRowHeight(12, 40, 300)).toBe(40);
    expect(clampGridRowHeight(420, 40, 300)).toBe(300);
    expect(getGridRowHeightByKey(40, 'ArrowDown', 40, 300, 4)).toBe(44);
    expect(getGridRowHeightByKey(40, 'ArrowUp', 40, 300, 4)).toBe(40);
  });

  it('resizes only the active row with keyboard and pointer input', () => {
    render(
      <F1Grid
        rows={[
          { id: 'first', description: '占?踰덉㎏ 占??占쎈챸' },
          { id: 'second', description: '??踰덉㎏ 占??占쎈챸' },
        ]}
        columns={[
          { field: 'description', headerName: '?占쎈챸', wrapText: true },
        ]}
        rowKey="id"
        minRowHeight={40}
        maxRowHeight={120}
      />,
    );

    const handles = screen.getAllByRole('button', {
      name: /\?\?\?占쎌씠 議곗젅/,
    });
    expect(handles).toHaveLength(2);
    expect(handles[0]).toHaveAttribute('aria-valuenow', '40');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '40');

    fireEvent.keyDown(handles[0], { key: 'ArrowDown' });
    expect(handles[0]).toHaveAttribute('aria-valuenow', '44');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '40');

    fireEvent.pointerDown(handles[0], { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(window, { clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(window, { clientY: 300, pointerId: 1 });
    expect(handles[0]).toHaveAttribute('aria-valuenow', '120');
    expect(handles[1]).toHaveAttribute('aria-valuenow', '40');
  });

  it('uses ellipsis by default and wraps configured cells after resizing', () => {
    const longText =
      '?占??占쎌뿉???占쎈윭 以꾨줈 ?占쎌떆?占쎌뼱???占쎈뒗 占??占쎈챸?占쎈땲??';
    render(
      <F1Grid
        rows={[{ id: 'first', wrapped: longText, clipped: longText }]}
        columns={[
          { field: 'wrapped', headerName: 'Wrapped', wrapText: true },
          { field: 'clipped', headerName: 'Clipped' },
        ]}
        rowKey="id"
      />,
    );

    const wrappedText = screen.getAllByText(longText)[0];
    expect(wrappedText).toHaveAttribute('title', longText);
    expect(wrappedText).toHaveStyle({ whiteSpace: 'nowrap' });
    expect(wrappedText.parentElement).toHaveStyle({
      minWidth: '0px',
      overflow: 'hidden',
    });

    fireEvent.keyDown(
      screen.getByRole('button', { name: /\?\?\?占쎌씠 議곗젅/ }),
      {
        key: 'ArrowDown',
      },
    );
    expect(wrappedText).toHaveStyle({ whiteSpace: 'normal' });
  });

  it('scales default row height by the AppSettings display scale', () => {
    window.localStorage.setItem('erp-display-scale', '1.2');
    render(
      <AppSettingsProvider>
        <F1Grid
          rows={[{ id: 'first', code: 'A' }]}
          columns={[{ field: 'code', headerName: '肄붾뱶' }]}
          rowKey="id"
          minRowHeight={40}
          maxRowHeight={200}
        />
      </AppSettingsProvider>,
    );

    const handle = screen.getByRole('button', { name: /\?\?\?占쎌씠 議곗젅/ });
    expect(handle).toHaveAttribute('aria-valuenow', '48');
    window.localStorage.removeItem('erp-display-scale');
  });

  it('defaults to an unscaled row height without an AppSettingsProvider', () => {
    render(
      <F1Grid
        rows={[{ id: 'first', code: 'A' }]}
        columns={[{ field: 'code', headerName: '肄붾뱶' }]}
        rowKey="id"
        minRowHeight={40}
        maxRowHeight={200}
      />,
    );

    const handle = screen.getByRole('button', { name: /\?\?\?占쎌씠 議곗젅/ });
    expect(handle).toHaveAttribute('aria-valuenow', '40');
  });
});

describe('F1-GRID interaction', () => {
  it('keeps horizontal overflow within a shrinkable grid root', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByRole('grid', { name: 'F1-GRID' })).toHaveStyle({
      minWidth: '0px',
      maxWidth: '100%',
      overflowX: 'auto',
    });
  });

  it('renders grouped headers as a two-row header and respects grouped headers', () => {
    render(
      <F1Grid
        rows={rows}
        columns={[
          { field: 'code', headerName: '肄붾뱶', headerGroup: '湲곕낯?占쎈낫' },
          {
            field: 'status',
            headerName: '?占쏀깭',
            headerGroup: '湲곕낯?占쎈낫',
          },
        ]}
        rowKey="id"
      />,
    );

    const groupHeader = screen.getByText('湲곕낯?占쎈낫');
    expect(groupHeader).toBeInTheDocument();
    expect(groupHeader.closest('[role="columnheader"]')).toBeTruthy();
    expect(getComputedStyle(groupHeader).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    );
    expect(screen.getByRole('gridcell', { name: 'DASH' })).toBeVisible();
    expect(screen.getAllByRole('columnheader')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textContent: '湲곕낯?占쎈낫' }),
        expect.objectContaining({ textContent: '肄붾뱶' }),
        expect.objectContaining({ textContent: '?占쏀깭' }),
      ]),
    );

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.focus(codeCell);
    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: { setData: vi.fn() },
    });
  });

  it('keeps the default cursor outside edit mode and switches to a text cursor while editing', () => {
    render(
      <F1Grid
        rows={[
          { id: 'line-1', itemCode: 'ITEM-001', itemName: '湲곗〈 ?占쎈ぉ' },
        ]}
        columns={[
          { field: 'itemCode', headerName: '?占쎈ぉ肄붾뱶', editable: true },
          { field: 'itemName', headerName: 'Item name', editable: true },
        ]}
        rowKey="id"
      />,
    );

    const itemCodeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    expect(itemCodeCell).toHaveStyle({ cursor: 'default' });

    fireEvent.doubleClick(itemCodeCell);
    const input = screen.getByDisplayValue('ITEM-001');
    expect(input).toHaveStyle({ cursor: 'text' });
  });

  it('keeps the edit focus border visible without clipping at the bottom edge', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', itemCode: 'ITEM-001' }]}
        columns={[
          { field: 'itemCode', headerName: '?占쎈ぉ肄붾뱶', editable: true },
        ]}
        rowKey="id"
      />,
    );

    const itemCodeCell = screen.getByRole('gridcell', { name: 'ITEM-001' });
    fireEvent.doubleClick(itemCodeCell);

    expect(itemCodeCell).not.toHaveStyle({ overflow: 'hidden' });
    expect(itemCodeCell).toHaveStyle({ overflow: 'visible' });
  });

  it('sizes a text editor to the full height of its compact grid cell', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', itemCode: 'ITEM-001' }]}
        columns={[
          { field: 'itemCode', headerName: '?占쎈ぉ肄붾뱶', editable: true },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: 'ITEM-001' }));

    const input = screen.getByDisplayValue('ITEM-001');
    expect(input.closest('.MuiInputBase-root')).toHaveStyle({ height: '100%' });
    expect(input).toHaveStyle({ height: '100%' });
  });

  it('sizes number editors to the full height of their compact grid cells', () => {
    render(
      <F1Grid
        rows={[{ id: 'line-1', quantity: 12 }]}
        columns={[
          {
            field: 'quantity',
            headerName: '?占쎈웾',
            type: 'number',
            editable: true,
          },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '12' }));

    const input = screen.getByDisplayValue('12');
    expect(input.closest('.MuiInputBase-root')).toHaveStyle({ height: '100%' });
    expect(input).toHaveStyle({ height: '100%' });
  });

  it('moves focus to the newly dragged cell immediately so the prior selection is cleared', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
          { id: '3', code: 'C', name: 'Gamma' },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶' },
          { field: 'name', headerName: '?占쎈쫫' },
        ]}
        rowKey="id"
      />,
    );

    const firstCell = screen.getByRole('gridcell', { name: 'A' });
    const secondCell = screen.getByRole('gridcell', { name: 'Gamma' });

    fireEvent.mouseDown(firstCell);
    fireEvent.mouseDown(secondCell);

    expect(secondCell).toHaveAttribute('tabindex', '0');
    expect(firstCell).toHaveAttribute('tabindex', '-1');
  });

  it('does not allow row resizing while a cell drag selection is active', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶' },
          { field: 'name', headerName: '?占쎈쫫' },
        ]}
        rowKey="id"
        resizableRows
      />,
    );

    const handle = screen.getAllByRole('button', { name: /행 높이 조절/ })[0];
    const start = screen.getByRole('gridcell', { name: 'A' });
    const end = screen.getByRole('gridcell', { name: 'Beta' });

    fireEvent.mouseDown(start);
    expect(handle).toHaveStyle({ pointerEvents: 'none' });

    fireEvent.mouseEnter(end);
    fireEvent.mouseUp(end);

    expect(handle).not.toHaveStyle({ pointerEvents: 'none' });
  });

  it('supports cell-range drag selection across adjacent cells', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶' },
          { field: 'name', headerName: '?占쎈쫫' },
        ]}
        rowKey="id"
      />,
    );

    const start = screen.getByRole('gridcell', { name: 'A' });
    const end = screen.getByRole('gridcell', { name: 'Beta' });
    fireEvent.mouseDown(start);
    fireEvent.mouseEnter(end);
    fireEvent.mouseUp(end);

    expect(start).toHaveAttribute('data-grid-selected', 'true');
    expect(end).toHaveAttribute('data-grid-selected', 'true');
    expect(
      document.querySelector('[data-range-overlay="drag"]'),
    ).toBeInTheDocument();
    expect(
      window.getComputedStyle(
        document.querySelector('[data-range-overlay="drag"]') as HTMLElement,
      ).borderTopStyle,
    ).toBe('solid');
  });

  it('supports cell-range drag selection across merged rows', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'A', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶', mergeRows: true },
          { field: 'name', headerName: '?占쎈쫫' },
        ]}
        rowKey="id"
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    fireEvent.mouseDown(cells[0]);
    fireEvent.mouseEnter(cells[2]);
    fireEvent.mouseUp(cells[2]);

    expect(cells[0]).toHaveAttribute('data-grid-selected', 'true');
    expect(cells[2]).toHaveAttribute('data-grid-selected', 'true');
    expect(window.getComputedStyle(cells[2]).pointerEvents).toBe('auto');
  });

  it('supports cell-range drag selection on pinned merged columns', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'A', name: 'Beta' },
        ]}
        columns={[
          {
            field: 'code',
            headerName: '肄붾뱶',
            mergeRows: true,
            pinned: 'left',
          },
          { field: 'name', headerName: '?占쎈쫫' },
        ]}
        rowKey="id"
      />,
    );

    const cells = screen.getAllByRole('gridcell');
    fireEvent.mouseDown(cells[0]);
    fireEvent.mouseEnter(cells[2]);
    fireEvent.mouseUp(cells[2]);

    expect(cells[0]).toHaveAttribute('data-grid-selected', 'true');
    expect(cells[2]).toHaveAttribute('data-grid-selected', 'true');
    expect(window.getComputedStyle(cells[2]).pointerEvents).toBe('auto');
  });

  it('keeps the top border visible when a multi-cell selection starts on the first row', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶' },
          { field: 'name', headerName: '?占쎈쫫' },
        ]}
        rowKey="id"
      />,
    );

    const start = screen.getByRole('gridcell', { name: 'A' });
    const end = screen.getByRole('gridcell', { name: 'Alpha' });
    fireEvent.mouseDown(start);
    fireEvent.mouseEnter(end);
    fireEvent.mouseUp(end);

    const overlay = document.querySelector('[data-range-overlay="drag"]');
    expect(overlay).toBeInTheDocument();
    expect(
      parseFloat((overlay as HTMLElement).style.top || '0'),
    ).toBeGreaterThanOrEqual(0);
    expect(window.getComputedStyle(overlay as HTMLElement).borderTopStyle).toBe(
      'solid',
    );
  });

  it('keeps drag selection plain and only draws a single outer rectangle around the copied range, then clears on Escape', () => {
    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶' },
          { field: 'name', headerName: '?占쎈쫫' },
        ]}
        rowKey="id"
      />,
    );

    const start = screen.getByRole('gridcell', { name: 'A' });
    const end = screen.getByRole('gridcell', { name: 'Beta' });
    fireEvent.mouseDown(start);
    fireEvent.mouseEnter(end);
    fireEvent.mouseUp(end);

    expect(start).not.toHaveStyle({ outline: '2px solid' });
    expect(window.getComputedStyle(start).border).not.toContain('solid');
    expect(window.getComputedStyle(end).border).not.toContain('solid');
    expect(start).not.toHaveStyle({ outline: '1px solid' });

    fireEvent.copy(screen.getByRole('grid', { name: 'F1-GRID' }), {
      clipboardData: {
        getData: vi.fn(() => 'A\tAlpha\nB\tBeta'),
        setData: vi.fn(),
      },
    });

    const copiedOverlay = screen
      .getByRole('grid', { name: 'F1-GRID' })
      .querySelector('[data-range-overlay="copy"]');
    expect(copiedOverlay).toBeInTheDocument();
    expect(
      window.getComputedStyle(copiedOverlay as HTMLElement).borderStyle,
    ).toBe('dashed');
    expect(window.getComputedStyle(start).border).not.toContain('solid');
    expect(window.getComputedStyle(end).border).not.toContain('solid');

    fireEvent.keyDown(start, { key: 'Escape' });
    expect(
      screen
        .getByRole('grid', { name: 'F1-GRID' })
        .querySelector('[data-range-overlay="copy"]'),
    ).not.toBeInTheDocument();
    expect(window.getComputedStyle(start).border).not.toContain('solid');
    expect(window.getComputedStyle(end).border).not.toContain('solid');
  });

  it('rebases external rows when the grid has no pending changes', () => {
    const { rerender } = render(
      <F1Grid rows={rows} columns={columns} rowKey="id" />,
    );

    rerender(
      <F1Grid
        rows={[{ ...rows[0], code: 'DASH-UPDATED' }, rows[1]]}
        columns={columns}
        rowKey="id"
      />,
    );

    expect(
      screen.getByRole('gridcell', { name: 'DASH-UPDATED' }),
    ).toBeVisible();
  });

  it('moves DOM focus to the next editable cell with Tab', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.click(codeCell);
    fireEvent.doubleClick(codeCell);
    fireEvent.keyDown(screen.getByDisplayValue('DASH'), { key: 'Tab' });

    expect(document.activeElement).toBe(
      screen.getByRole('gridcell', { name: '1' }),
    );
  });
  it('calculates Ctrl and Shift selection from visible row indexes', () => {
    expect(
      getSelectedRowIds(['dashboard'], 'settings', {
        ctrlKey: true,
        shiftKey: false,
      }),
    ).toEqual(['dashboard', 'settings']);
    expect(
      getSelectedRowIds(['dashboard'], 'settings', {
        ctrlKey: false,
        shiftKey: true,
        visibleRowIds: ['dashboard', 'settings', 'reports'],
      }),
    ).toEqual(['dashboard', 'settings']);
  });

  it('finds the next editable cell across a row boundary', () => {
    expect(
      getNextEditableCell(
        { rowIndex: 0, columnIndex: 0 },
        [
          [true, false],
          [false, true],
        ],
        1,
      ),
    ).toEqual({ rowIndex: 1, columnIndex: 1 });
  });

  it('renders vertical column lines once between columns when columnLine is enabled', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" columnLine />);

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    const orderHeader = screen.getByRole('columnheader', { name: /\?占쎈젹/ });
    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    const orderCell = screen.getByRole('gridcell', { name: '1' });

    expect(getComputedStyle(codeHeader).borderLeftWidth).toBe('0px');
    expect(getComputedStyle(codeHeader).borderRightWidth).toBe('0px');
    expect(getComputedStyle(orderHeader).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(codeCell).borderLeftWidth).toBe('0px');
    expect(getComputedStyle(orderCell).borderLeftWidth).toBe('1px');
    expect(getComputedStyle(orderCell).borderLeftColor).toBe(
      getComputedStyle(orderCell).borderTopColor,
    );
  });

  it('displays select labels and stores the selected option value', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const statusCell = screen.getByRole('gridcell', { name: '?占쎌꽦占?' });
    fireEvent.doubleClick(statusCell);
    expect(
      screen
        .getByRole('combobox')
        .closest('.MuiInputBase-root')
        ?.querySelector('fieldset'),
    ).toBeNull();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: '?占쎌젙' }));

    expect(screen.getAllByRole('gridcell', { name: '?占쎌젙' })).toHaveLength(
      2,
    );
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', status: 'confirmed' }),
    ]);
  });

  it('supports single selection with the user column in a grid cell', () => {
    type UserSelectionRow = { id: string; reviewerId: number | null };
    const gridRef = createRef<F1GridRef<UserSelectionRow>>();
    const userColumn = {
      field: 'reviewerId',
      headerName: 'Reviewer',
      editable: true,
      type: 'user',
      userOptions: [
        { value: 12, label: 'Alice Kim', positionName: 'Manager' },
        { value: 13, label: 'Bob Lee', departmentName: 'Finance' },
      ],
    } as unknown as F1GridColumn<UserSelectionRow>;

    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'form-1', reviewerId: null }]}
        columns={[userColumn]}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    const reviewerCell = screen.getByRole('gridcell');
    fireEvent.doubleClick(reviewerCell);
    expect(reviewerCell.querySelector('fieldset')).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: /Alice Kim/ }));

    expect(screen.getByRole('gridcell', { name: 'Alice Kim' })).toBeVisible();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      { id: 'form-1', reviewerId: 12 },
    ]);
  });

  it('supports multiple selection with the user column in a grid cell', () => {
    type UserSelectionRow = { id: string; assigneeIds: string[] };
    const gridRef = createRef<F1GridRef<UserSelectionRow>>();
    const userColumn = {
      field: 'assigneeIds',
      headerName: 'Assignees',
      editable: true,
      type: 'user',
      userOptions: [
        { value: 'u-1', label: 'Alice Kim' },
        { value: 'u-2', label: 'Bob Lee' },
      ],
      form: { multiple: true },
    } as unknown as F1GridColumn<UserSelectionRow>;

    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'form-1', assigneeIds: ['u-1'] }]}
        columns={[userColumn]}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell'));
    const input = screen.getByRole('combobox');
    fireEvent.click(screen.getByRole('option', { name: /Bob Lee/ }));
    fireEvent.blur(input);

    expect(
      screen.getByRole('gridcell', { name: 'Alice Kim, Bob Lee' }),
    ).toBeVisible();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      { id: 'form-1', assigneeIds: ['u-1', 'u-2'] },
    ]);
  });

  it('does not mark an unchanged multiple user selection dirty', () => {
    type UserSelectionRow = { id: string; assigneeIds: string[] };
    const gridRef = createRef<F1GridRef<UserSelectionRow>>();
    const userColumn = {
      field: 'assigneeIds',
      headerName: 'Assignees',
      editable: true,
      type: 'user',
      userOptions: [{ value: 'u-1', label: 'Alice Kim' }],
      form: { multiple: true },
    } satisfies F1GridColumn<UserSelectionRow>;

    render(
      <F1Grid
        ref={gridRef}
        rows={[{ id: 'form-1', assigneeIds: ['u-1'] }]}
        columns={[userColumn]}
        rowKey="id"
        showCheckbox={false}
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell'));
    fireEvent.blur(screen.getByRole('combobox'));

    expect(gridRef.current?.getChanges()).toEqual({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [],
    });
  });

  it('edits dates as YYYY-MM-DD values', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } });
    fireEvent.keyDown(dateInput, { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', startDate: '2026-09-01' }),
    ]);
  });

  it('accepts a compact month-day value in a date cell', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();
    const expectedDate = `${dayjs().year()}-06-05`;

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    fireEvent.change(dateInput, { target: { value: '0605' } });
    fireEvent.keyDown(dateInput, { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', startDate: expectedDate }),
    ]);
  });

  it('keeps compact date text while the date cell is still being edited', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    fireEvent.change(dateInput, { target: { value: '0605' } });

    expect(screen.getByDisplayValue('0605')).toBeInTheDocument();
  });

  it('keeps the active edit border visible for date and time editors', () => {
    render(
      <F1Grid
        rows={[
          {
            id: 'dashboard',
            code: 'DASH',
            order: 1,
            enabled: true,
            startDate: '2026-08-27',
            status: '09:30',
          },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶', editable: true },
          {
            field: 'startDate',
            headerName: 'Status',
            editable: true,
            type: 'date',
          },
          {
            field: 'status',
            headerName: '?占쏀깭',
            editable: true,
            type: 'time',
          },
        ]}
        rowKey="id"
      />,
    );

    const dateCell = screen.getByRole('gridcell', { name: '2026-08-27' });
    fireEvent.doubleClick(dateCell);
    expect(dateCell).toHaveStyle({ outline: '2px solid' });

    const timeCell = screen.getByRole('gridcell', { name: '09:30' });
    fireEvent.doubleClick(timeCell);
    expect(timeCell).toHaveStyle({ outline: '2px solid' });
  });

  it('does not apply the theme default TextField margin to date/time editors', () => {
    render(
      <F1Grid
        rows={[
          {
            id: 'dashboard',
            code: 'DASH',
            order: 1,
            enabled: true,
            startDate: '2026-08-27',
            status: '09:30',
          },
        ]}
        columns={[
          { field: 'code', headerName: '肄붾뱶', editable: true },
          {
            field: 'startDate',
            headerName: 'Status',
            editable: true,
            type: 'date',
          },
          {
            field: 'status',
            headerName: '?占쏀깭',
            editable: true,
            type: 'time',
          },
        ]}
        rowKey="id"
      />,
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '2026-08-27' }));
    const dateInput = screen.getByDisplayValue('2026-08-27');
    expect(dateInput.closest('.MuiFormControl-root')).not.toHaveClass(
      'MuiFormControl-marginNormal',
    );

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '09:30' }));
    const timeInput = screen.getByDisplayValue('09:30');
    expect(timeInput.closest('.MuiFormControl-root')).not.toHaveClass(
      'MuiFormControl-marginNormal',
    );
  });

  it('keeps cell padding while editing so the editor is not flush with the cell edge', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);

    expect(getComputedStyle(codeCell).padding).not.toBe('0px');
  });

  it('keeps predicate-disabled rows read-only', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '?占쎌젙' }));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('applies headerAlign independently from cell alignment', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByRole('columnheader', { name: /\?占쎈젹/ })).toHaveStyle({
      textAlign: 'center',
    });
  });

  it('centers cell content when align is set to center', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(screen.getByRole('gridcell', { name: '1' })).toHaveStyle({
      justifyContent: 'center',
    });
  });

  it('only renders the select-all checkbox in the header when headerCheckbox is set', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(
      screen.getByLabelText('?占쎌슜 ?占쏙옙? ?占쎌껜 ?占쏀깮'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('?占쏀깭 ?占쎌껜 ?占쏀깮'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', {
        name: /\?占쎌슜 \?占쏙옙\?/,
      }),
    ).toHaveTextContent('?占쎌슜 ?占쏙옙?');
  });

  it('selects rows through row checkboxes and exposes their IDs through the ref', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(screen.getByLabelText('dashboard ???占쏀깮'));
    fireEvent.click(screen.getByLabelText('settings ???占쏀깮'));

    expect(gridRef.current?.getSelectedRowIds()).toEqual([
      'dashboard',
      'settings',
    ]);
  });

  it('commits an inline text edit on Enter and returns the updated row', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    fireEvent.change(screen.getByDisplayValue('DASH'), {
      target: { value: 'DASH-NEW' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('DASH-NEW'), { key: 'Enter' });

    expect(screen.getByRole('gridcell', { name: 'DASH-NEW' })).toBeVisible();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({
        id: 'dashboard',
        code: 'DASH-NEW',
        order: 1,
        enabled: true,
      }),
    ]);
  });

  it('keeps the editor focused while typing multiple characters', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    const editor = screen.getByDisplayValue('DASH');

    fireEvent.change(editor, { target: { value: 'DASH-' } });

    expect(document.activeElement).toBe(editor);
  });

  it('keeps a merged value editable for a non-leading row', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();
    const mergeColumns: F1GridColumn<MenuRow>[] = [
      {
        field: 'status',
        headerName: '?占쏀깭',
        editable: true,
        mergeRows: true,
      },
    ];
    const mergeRows = [
      { ...rows[0], status: 'draft' },
      { ...rows[1], id: 'reports', status: 'draft' },
    ];

    render(
      <F1Grid
        ref={gridRef}
        rows={mergeRows}
        columns={mergeColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    expect(screen.getAllByRole('gridcell', { name: 'draft' })).toHaveLength(1);
    expect(
      getComputedStyle(screen.getAllByRole('gridcell', { name: 'draft' })[0])
        .gridRow,
    ).toBe('1/span 2');
    fireEvent.doubleClick(screen.getAllByRole('gridcell')[1]);
    expect(getComputedStyle(screen.getAllByRole('gridcell')[0]).gridRow).toBe(
      '1',
    );
    fireEvent.change(screen.getByDisplayValue('draft'), {
      target: { value: 'confirmed' },
    });
    fireEvent.keyDown(screen.getByDisplayValue('confirmed'), { key: 'Enter' });

    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'reports', status: 'confirmed' }),
    ]);
  });

  it('only unmerges the group containing the edited cell', () => {
    const mergeColumns: F1GridColumn<MenuRow>[] = [
      {
        field: 'status',
        headerName: '?占쏀깭',
        editable: true,
        mergeRows: true,
      },
    ];
    const mergeRows = [
      { ...rows[0], status: 'draft' },
      { ...rows[1], id: 'reports', status: 'draft' },
      { ...rows[0], id: 'confirmed-1', status: 'confirmed' },
      { ...rows[1], id: 'confirmed-2', status: 'confirmed' },
    ];

    render(
      <F1Grid
        rows={mergeRows}
        columns={mergeColumns}
        rowKey="id"
        editorPlugins={[{ canEdit: () => true }]}
      />,
    );

    fireEvent.doubleClick(screen.getAllByRole('gridcell')[1]);

    expect(
      getComputedStyle(
        screen.getAllByRole('gridcell', { name: 'confirmed' })[0],
      ).gridRow,
    ).toBe('3/span 2');
  });

  it('keeps merged values working on pinned left columns', () => {
    const mergeColumns: F1GridColumn<MenuRow>[] = [
      {
        field: 'status',
        headerName: '?占쏀깭',
        editable: true,
        mergeRows: true,
        pinned: 'left',
      },
      { field: 'code', headerName: '肄붾뱶', editable: true },
    ];
    const mergeRows = [
      { ...rows[0], status: 'draft', code: 'DASH' },
      { ...rows[1], id: 'reports', status: 'draft', code: 'REPORTS' },
    ];

    render(<F1Grid rows={mergeRows} columns={mergeColumns} rowKey="id" />);

    expect(screen.getAllByRole('gridcell', { name: 'draft' })).toHaveLength(1);
    expect(
      getComputedStyle(screen.getAllByRole('gridcell', { name: 'draft' })[0])
        .gridRow,
    ).toBe('1/span 2');
    expect(
      getComputedStyle(screen.getByRole('columnheader', { name: /\?占쏀깭/ }))
        .left,
    ).toBe('44px');
  });

  it('does not create an updated row when an edit is committed without a value change', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    fireEvent.keyDown(screen.getByDisplayValue('DASH'), { key: 'Enter' });

    expect(gridRef.current?.getChanges()).toEqual({
      insertedRows: [],
      updatedRows: [],
      deletedRows: [],
    });
  });

  it('commits and exits edit mode when clicking outside the editing cell', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.doubleClick(codeCell);
    fireEvent.change(screen.getByDisplayValue('DASH'), {
      target: { value: 'DASH-NEW' },
    });

    fireEvent.mouseDown(document.body);

    expect(screen.queryByDisplayValue('DASH-NEW')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'DASH-NEW' })).toBeVisible();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', code: 'DASH-NEW' }),
    ]);
  });

  it('toggles all editable checkbox cells through the column header checkbox', () => {
    const gridRef = createRef<F1GridRef<MenuRow>>();

    render(<F1Grid ref={gridRef} rows={rows} columns={columns} rowKey="id" />);

    const headerCheckbox = screen.getByLabelText(
      '?占쎌슜 ?占쏙옙? ?占쎌껜 ?占쏀깮',
    );
    expect(headerCheckbox).toBeChecked();

    fireEvent.click(headerCheckbox);

    expect(
      screen.getByLabelText('?占쎌슜 ?占쏙옙? dashboard'),
    ).not.toBeChecked();
    expect(
      screen.getByLabelText('?占쎌슜 ?占쏙옙? settings'),
    ).not.toBeChecked();
    expect(gridRef.current?.getChanges().updatedRows).toEqual([
      expect.objectContaining({ id: 'dashboard', enabled: false }),
      expect.objectContaining({ id: 'settings', enabled: false }),
    ]);

    fireEvent.click(headerCheckbox);

    expect(screen.getByLabelText('?占쎌슜 ?占쏙옙? dashboard')).toBeChecked();
    expect(screen.getByLabelText('?占쎌슜 ?占쏙옙? settings')).toBeChecked();
  });

  it('moves the focused cell with ArrowRight and starts editing with F2', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeCell = screen.getByRole('gridcell', { name: 'DASH' });
    fireEvent.click(codeCell);
    fireEvent.keyDown(codeCell, { key: 'ArrowRight' });

    const orderCell = screen.getByRole('gridcell', { name: '1' });
    expect(orderCell).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(orderCell, { key: 'F2' });

    expect(screen.getByDisplayValue('1')).toHaveAttribute('type', 'number');
  });
});

describe('F1-GRID header divider', () => {
  it('truncates narrow header names without changing their accessible name', () => {
    const headerName = '등록주기 확인';

    render(
      <F1Grid
        rows={[{ id: '1', label: '값' }]}
        columns={[{ field: 'label', headerName, width: 52, minWidth: 52 }]}
        rowKey="id"
      />,
    );

    const columnHeader = screen.getByRole('columnheader', { name: headerName });
    const headerLabel = screen.getByText(headerName);

    expect(headerLabel).toHaveStyle({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    expect(columnHeader).toHaveAttribute('aria-label', headerName);
  });

  it('always renders a vertical divider on header cells regardless of columnLine', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    expect(
      getComputedStyle(screen.getByRole('columnheader', { name: /肄붾뱶/ }))
        .borderRightWidth,
    ).toBe('1px');
  });
});

describe('F1-GRID sorting', () => {
  it('adds, updates, and toggles off multi-column sort entries', () => {
    let sorts = toggleGridSort<MenuRow>([], 'code', 'asc');
    expect(sorts).toEqual([{ field: 'code', direction: 'asc' }]);

    sorts = toggleGridSort(sorts, 'order', 'asc');
    expect(sorts).toEqual([
      { field: 'code', direction: 'asc' },
      { field: 'order', direction: 'asc' },
    ]);

    sorts = toggleGridSort(sorts, 'code', 'desc');
    expect(sorts).toEqual([
      { field: 'code', direction: 'desc' },
      { field: 'order', direction: 'asc' },
    ]);

    sorts = toggleGridSort(sorts, 'code', 'desc');
    expect(sorts).toEqual([{ field: 'order', direction: 'asc' }]);
  });

  it('sorts rows by multiple columns, treating null/undefined as last', () => {
    const data = [
      { id: 1, group: 'B', order: 2 },
      { id: 2, group: 'A', order: undefined },
      { id: 3, group: 'A', order: 1 },
    ];

    expect(
      sortGridRows(data, [
        { field: 'group', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ]).map((row) => row.id),
    ).toEqual([3, 2, 1]);
  });

  it('reports the sort direction and multi-column order for a field', () => {
    const sorts: F1GridSort<MenuRow>[] = [
      { field: 'code', direction: 'asc' },
      { field: 'order', direction: 'desc' },
    ];

    expect(getGridSortIndicator(sorts, 'order')).toEqual({
      direction: 'desc',
      order: 2,
    });
    expect(getGridSortIndicator(sorts, 'status')).toBeUndefined();
  });

  it('sorts a column ascending and descending through the header menu', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: '?占쎈┝李⑥닚 ?占쎈젹' }),
    );

    const cellsDesc = screen.getAllByRole('gridcell', { name: /DASH|SET/ });
    expect(cellsDesc[0]).toHaveTextContent('SET');

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: '?占쎈쫫李⑥닚 ?占쎈젹' }),
    );

    const cellsAsc = screen.getAllByRole('gridcell', { name: /DASH|SET/ });
    expect(cellsAsc[0]).toHaveTextContent('DASH');
  });
});

describe('F1-GRID filtering', () => {
  it('returns operator sets by column type', () => {
    expect(getGridFilterOperators('text')).toContain('contains');
    expect(getGridFilterOperators('number')).toContain('between');
    expect(getGridFilterOperators('checkbox')).toEqual(['equals']);
  });

  it('matches rows using contains, range, and empty operators', () => {
    const textColumn: F1GridColumn<MenuRow> = {
      field: 'code',
      headerName: '肄붾뱶',
    };
    const numberColumn: F1GridColumn<MenuRow> = {
      field: 'order',
      headerName: '?占쎈젹',
      type: 'number',
    };

    expect(
      matchesGridFilter(
        rows[0],
        { field: 'code', operator: 'contains', value: 'da' },
        textColumn,
      ),
    ).toBe(true);
    expect(
      matchesGridFilter(
        rows[0],
        { field: 'order', operator: 'between', value: '1', value2: '1' },
        numberColumn,
      ),
    ).toBe(true);
    expect(
      matchesGridFilter(
        rows[1],
        { field: 'order', operator: 'between', value: '1', value2: '1' },
        numberColumn,
      ),
    ).toBe(false);
  });

  it('applies multiple filters with AND semantics', () => {
    expect(
      applyGridFilters(
        rows,
        [
          { field: 'code', operator: 'contains', value: 'a' },
          { field: 'enabled', operator: 'equals', value: true },
        ],
        columns,
      ),
    ).toEqual([rows[0]]);
  });

  it('filters visible rows through the header filter popover', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쏀꽣' }));
    fireEvent.change(screen.getByLabelText('肄붾뱶 ?占쏀꽣 占?'), {
      target: { value: 'SET' },
    });
    fireEvent.click(screen.getByRole('button', { name: '?占쎌슜' }));

    await waitFor(() => {
      expect(screen.queryByRole('gridcell', { name: 'DASH' })).toBeNull();
    });
    expect(screen.getByRole('gridcell', { name: 'SET' })).toBeInTheDocument();
  });

  it('anchors the column filter menu to its header button', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쏀꽣' }));

    expect(screen.getAllByLabelText('肄붾뱶 而щ읆 硫붾돱')).toHaveLength(2);
  });
});

describe('F1-GRID column pin', () => {
  it('initially pins columns declared with the column pinned option', () => {
    render(
      <F1Grid
        rows={rows}
        columns={[
          { ...columns[0], pinned: 'left' },
          columns[1],
          { ...columns[2], pinned: 'right' },
        ]}
        rowKey="id"
      />,
    );

    expect(screen.getByRole('columnheader', { name: /肄붾뱶/ })).toHaveStyle({
      position: 'sticky',
      left: '44px',
    });
    expect(
      screen.getByRole('columnheader', { name: /\?占쎌슜 \?占쏙옙\?/ }),
    ).toHaveStyle({
      position: 'sticky',
      right: '0px',
    });
  });

  it('reorders columns into left-pinned, unpinned, and right-pinned groups', () => {
    const pinned = new Map<string, 'left' | 'right'>([
      ['status', 'left'],
      ['code', 'right'],
    ]);

    expect(
      getPinnedGridColumns(columns, pinned).map((column) => column.field),
    ).toEqual(['status', 'order', 'enabled', 'startDate', 'code']);
  });

  it('accumulates left and right pin offsets from the checkbox column width', () => {
    const orderedColumns = [
      { field: 'status', headerName: '?占쏀깭', width: 100 },
      { field: 'order', headerName: '?占쎈젹', width: 80 },
      { field: 'code', headerName: '肄붾뱶', width: 120 },
    ] satisfies F1GridColumn<MenuRow>[];
    const pinned = new Map<string, 'left' | 'right'>([
      ['status', 'left'],
      ['code', 'right'],
    ]);

    expect(getGridColumnPinOffsets(orderedColumns, pinned)).toEqual({
      leftOffsets: { status: 44 },
      rightOffsets: { code: 0 },
    });
  });

  it('pins a column to the left and unpins it through the header menu', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));

    await waitFor(() => {
      expect(
        getComputedStyle(screen.getByRole('columnheader', { name: /肄붾뱶/ }))
          .position,
      ).toBe('sticky');
    });

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '怨좎젙 ?占쎌젣' }));

    await waitFor(() => {
      expect(
        getComputedStyle(screen.getByRole('columnheader', { name: /肄붾뱶/ }))
          .position,
      ).not.toBe('sticky');
    });
  });

  it('keeps pinned header and body cells visually above scrolling cells', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));

    await waitFor(() => {
      const pinnedHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
      const pinnedCell = screen.getByRole('gridcell', { name: 'DASH' });

      expect(pinnedHeader).toHaveStyle({
        backgroundColor: 'rgb(232, 236, 244)',
        zIndex: '3',
      });
      expect(pinnedCell).toHaveStyle({
        backgroundColor: 'rgb(255, 255, 255)',
        zIndex: '2',
      });
      expect(pinnedCell).toHaveStyle({
        boxShadow: expect.stringContaining('inset'),
      });
    });
  });

  it('keeps the row-selection header above a pinned column header', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));

    await waitFor(() => {
      expect(
        screen.getByRole('columnheader', { name: '?占쎌껜 ???占쏀깮' }),
      ).toHaveStyle({
        backgroundColor: 'rgb(232, 236, 244)',
        zIndex: '4',
      });
    });
  });

  it('keeps row-selection cells above pinned body cells', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));

    await waitFor(() => {
      const selectionCheckbox = screen.getByLabelText('dashboard ???占쏀깮');
      expect(selectionCheckbox.closest('.MuiBox-root')).toHaveStyle({
        zIndex: '3',
      });
    });
  });

  it('keeps selected row-selection cells opaque above scrolling cells', async () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));
    fireEvent.click(screen.getByLabelText('dashboard ???占쏀깮'));

    await waitFor(() => {
      expect(
        screen.getByLabelText('dashboard ???占쏀깮').closest('.MuiBox-root'),
      ).toHaveStyle({
        backgroundColor: 'rgb(232, 238, 252)',
      });
    });
  });

  it('uses a dark opaque background for pinned headers in dark mode', async () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <F1Grid rows={rows} columns={columns} rowKey="id" />
      </ThemeProvider>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: /肄붾뱶/ })).toHaveStyle({
        backgroundColor: 'rgb(28, 36, 50)',
      });
    });
  });
});

describe('F1-GRID column resize', () => {
  it('resizes column width on mouse drag and clamps to minColumnWidth', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        resizableColumns={true}
        minColumnWidth={60}
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '肄붾뱶 而щ읆 ?占쎈퉬 議곗젅',
    });
    expect(resizeHandle).toBeInTheDocument();

    // Mouse drag resize
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 220 });
    fireEvent.mouseUp(window);

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    expect(codeHeader).toBeVisible();
  });

  it('computes an auto-fit width clamped by minWidth and column maxWidth', () => {
    const narrowRows = [{ id: '1', code: 'A', headerName: '' } as MenuRow];
    const wideRows = [
      {
        id: '1',
        code: 'A-VERY-LONG-CODE-VALUE-1234567890',
        headerName: '',
      } as MenuRow,
    ];

    const narrowWidth = getAutoFitColumnWidth(columns[0], narrowRows, {
      minWidth: 80,
    });
    expect(narrowWidth).toBe(80);

    const wideWidth = getAutoFitColumnWidth(columns[0], wideRows, {
      minWidth: 80,
    });
    expect(wideWidth).toBeGreaterThan(80);

    const clampedWidth = getAutoFitColumnWidth(
      { ...columns[0], maxWidth: 90 },
      wideRows,
      { minWidth: 80 },
    );
    expect(clampedWidth).toBe(90);
  });

  it('auto-fits column width to content on resize handle double-click', () => {
    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        resizableColumns={true}
        minColumnWidth={40}
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '肄붾뱶 而щ읆 ?占쎈퉬 議곗젅',
    });

    fireEvent.dblClick(resizeHandle);

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    expect(codeHeader).toBeVisible();
  });
});

describe('F1-GRID rownumber column', () => {
  const rownumberColumns: F1GridColumn<MenuRow>[] = [
    { field: 'id', headerName: '?占쎈쾲', type: 'rownumber', editable: true },
    { field: 'code', headerName: '肄붾뱶', editable: true },
  ];

  it('renders the current display position instead of the underlying field value', () => {
    render(<F1Grid rows={rows} columns={rownumberColumns} rowKey="id" />);

    const cells = screen.getAllByRole('gridcell', { name: /^[12]$/ });
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', '2']);
  });

  it('renumbers rows after sorting instead of keeping the original data order', () => {
    render(<F1Grid rows={rows} columns={rownumberColumns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: '?占쎈┝李⑥닚 ?占쎈젹' }),
    );

    const cells = screen.getAllByRole('gridcell', { name: /^[12]$/ });
    expect(cells.map((cell) => cell.textContent)).toEqual(['1', '2']);
    expect(
      screen
        .getAllByRole('gridcell')
        .filter((cell) => cell.textContent === 'SET').length,
    ).toBe(1);
  });

  it('does not enter edit mode when a rownumber cell is double-clicked', () => {
    render(<F1Grid rows={rows} columns={rownumberColumns} rowKey="id" />);

    const rownumberCell = screen.getAllByRole('gridcell', {
      name: /^[12]$/,
    })[0];
    fireEvent.doubleClick(rownumberCell);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

describe('F1-GRID column drag reorder', () => {
  function createDataTransfer() {
    const store: Record<string, string> = {};
    return {
      setData: (type: string, value: string) => {
        store[type] = value;
      },
      getData: (type: string) => store[type] ?? '',
      effectAllowed: 'move',
    } as unknown as DataTransfer;
  }

  afterEach(() => {
    window.localStorage.clear();
  });

  it('reorders columns when a header is dragged and dropped on another header', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    const statusHeader = screen.getByRole('columnheader', {
      name: /\?占쏀깭/,
    });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(codeHeader, { dataTransfer });
    fireEvent.dragOver(statusHeader, { dataTransfer });
    fireEvent.drop(statusHeader, { dataTransfer });

    const headerFields = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
      .filter((text) => text);
    expect(headerFields).toEqual([
      '?占쎈젹',
      '?占쎌슜 ?占쏙옙?',
      '?占쎌옉??',
      '肄붾뱶',
      '?占쏀깭',
    ]);
  });

  it('marks the drop target header while dragging a column', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    const statusHeader = screen.getByRole('columnheader', {
      name: /\?占쏀깭/,
    });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(codeHeader, { dataTransfer });
    fireEvent.dragOver(statusHeader, { dataTransfer });

    expect(statusHeader).toHaveAttribute('data-drop-target', 'true');
  });

  it('excludes pinned columns from drag reorder targets', () => {
    render(<F1Grid rows={rows} columns={columns} rowKey="id" />);

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    expect(codeHeader).not.toHaveAttribute('draggable', 'true');
  });

  it('persists column order to localStorage when storageKey is provided', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-order"
      />,
    );

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    const statusHeader = screen.getByRole('columnheader', {
      name: /\?占쏀깭/,
    });
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(codeHeader, { dataTransfer });
    fireEvent.drop(statusHeader, { dataTransfer });

    const stored = window.localStorage.getItem('test-grid-column-order');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.order).toContain('status');
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-order"
      />,
    );
    const headerFields = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
      .filter((text) => text);
    expect(headerFields).toEqual([
      '?占쎈젹',
      '?占쎌슜 ?占쏙옙?',
      '?占쎌옉??',
      '肄붾뱶',
      '?占쏀깭',
    ]);
  });

  it('persists column width to localStorage and restores it on remount', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-width"
        resizableColumns={true}
        minColumnWidth={40}
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '肄붾뱶 而щ읆 ?占쎈퉬 議곗젅',
    });
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 220 });
    fireEvent.mouseUp(window);

    const stored = window.localStorage.getItem('test-grid-column-width');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.widths.code).toBeGreaterThan(0);
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-width"
        resizableColumns={true}
        minColumnWidth={40}
      />,
    );

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    expect(codeHeader).toBeInTheDocument();
    const headerRow = screen.getAllByRole('row')[0];
    expect(getComputedStyle(headerRow).gridTemplateColumns).toContain(
      `${parsed.widths.code}px`,
    );
  });

  it('persists hidden column list to localStorage and restores it on remount', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-hidden"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '而щ읆 紐⑸줉' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '肄붾뱶 ?占쎌떆' }));

    const stored = window.localStorage.getItem('test-grid-column-hidden');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.hidden).toContain('code');
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-hidden"
      />,
    );

    expect(
      screen.queryByRole('columnheader', { name: /^肄붾뱶$/ }),
    ).not.toBeInTheDocument();
  });

  it('persists pinned column state to localStorage and restores it on remount', () => {
    const { unmount } = render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-pinned"
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '?占쎌そ 怨좎젙' }));

    const stored = window.localStorage.getItem('test-grid-column-pinned');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? '{}');
    expect(parsed.pinned.code).toBe('left');
    unmount();

    render(
      <F1Grid
        rows={rows}
        columns={columns}
        rowKey="id"
        storageKey="test-grid-column-pinned"
      />,
    );

    const codeHeader = screen.getByRole('columnheader', { name: /肄붾뱶/ });
    expect(codeHeader).not.toHaveAttribute('draggable', 'true');

    fireEvent.click(
      screen.getByRole('button', { name: '肄붾뱶 而щ읆 硫붾돱' }),
    );
    expect(
      screen.getByRole('menuitem', { name: '怨좎젙 ?占쎌젣' }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });
});

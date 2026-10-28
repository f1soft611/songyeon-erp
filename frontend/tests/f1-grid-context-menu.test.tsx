import { createRef } from 'react';
import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  F1Grid,
  F1Tree,
  type F1GridColumn,
  type F1GridRef,
} from '../src/shared/components/f1-grid';

type FlatRow = {
  id: string;
  name: string;
};

type TreeRow = {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
};

const flatRows: FlatRow[] = [
  { id: '1', name: 'Alpha' },
  { id: '2', name: 'Beta' },
];

const flatColumns: F1GridColumn<FlatRow>[] = [
  { field: 'name', headerName: '이름', editable: true },
];

const treeRows: TreeRow[] = [
  { id: '1', parentId: null, name: 'Alpha', order: 1 },
  { id: '2', parentId: null, name: 'Beta', order: 2 },
];

const treeColumns: F1GridColumn<TreeRow>[] = [
  { field: 'name', headerName: '이름', editable: true },
];

function createFlatRow(): FlatRow {
  return { id: `new-${Math.random()}`, name: '새 행' };
}

function createTreeRow(): TreeRow {
  return {
    id: `new-${Math.random()}`,
    parentId: null,
    name: '새 행',
    order: 0,
  };
}

function getGridBody(ariaLabel: string) {
  const grid = screen.getByRole('grid', { name: ariaLabel });
  return grid.lastElementChild as HTMLElement;
}

describe('F1-Grid context menu', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens the context menu on body right-click but not on header right-click', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(screen.getByRole('columnheader', { name: /이름/ }));
    expect(
      screen.queryByRole('menuitem', { name: '행 추가' }),
    ).not.toBeInTheDocument();

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
  });

  it('preserves the existing row selection when context-menu row selection is disabled', async () => {
    const gridRef = createRef<F1GridRef<FlatRow>>();
    const onSelectionChange = vi.fn();
    render(
      <F1Grid
        ref={gridRef}
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        initialSelectedRowIds={['1']}
        selectRowOnContextMenu={false}
        onSelectionChange={onSelectionChange}
      />,
    );
    await waitFor(() => expect(gridRef.current?.getSelectedRowIds()).toEqual(['1']));
    onSelectionChange.mockClear();

    const cell = screen.getByRole('gridcell', { name: 'Beta' });
    fireEvent.mouseDown(cell, { button: 2 });
    expect(gridRef.current?.getSelectedRowIds()).toEqual(['1']);
    fireEvent.contextMenu(cell, { button: 2 });
    fireEvent.mouseUp(cell, { button: 2 });

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(gridRef.current?.getSelectedRowIds()).toEqual(['1']);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(cell).toHaveAttribute('tabindex', '0');
  });

  it('keeps right-click row selection enabled by default', () => {
    const gridRef = createRef<F1GridRef<FlatRow>>();
    render(
      <F1Grid ref={gridRef} rows={flatRows} columns={flatColumns} rowKey="id" />,
    );
    const cell = screen.getByRole('gridcell', { name: 'Beta' });
    fireEvent.mouseDown(cell, { button: 2 });
    expect(gridRef.current?.getSelectedRowIds()).toEqual(['2']);
    fireEvent.contextMenu(cell, { button: 2 });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('suppresses the F1Grid context menu while preserving right-click selection', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="메뉴 비활성 그리드"
        disableContextMenu
      />,
    );

    const cell = screen.getByRole('gridcell', { name: 'Beta' });
    const event = createEvent.contextMenu(cell, { button: 2 });
    fireEvent(cell, event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(cell).toHaveAttribute('data-grid-selected', 'true');
  });

  it('suppresses the F1Tree context menu while preserving right-click selection', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="메뉴 비활성 트리"
        disableContextMenu
      />,
    );

    const cell = screen.getByRole('gridcell', { name: 'Alpha' });
    const event = createEvent.contextMenu(cell, { button: 2 });
    fireEvent(cell, event);

    expect(event.defaultPrevented).toBe(true);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(cell).toHaveAttribute('data-grid-selected', 'true');
  });

  it('closes an open context menu when context menus are disabled', async () => {
    const props = {
      rows: flatRows,
      columns: flatColumns,
      rowKey: 'id' as const,
      ariaLabel: '동적 메뉴 비활성 그리드',
    };
    const view = render(<F1Grid {...props} />);

    fireEvent.contextMenu(getGridBody(props.ariaLabel));
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();

    view.rerender(<F1Grid {...props} disableContextMenu />);

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it.each([
    ['위에 행 삽입', ['1', 'new', '2']],
    ['아래에 행 삽입', ['1', '2', 'new']],
  ])('inserts a new row at the selected row position with %s', (action, ids) => {
    const gridRef = createRef<F1GridRef<FlatRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={() => ({ id: 'new', name: 'New' })}
      />,
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Beta' }));
    fireEvent.click(screen.getByRole('menuitem', { name: action }));

    expect(gridRef.current?.getRows().map((row) => row.id)).toEqual(ids);
    expect(gridRef.current?.getChanges().insertedRows).toEqual([
      { id: 'new', name: 'New' },
    ]);
    expect(screen.getByRole('gridcell', { name: 'New' })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('does not offer relative insertion when the context menu targets empty space', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    expect(
      screen.queryByRole('menuitem', { name: '위에 행 삽입' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: '아래에 행 삽입' }),
    ).not.toBeInTheDocument();
  });

  it('disables relative insertion while sorting is active and enables it after clearing sort', async () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="정렬 삽입 테스트"
        createRow={createFlatRow}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '이름 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Beta' }));

    const insertAbove = screen.getByRole('menuitem', {
      name: /위에 행 삽입/,
    });
    expect(insertAbove).toHaveAttribute('aria-disabled', 'true');
    expect(insertAbove).toHaveTextContent(/정렬.*필터|필터.*정렬/);
    expect(
      screen.getByRole('menuitem', { name: /아래에 행 삽입/ }),
    ).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('menuitem', { name: '정렬 해제' }));
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Beta' }));
    expect(
      screen.getByRole('menuitem', { name: '위에 행 삽입' }),
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('disables relative insertion while a filter is active', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="필터 삽입 테스트"
        createRow={createFlatRow}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '이름 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터' }));
    fireEvent.change(screen.getByLabelText('이름 필터 값'), {
      target: { value: 'Alpha' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Alpha' }));

    expect(
      screen.getByRole('menuitem', { name: /위에 행 삽입/ }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByRole('menuitem', { name: /아래에 행 삽입/ }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('scrolls a below-inserted virtual row into the viewport', async () => {
    const rows = Array.from({ length: 250 }, (_, index) => ({
      id: `row-${index}`,
      name: index === 52 ? 'Target' : `Row ${index}`,
    }));
    const { container } = render(
      <F1Grid
        rows={rows}
        columns={[{ field: 'name', headerName: '이름', editable: true }]}
        rowKey="id"
        ariaLabel="가상 삽입 테스트"
        height={180}
        rowHeight={32}
        createRow={() => ({ id: 'inserted', name: 'Inserted' })}
      />,
    );

    const body = screen.getByTestId('f1-grid-body-scroll');
    Object.defineProperties(body, {
      clientHeight: { configurable: true, value: 96 },
      scrollHeight: { configurable: true, value: 250 * 32 },
      scrollTop: { configurable: true, value: 50 * 32, writable: true },
    });
    fireEvent.scroll(body);
    await waitFor(() =>
      expect(
        container.querySelector('[data-f1-grid-row-id="row-52"]'),
      ).toBeInTheDocument(),
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Target' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '아래에 행 삽입' }));

    await waitFor(() =>
      expect(
        container.querySelector('[data-f1-grid-row-id="inserted"]'),
      ).toBeInTheDocument(),
    );
    expect(body.scrollTop).toBeGreaterThan(50 * 32);
    expect(
      screen.getByRole('gridcell', { name: 'Inserted' }),
    ).toHaveAttribute('tabindex', '0');
  });

  it('selects the right-clicked cell before the context menu opens inside the grid body', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        canExportExcel
      />,
    );

    const betaCell = screen.getByRole('gridcell', { name: 'Beta' });

    fireEvent.mouseDown(betaCell, { button: 2 });
    fireEvent.contextMenu(betaCell);

    expect(betaCell).toHaveAttribute('data-grid-selected', 'true');
    expect(
      screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
    ).toBeVisible();
  });

  it('resolves the right-clicked cell from pointer coordinates when the event target is the grid body container', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        canExportExcel
      />,
    );

    const betaCell = screen.getByRole('gridcell', { name: 'Beta' });
    const body = getGridBody('테스트 그리드');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => betaCell),
    });

    fireEvent.contextMenu(body, { clientX: 240, clientY: 180 });

    expect(betaCell).toHaveAttribute('data-grid-selected', 'true');
    expect(
      screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
    ).toBeVisible();

    delete (document as Document & { elementFromPoint?: unknown })
      .elementFromPoint;
  });

  it('selects the actual grid cell when a wrapper sits above it in elementsFromPoint', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        canExportExcel
      />,
    );

    const betaCell = screen.getByRole('gridcell', { name: 'Beta' });
    const body = getGridBody('테스트 그리드');
    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'presentation');

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => wrapper),
    });
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [wrapper, betaCell]),
    });

    fireEvent.contextMenu(body, { clientX: 240, clientY: 180 });

    expect(betaCell).toHaveAttribute('data-grid-selected', 'true');
    expect(
      screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
    ).toBeVisible();

    delete (document as Document & { elementFromPoint?: unknown })
      .elementFromPoint;
    delete (document as Document & { elementsFromPoint?: unknown })
      .elementsFromPoint;
  });

  it('rebinds the context menu to a newly clicked cell when the menu is already open', async () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        canExportExcel
      />,
    );

    const alphaCell = screen.getByRole('gridcell', { name: 'Alpha' });
    fireEvent.contextMenu(alphaCell);
    expect(
      screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
    ).toBeVisible();

    const betaCell = Array.from(
      document.querySelectorAll('[role="gridcell"]'),
    ).find((element) => element.textContent?.trim() === 'Beta');

    expect(betaCell).not.toBeNull();
    fireEvent.contextMenu(betaCell as HTMLElement);

    await waitFor(() => {
      expect(betaCell).toHaveAttribute('data-grid-selected', 'true');
      expect(
        screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
      ).toBeVisible();
    });
  });

  it('closes the active context menu when the user clicks outside the grid', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();

    fireEvent.mouseDown(document.body);
    fireEvent.click(document.body);

    expect(
      screen.queryByRole('menuitem', { name: '행 추가' }),
    ).not.toBeInTheDocument();
  });

  it('hides the excel export item when canExportExcel is not set', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    expect(
      screen.queryByRole('menuitem', { name: '엑셀 내보내기' }),
    ).not.toBeInTheDocument();
  });

  it('shows the excel export item when canExportExcel is true and triggers a download', async () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        canExportExcel
        excelFileName="test-export"
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    fireEvent.click(screen.getByRole('menuitem', { name: '엑셀 내보내기' }));

    await waitFor(
      () => {
        expect(URL.createObjectURL).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
  });

  it('renders one separator when a tree context menu has no row actions', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="자료실 트리"
        canExportExcel
        allowAddRootInContextMenu={false}
        allowAddRowInContextMenu={false}
        allowDuplicateRowInContextMenu={false}
        allowDeleteRowInContextMenu={false}
      />,
    );

    fireEvent.contextMenu(getGridBody('자료실 트리'));

    expect(screen.getAllByRole('separator')).toHaveLength(1);
  });

  it('does not show the root add item for a plain F1Grid', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    expect(
      screen.queryByRole('menuitem', { name: '루트 추가' }),
    ).not.toBeInTheDocument();
  });

  it('shows the root add item for F1Tree and adds a root row', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="테스트 트리"
        createRow={createTreeRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 트리'));
    expect(
      screen.queryByRole('menuitem', { name: /위에 행 삽입/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /아래에 행 삽입/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: '루트 추가' }));

    expect(screen.getAllByRole('gridcell', { name: '새 행' })).toHaveLength(1);
  });

  it('keeps context-menu and ref addRow actions appending to the end', () => {
    const gridRef = createRef<F1GridRef<FlatRow>>();
    render(
      <F1Grid
        ref={gridRef}
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="추가 위치 테스트"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Alpha' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 추가' }));
    expect(gridRef.current?.getRows().map((row) => row.id)).toEqual([
      '1',
      '2',
      expect.stringMatching(/^new-/),
    ]);

    act(() => gridRef.current?.addRow());
    expect(gridRef.current?.getRows().at(-1)?.name).toBe('새 행');
  });

  it('adds a new row as the child of the row that was right-clicked', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="테스트 트리"
        createRow={createTreeRow}
        defaultExpandAll
      />,
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Alpha' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 추가' }));

    expect(screen.getByRole('gridcell', { name: '새 행' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Alpha 접기' })).toBeVisible();
  });

  it('adds a new row at the root level when the empty area is right-clicked', () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="테스트 트리"
        createRow={createTreeRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 트리'));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 추가' }));

    expect(screen.getByRole('gridcell', { name: '새 행' })).toBeVisible();
  });

  it('clears tree sorting from the shared context menu', async () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="정렬 테스트 트리"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '이름 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '내림차순 정렬' }));

    expect(screen.getAllByRole('gridcell').map((cell) => cell.textContent)).toEqual(
      ['Beta', 'Alpha'],
    );

    fireEvent.contextMenu(getGridBody('정렬 테스트 트리'));
    fireEvent.click(screen.getByRole('menuitem', { name: '정렬 해제' }));

    await waitFor(() => {
      expect(screen.getAllByRole('gridcell').map((cell) => cell.textContent)).toEqual(
        ['Alpha', 'Beta'],
      );
    });
  });

  it('clears tree filters from the shared context menu', async () => {
    render(
      <F1Tree
        rows={treeRows}
        columns={treeColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="필터 테스트 트리"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '이름 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터' }));
    fireEvent.change(screen.getByLabelText('이름 필터 값'), {
      target: { value: 'Alpha' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(screen.queryByRole('gridcell', { name: 'Beta' })).not.toBeInTheDocument();

    fireEvent.contextMenu(getGridBody('필터 테스트 트리'));
    fireEvent.click(screen.getByRole('menuitem', { name: '필터 해제' }));

    await waitFor(() => {
      expect(screen.getByRole('gridcell', { name: 'Beta' })).toBeVisible();
    });
  });

  it('deletes only the row that was right-clicked when nothing else is selected', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
        createDuplicate={(row) => ({ ...row, id: `${row.id}-copy` })}
      />,
    );

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Beta' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 삭제' }));

    expect(screen.queryByRole('gridcell', { name: 'Beta' })).toBeNull();
    expect(screen.getByRole('gridcell', { name: 'Alpha' })).toBeVisible();
  });

  it('disables the row copy/delete items when there is no target or selected row', () => {
    render(
      <F1Grid
        rows={[]}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        createRow={createFlatRow}
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    expect(screen.getByRole('menuitem', { name: '행 복사' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: '행 삭제' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('disables the filter/sort clear items until a filter or sort is applied', async () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    expect(screen.getByRole('menuitem', { name: '필터 해제' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: '정렬 해제' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('menu'), {
      key: 'Escape',
      code: 'Escape',
    });

    fireEvent.click(screen.getByRole('button', { name: '이름 컬럼 메뉴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    expect(
      screen.getByRole('menuitem', { name: '정렬 해제' }),
    ).not.toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('menuitem', { name: '정렬 해제' }));

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: '정렬 해제' }),
      ).toHaveAttribute('aria-disabled', 'true');
    });
  });

  it('omits the clear-action group divider when filtering and sorting are disabled', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        disableFiltering
        disableSorting
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    const menu = screen.getByRole('menu');
    expect(screen.queryByRole('menuitem', { name: '필터 해제' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: '정렬 해제' })).toBeNull();
    expect(within(menu).getAllByRole('separator')).toHaveLength(2);
  });

  it('keeps the clear-action group divider when either action remains visible', () => {
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        disableFiltering
      />,
    );

    fireEvent.contextMenu(getGridBody('테스트 그리드'));

    const menu = screen.getByRole('menu');
    expect(screen.queryByRole('menuitem', { name: '필터 해제' })).toBeNull();
    expect(screen.getByRole('menuitem', { name: '정렬 해제' })).toBeVisible();
    expect(within(menu).getAllByRole('separator')).toHaveLength(3);
  });

  it('restores column order, width, and visibility to defaults and clears saved storage', async () => {
    const storageKey = 'context-menu-reset-test';
    render(
      <F1Grid
        rows={flatRows}
        columns={flatColumns}
        rowKey="id"
        ariaLabel="테스트 그리드"
        storageKey={storageKey}
        resizableColumns
      />,
    );

    const resizeHandle = screen.getByRole('separator', {
      name: '이름 컬럼 너비 조절',
    });
    fireEvent.mouseDown(resizeHandle, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 120 });
    fireEvent.mouseUp(document);

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem(storageKey) ?? '{}').widths,
      ).toBeTruthy();
    });

    fireEvent.contextMenu(getGridBody('테스트 그리드'));
    fireEvent.click(
      screen.getByRole('menuitem', { name: '설정을 기본값으로 복원' }),
    );

    await waitFor(() => {
      expect(
        JSON.parse(window.localStorage.getItem(storageKey) ?? '{}').widths,
      ).toEqual({});
    });
  });
});

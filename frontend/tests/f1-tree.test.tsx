import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Tree, type F1TreeRef } from '../src/shared/components/f1-grid';
import { projectTreeRows } from '../src/shared/components/f1-grid/tree/TreeProjection';

type TreeRow = {
  id: string;
  parentId: string | null;
  order: number;
  name: string;
  hasChildren: boolean;
  allowed: boolean;
  moduleId?: number;
  moduleName?: string;
  parentName?: string;
};

describe('F1Tree projection', () => {
  it('orders siblings, exposes expanded descendants, and retains depth metadata', () => {
    const projection = projectTreeRows(
      [
        { id: 'child-b', parentId: 'root', order: 2, name: 'B' },
        { id: 'root', parentId: null, order: 1, name: 'Root' },
        { id: 'child-a', parentId: 'root', order: 1, name: 'A' },
      ],
      { rowKey: 'id', parentKey: 'parentId', getRowOrder: (row) => row.order },
      new Set(['root']),
    );

    expect(projection.rows.map((row) => row.id)).toEqual([
      'root',
      'child-a',
      'child-b',
    ]);
    expect(projection.metaById.root).toMatchObject({
      depth: 0,
      hasChildren: true,
    });
    expect(projection.metaById['child-a']).toMatchObject({
      depth: 1,
      hasChildren: false,
    });
  });

  it('renders malformed parent links once at root level without recursion', () => {
    const projection = projectTreeRows(
      [
        { id: 'self', parentId: 'self', order: 1, name: 'Self' },
        { id: 'left', parentId: 'right', order: 2, name: 'Left' },
        { id: 'right', parentId: 'left', order: 1, name: 'Right' },
      ],
      { rowKey: 'id', parentKey: 'parentId', getRowOrder: (row) => row.order },
      new Set(['self', 'left', 'right']),
    );

    expect(projection.rows.map((row) => row.id)).toEqual([
      'self',
      'right',
      'left',
    ]);
  });
});

describe('F1Tree interaction', () => {
  const rows: TreeRow[] = [
    {
      id: 'root',
      parentId: null,
      order: 1,
      name: 'Root',
      hasChildren: false,
      allowed: false,
    },
    {
      id: 'child',
      parentId: 'root',
      order: 1,
      name: 'Child',
      hasChildren: false,
      allowed: false,
    },
  ];

  const columns = [
    { field: 'name' as const, headerName: '메뉴명', editable: true },
  ];

  it('uses the same loading spinner as F1Grid', () => {
    render(
      <F1Tree
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="loading tree"
        loading
      />,
    );

    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
    const overlay = screen.getByTestId('f1-grid-loading-overlay');
    const progress = screen.getByRole('progressbar');
    const circle = progress.querySelector('circle');

    expect(overlay).toBeInTheDocument();
    expect(progress).toHaveStyle({ width: '34px', height: '34px' });
    expect(circle).not.toBeNull();
    expect(circle).toHaveAttribute('stroke-width', '2.4');
  });

  it('uses fixed-width tracks for pinned flex columns inherited from F1Grid', () => {
    render(
      <F1Tree
        rows={rows}
        columns={[
          {
            field: 'name' as const,
            headerName: '메뉴명',
            width: 180,
            flex: 1,
            pinned: 'left',
          },
          {
            field: 'allowed' as const,
            headerName: '허용',
            type: 'checkbox',
            width: 100,
            pinned: 'left',
          },
        ]}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 핀 고정 정렬 테스트"
        defaultExpanded="all"
      />,
    );

    expect(
      getComputedStyle(screen.getAllByRole('row')[0]).gridTemplateColumns,
    ).toContain('44px 180px 100px');
  });

  it('keeps row-number and action columns visible in tree mode', () => {
    render(
      <F1Tree
        rows={[
          {
            id: 'root',
            parentId: null,
            order: 1,
            name: 'Root',
            hasChildren: true,
            allowed: false,
          },
          {
            id: 'child',
            parentId: 'root',
            order: 1,
            name: 'Child',
            hasChildren: false,
            allowed: false,
          },
        ]}
        columns={[
          {
            field: 'id' as const,
            headerName: '순번',
            type: 'rownumber',
            width: 60,
            pinned: 'left',
          },
          {
            field: 'name' as const,
            headerName: '메뉴명',
            width: 200,
            editable: true,
          },
          {
            field: 'allowed' as const,
            headerName: '허용',
            type: 'checkbox',
            width: 80,
          },
        ]}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 행번호와 액션 컬럼 검증"
        defaultExpanded="all"
        rowFormPlugin={{}}
        showCheckbox={false}
      />,
    );

    const headerRow = screen.getAllByRole('row')[0];
    expect(headerRow).toHaveStyle({
      gridTemplateColumns: '60px 200px 80px 48px',
    });
    expect(screen.getByRole('columnheader', { name: '순번' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: '상세' })).toBeVisible();

    const actionButton = screen.getByRole('button', {
      name: 'root 행 정보 수정',
    });
    expect(actionButton.closest('[role="gridcell"]')).toHaveStyle({
      gridColumn: '4',
    });

    const childTreeCell = screen.getByRole('gridcell', { name: 'Child' });
    expect(childTreeCell.getAttribute('data-f1-grid-striped')).toBe('true');
  });

  it('keeps alternating striping on pinned tree columns', () => {
    render(
      <F1Tree
        rows={rows}
        columns={[
          {
            field: 'id' as const,
            headerName: '순번',
            type: 'rownumber',
            width: 60,
            pinned: 'left',
          },
          {
            field: 'name' as const,
            headerName: '메뉴명',
            width: 200,
            editable: true,
          },
        ]}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 고정 컬럼 줄무늬 검증"
        defaultExpanded="all"
      />,
    );

    const pinnedStripedCell = screen.getByRole('gridcell', { name: '2' });
    expect(pinnedStripedCell.getAttribute('data-f1-grid-striped')).toBe('true');
    expect(getComputedStyle(pinnedStripedCell).backgroundImage).toContain(
      'gradient',
    );
    expect(pinnedStripedCell).toHaveStyle({ isolation: 'isolate' });
  });

  it('expands every parent on first render when defaultExpandAll is enabled', () => {
    render(
      <F1Tree
        rows={[
          ...rows,
          {
            id: 'grandchild',
            parentId: 'child',
            order: 1,
            name: 'Grand child',
            hasChildren: false,
            allowed: false,
          },
        ]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 초기 전체 펼침 테스트"
        defaultExpanded="root"
        defaultExpandAll
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'Child' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'Grand child' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Root 접기' })).toBeVisible();
  });

  it('expands every parent when rows load after the first render', () => {
    const { rerender } = render(
      <F1Tree
        rows={[]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 지연 로드 전체 펼침 테스트"
        defaultExpandAll
      />,
    );

    rerender(
      <F1Tree
        rows={[
          ...rows,
          {
            id: 'grandchild',
            parentId: 'child',
            order: 1,
            name: 'Grand child',
            hasChildren: false,
            allowed: false,
          },
        ]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 지연 로드 전체 펼침 테스트"
        defaultExpandAll
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'Child' })).toBeVisible();
    expect(screen.getByRole('gridcell', { name: 'Grand child' })).toBeVisible();
  });

  it('without row form plugin, toggles descendants and expands a parent before adding a child', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 테스트"
        defaultExpanded="root"
        createRow={() => ({
          id: 'new',
          parentId: null,
          order: 0,
          name: '새 메뉴',
          hasChildren: false,
          allowed: false,
        })}
      />,
    );

    expect(screen.getByRole('gridcell', { name: 'Child' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Root 접기' }));
    expect(
      screen.queryByRole('gridcell', { name: 'Child' }),
    ).not.toBeInTheDocument();

    act(() => {
      ref.current?.addChildRow('root');
    });
    expect(screen.getByRole('gridcell', { name: '새 메뉴' })).toBeVisible();
  });

  it('keeps the projected parent-child order and hides sort and filter controls', () => {
    render(
      <F1Tree
        rows={[
          { ...rows[0], name: 'Zulu' },
          { ...rows[1], name: 'Alpha' },
        ]}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 계층 보존 테스트"
        defaultExpanded="all"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '메뉴명 컬럼 메뉴' }));
    expect(
      screen.queryByRole('menuitem', { name: '오름차순 정렬' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: '필터' }),
    ).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(
      screen.getAllByRole('gridcell').map((cell) => cell.textContent),
    ).toEqual(['Zulu', 'Alpha']);
  });

  it('merges supplied child values while enforcing the parent ID', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 자식 값 테스트"
        defaultExpanded="all"
        createRow={() => ({
          id: 'new-child',
          parentId: null,
          order: 0,
          name: '새 메뉴',
          hasChildren: false,
          allowed: false,
        })}
      />,
    );

    act(() => {
      ref.current?.addChildRow('root', {
        moduleId: 2,
        moduleName: '환경설정',
        parentName: 'Root',
        parentId: 'incorrect-parent',
      });
    });

    expect(ref.current?.getRows()).toContainEqual(
      expect.objectContaining({
        parentId: 'root',
        moduleId: 2,
        moduleName: '환경설정',
        parentName: 'Root',
      }),
    );
  });

  it('supports optional tree checkbox selection with parent-child cascade', () => {
    render(
      <F1Tree
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 트리 체크박스 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const childTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Child 트리 선택',
    });

    expect(rootTreeCheckbox).toBeInTheDocument();
    expect(childTreeCheckbox).toBeInTheDocument();

    fireEvent.click(rootTreeCheckbox);
    expect(rootTreeCheckbox).toBeChecked();
    expect(childTreeCheckbox).toBeChecked();

    fireEvent.click(childTreeCheckbox);
    expect(rootTreeCheckbox).not.toBeChecked();
    expect(childTreeCheckbox).not.toBeChecked();
  });

  it('syncs checkbox-type data columns when treeCheckbox is toggled', () => {
    const columnsWithCheckbox = [
      ...columns,
      {
        field: 'allowed' as const,
        headerName: '허용',
        type: 'checkbox' as const,
      },
    ];
    render(
      <F1Tree
        rows={rows}
        columns={columnsWithCheckbox}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 체크박스 컬럼 동기화 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const rootAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 root',
    });
    const childAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 child',
    });

    expect(rootAllowedCheckbox).not.toBeChecked();

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).toBeChecked();
    expect(childAllowedCheckbox).toBeChecked();

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).not.toBeChecked();
    expect(childAllowedCheckbox).not.toBeChecked();
  });

  it('skips syncing checkbox columns marked with syncWithTreeCheckbox: false', () => {
    const columnsWithCheckbox = [
      ...columns,
      {
        field: 'allowed' as const,
        headerName: '허용',
        type: 'checkbox' as const,
        syncWithTreeCheckbox: false,
      },
    ];
    render(
      <F1Tree
        rows={rows}
        columns={columnsWithCheckbox}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 체크박스 컬럼 동기화 제외 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const rootAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 root',
    });

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).not.toBeChecked();
  });

  it('syncs computed checkbox columns through onValueChange when treeCheckbox is toggled', () => {
    const permissionColumns = [
      { field: 'name' as const, headerName: '메뉴명', editable: true },
      {
        field: 'allowed' as const,
        headerName: '허용',
        type: 'checkbox' as const,
        getValue: (row: TreeRow) => row.allowed,
        onValueChange: (row: TreeRow, checked: unknown) => ({
          allowed: Boolean(checked),
        }),
      },
    ];
    render(
      <F1Tree
        rows={rows}
        columns={permissionColumns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 계산형 체크박스 동기화 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const rootAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 root',
    });

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).toBeChecked();

    fireEvent.click(rootTreeCheckbox);
    expect(rootAllowedCheckbox).not.toBeChecked();
  });

  it('does not sync tree checkbox into disabled checkbox cells', () => {
    const rowsWithDisabled = [
      { ...rows[0], allowed: false },
      { ...rows[1], allowed: false },
    ];
    const columnsWithDisabledCheckbox = [
      { field: 'name' as const, headerName: '메뉴명', editable: true },
      {
        field: 'allowed' as const,
        headerName: '허용',
        type: 'checkbox' as const,
        editable: (row: TreeRow) => (row.id === 'child' ? false : true),
        getValue: (row: TreeRow) => row.allowed,
      },
    ];

    render(
      <F1Tree
        rows={rowsWithDisabled}
        columns={columnsWithDisabledCheckbox}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 비활성 체크박스 동기화 방지 테스트"
        defaultExpanded="all"
        treeCheckbox
      />,
    );

    const rootTreeCheckbox = screen.getByRole('checkbox', {
      name: 'Root 트리 선택',
    });
    const childAllowedCheckbox = screen.getByRole('checkbox', {
      name: '허용 child',
    });

    fireEvent.click(rootTreeCheckbox);
    expect(childAllowedCheckbox).not.toBeChecked();
  });

  it('hides the row selection checkbox column when the checkbox option is disabled', () => {
    render(
      <F1Tree
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 체크박스 옵션 테스트"
        defaultExpanded="all"
        showCheckbox={false}
      />,
    );

    expect(screen.queryByLabelText('root 행 선택')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('전체 행 선택')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Root' })).toBeVisible();
  });

  it('does not delete a selected node that has descendants', () => {
    const onDeleteBlocked = vi.fn();
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 삭제 테스트"
        defaultExpanded="all"
        onDeleteBlocked={onDeleteBlocked}
      />,
    );

    fireEvent.click(screen.getByLabelText('root 행 선택'));
    act(() => {
      ref.current?.deleteSelectedRows();
    });

    expect(onDeleteBlocked).toHaveBeenCalledWith(['root']);
    expect(screen.getByText('Root')).toBeVisible();
  });

  it('uses a newly added child to disable parent edits and block parent deletion', () => {
    const onDeleteBlocked = vi.fn();
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={[rows[0]]}
        columns={[
          { field: 'name', headerName: '메뉴명', editable: true },
          {
            field: 'allowed',
            headerName: '허용',
            type: 'checkbox',
            editable: (row) => !row.hasChildren,
          },
        ]}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 동적 자식 테스트"
        createRow={() => ({
          id: 'new-child',
          parentId: null,
          order: 0,
          name: 'New child',
          hasChildren: false,
          allowed: false,
        })}
        onDeleteBlocked={onDeleteBlocked}
      />,
    );

    fireEvent.click(screen.getByLabelText('root 행 선택'));
    act(() => {
      ref.current?.addChildRow('root');
    });

    expect(screen.getByLabelText('허용 root')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('root 행 선택'));
    act(() => {
      ref.current?.deleteSelectedRows();
    });
    expect(onDeleteBlocked).toHaveBeenCalledWith(['root']);
  });

  it('wraps long tree cell text after row height is increased', () => {
    const longText = '트리 셀 안에서 여러 줄로 보이는 매우 긴 메뉴 이름입니다.';
    render(
      <F1Tree
        rows={[{ ...rows[0], name: longText }]}
        columns={[
          {
            field: 'name',
            headerName: '메뉴명',
            editable: true,
            wrapText: true,
          },
        ]}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 줄바꿈 테스트"
        defaultExpanded="all"
      />,
    );

    const text = screen.getByText(longText);
    expect(text).toHaveStyle({ whiteSpace: 'nowrap' });

    fireEvent.keyDown(
      screen.getByRole('button', { name: /root 행 높이 조절/ }),
      { key: 'ArrowDown' },
    );

    expect(text).toHaveStyle({ whiteSpace: 'normal' });
  });

  it('allows paste while a tree cell editor is active', () => {
    render(
      <F1Tree
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 붙여넣기 허용 테스트"
        defaultExpanded="all"
        editorPlugins={[{ canEdit: () => true, startEdit: () => true }]}
      />,
    );

    const rootCell = screen.getByRole('gridcell', { name: 'Root' });
    fireEvent.doubleClick(rootCell);
    const input = screen.getByDisplayValue('Root');

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => '새 이름' },
    });
    input.dispatchEvent(pasteEvent);

    expect(input).toBeInTheDocument();
    expect(pasteEvent.defaultPrevented).toBe(false);
  });
});

describe('F1Tree row form modal', () => {
  const rows: TreeRow[] = [
    {
      id: 'root',
      parentId: null,
      order: 1,
      name: 'Root',
      hasChildren: false,
      allowed: false,
    },
    {
      id: 'existing-child',
      parentId: 'root',
      order: 1,
      name: 'Existing child',
      hasChildren: false,
      allowed: false,
    },
  ];
  const columns = [
    { field: 'name' as const, headerName: '메뉴명', editable: true },
  ];
  const createRow = (): TreeRow => ({
    id: 'new-row',
    parentId: null,
    order: 0,
    name: '새 메뉴',
    hasChildren: false,
    allowed: false,
  });

  function getGridBody(ariaLabel: string) {
    const grid = screen.getByRole('grid', { name: ariaLabel });
    return grid.lastElementChild as HTMLElement;
  }

  it('opens addChildRow in a modal and keeps the parent collapsed when cancelled', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 자식 취소 테스트"
        defaultExpanded={[]}
        createRow={createRow}
        rowFormPlugin={{}}
      />,
    );

    act(() => {
      ref.current?.addChildRow('root', {
        id: 'cancelled-child',
        name: '취소할 자식',
      });
    });

    expect(screen.getByRole('dialog', { name: '신규 등록' })).toBeVisible();
    expect(ref.current?.isExpanded('root')).toBe(false);
    expect(ref.current?.getChanges().insertedRows).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(ref.current?.isExpanded('root')).toBe(false);
    expect(ref.current?.getChanges().insertedRows).toEqual([]);
  });

  it('expands the parent only after addChildRow is applied and preserves the parent ID', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 자식 적용 테스트"
        defaultExpanded={[]}
        createRow={createRow}
        rowFormPlugin={{}}
      />,
    );

    act(() => {
      ref.current?.addChildRow('root', {
        id: 'applied-child',
        name: '적용한 자식',
        parentId: 'incorrect-parent',
      });
    });
    expect(ref.current?.isExpanded('root')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(ref.current?.isExpanded('root')).toBe(true);
    expect(ref.current?.getChanges().insertedRows).toContainEqual(
      expect.objectContaining({
        id: 'applied-child',
        name: '적용한 자식',
        parentId: 'root',
      }),
    );
    expect(screen.getByRole('gridcell', { name: '적용한 자식' })).toBeVisible();
  });

  it('opens addRow in a modal and inserts a root only after apply', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 루트 적용 테스트"
        defaultExpanded={[]}
        createRow={createRow}
        rowFormPlugin={{}}
      />,
    );

    act(() => {
      ref.current?.addRow({ id: 'applied-root', name: '적용한 루트' });
    });

    expect(screen.getByRole('dialog', { name: '신규 등록' })).toBeVisible();
    expect(ref.current?.getChanges().insertedRows).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(ref.current?.getChanges().insertedRows).toContainEqual(
      expect.objectContaining({
        id: 'applied-root',
        name: '적용한 루트',
        parentId: null,
      }),
    );
  });

  it('opens row form modals from the root and child tree context actions', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 컨텍스트 모달 테스트"
        defaultExpanded={[]}
        createRow={createRow}
        rowFormPlugin={{}}
      />,
    );

    fireEvent.contextMenu(getGridBody('F1-TREE 컨텍스트 모달 테스트'));
    fireEvent.click(screen.getByRole('menuitem', { name: '루트 추가' }));
    expect(screen.getByRole('dialog', { name: '신규 등록' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(ref.current?.getChanges().insertedRows).toEqual([]);

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Root' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 추가' }));
    expect(screen.getByRole('dialog', { name: '신규 등록' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: '메뉴명' })).toHaveValue(
      '새 메뉴',
    );
    expect(ref.current?.isExpanded('root')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(ref.current?.isExpanded('root')).toBe(true);
    expect(ref.current?.getChanges().insertedRows).toContainEqual(
      expect.objectContaining({ parentId: 'root' }),
    );
  });

  it('keeps expand and collapse controls independent while a child modal is open', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 모달 펼침 독립 테스트"
        defaultExpanded={[]}
        createRow={createRow}
        rowFormPlugin={{}}
      />,
    );

    act(() => {
      ref.current?.addChildRow('root');
    });
    const dialog = screen.getByRole('dialog', { name: '신규 등록' });

    act(() => {
      ref.current?.expandRow('root');
    });
    expect(ref.current?.isExpanded('root')).toBe(true);
    expect(dialog).toBeVisible();

    act(() => {
      ref.current?.collapseRow('root');
    });
    expect(ref.current?.isExpanded('root')).toBe(false);
    expect(dialog).toBeVisible();
  });

  it('does not expand a cancelled parent when later changes include an older inserted child', () => {
    const ref = createRef<F1TreeRef<TreeRow>>();
    render(
      <F1Tree
        ref={ref}
        rows={rows}
        columns={columns}
        rowKey="id"
        parentKey="parentId"
        treeColumn="name"
        ariaLabel="F1-TREE 취소 후 변경 테스트"
        defaultExpanded={[]}
        createRow={createRow}
        rowFormPlugin={{}}
      />,
    );

    act(() => {
      ref.current?.addChildRow('root', { id: 'older-child' });
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    act(() => {
      ref.current?.collapseRow('root');
      ref.current?.addChildRow('root', { id: 'cancelled-child' });
    });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    act(() => {
      ref.current?.setCellValue('root', 'name', '변경된 Root');
    });

    expect(ref.current?.isExpanded('root')).toBe(false);
  });
});

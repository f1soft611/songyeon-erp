import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { F1GridRef } from '../src/shared/components/f1-grid';
import {
  ReceivingReturnGrid,
  createReceivingReturnColumns,
} from '../src/pages/pu/inbound/return-register/components/ReceivingReturnGrid';
import type { Receiving } from '../src/pages/pu/inbound/receiving-register/types/receiving.types';

const row = (id: number): Receiving => ({ id, materialCode: 'M1', materialName: `찹쌀${id}`, qty: -5, clientName: '가나상사', isReturn: 1 });

const renderGrid = (canDelete: boolean) => {
  const gridRef = createRef<F1GridRef<Receiving>>();
  const onAddRow = vi.fn();
  render(
    <div style={{ height: 400 }}>
      <ReceivingReturnGrid
        rows={[row(1), row(2)]}
        columns={createReceivingReturnColumns()}
        loading={false}
        gridKey={1}
        gridRef={gridRef}
        canCreate
        canDelete={canDelete}
        onAddRow={onAddRow}
        onChangesChange={() => undefined}
      />
    </div>,
  );
  return { gridRef, onAddRow };
};

const selectRowAndPressDelete = async (name: string) => {
  const cell = await screen.findByText(name);
  fireEvent.click(cell);
  fireEvent.keyDown(cell, { key: 'Delete' });
};

// 2026-11-05 반품내역: 오른쪽 클릭 [행 추가] → 반품 등록 창, 삭제 권한이 없으면 Delete 키도 막는다
describe('반품내역 표', () => {
  it('오른쪽 클릭 [행 추가]는 표에 줄을 넣지 않고 반품 등록 창을 연다', async () => {
    const { gridRef, onAddRow } = renderGrid(true);
    fireEvent.contextMenu(await screen.findByText('찹쌀1'));
    fireEvent.click(await screen.findByRole('menuitem', { name: '행 추가' }));
    expect(onAddRow).toHaveBeenCalledTimes(1);
    expect(gridRef.current?.getChanges().addedRows ?? []).toHaveLength(0);
  }, 30000);

  it('삭제 권한이 있으면 Delete 키로 뺀다', async () => {
    const { gridRef } = renderGrid(true);
    await selectRowAndPressDelete('찹쌀2');
    await waitFor(() => expect(gridRef.current?.getChanges().deletedRows.map((r) => r.id)).toEqual([2]));
  }, 30000);

  it('삭제 권한이 없으면 Delete 키로 빼지 않는다', async () => {
    const { gridRef } = renderGrid(false);
    await selectRowAndPressDelete('찹쌀1');
    expect(gridRef.current?.getChanges().deletedRows ?? []).toHaveLength(0);
  }, 30000);
});

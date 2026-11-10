import { createRef } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { F1GridRef } from '../src/shared/components/f1-grid';
import {
  ReceivingHistoryGrid,
  createReceivingHistoryColumns,
} from '../src/pages/pu/inbound/receiving-register/components/ReceivingHistoryGrid';
import { receivingDeleteBlockReason } from '../src/pages/pu/inbound/receiving-register/utils/receiving';
import type { Receiving } from '../src/pages/pu/inbound/receiving-register/types/receiving.types';

const row = (id: number, extra: Partial<Receiving> = {}): Receiving => ({
  id, materialCode: 'M1', materialName: `찹쌀${id}`, qty: 10, clientName: '가나상사', returnedQty: 0, stockQty: 100, ...extra,
});

// 2026-11-05 입고 삭제 막기: 반품이 걸린 입고, 지우면 재고가 마이너스가 되는 입고
describe('입고 삭제 막기 규칙', () => {
  it('반품이 걸린 입고는 막는다', () => {
    expect(receivingDeleteBlockReason([row(1, { returnedQty: 2 })], []))
      .toBe('반품이 등록된 입고는 지울 수 없어요. 반품등록에서 반품을 먼저 지워주세요 (찹쌀1)');
  });

  it('같은 원재료를 함께 지우면 수량을 더해 재고와 견준다(이미 빼 둔 줄 포함)', () => {
    expect(receivingDeleteBlockReason([row(1, { stockQty: 15 })], [])).toBeNull();
    expect(receivingDeleteBlockReason([row(1, { stockQty: 15 })], [row(2, { stockQty: 15 })]))
      .toBe('재고가 모자라 지울 수 없어요(찹쌀1 현재 재고 15, 지울 입고 수량 20)');
    expect(receivingDeleteBlockReason([row(1, { stockQty: 20 }), row(2, { stockQty: 20 })], [])).toBeNull();
  });
});

const renderGrid = (rows: Receiving[], canDelete = true) => {
  const gridRef = createRef<F1GridRef<Receiving>>();
  const onAddRow = vi.fn();
  const onDeleteBlocked = vi.fn();
  render(
    <div style={{ height: 400 }}>
      <ReceivingHistoryGrid
        rows={rows}
        columns={createReceivingHistoryColumns({ onError: () => undefined })}
        loading={false}
        gridKey={1}
        gridRef={gridRef}
        canCreate
        canDelete={canDelete}
        onAddRow={onAddRow}
        onDeleteBlocked={onDeleteBlocked}
        onChangesChange={() => undefined}
      />
    </div>,
  );
  return { gridRef, onAddRow, onDeleteBlocked };
};

const selectRowAndPressDelete = async (name: string) => {
  const cell = await screen.findByText(name);
  fireEvent.click(cell);
  fireEvent.keyDown(cell, { key: 'Delete' });
};

describe('입고내역 표', () => {
  it('오른쪽 클릭 [행 추가]는 표에 줄을 넣지 않고 입고 등록 창을 연다', async () => {
    const { gridRef, onAddRow } = renderGrid([row(1)]);
    fireEvent.contextMenu(await screen.findByText('찹쌀1'));
    fireEvent.click(await screen.findByRole('menuitem', { name: '행 추가' }));
    expect(onAddRow).toHaveBeenCalledTimes(1);
    expect(gridRef.current?.getChanges().addedRows ?? []).toHaveLength(0);
  }, 30000);

  it('막힌 줄은 Delete 키로 빼지 않고 이유를 알린다, 오른쪽 클릭 [행 삭제]도 꺼진다', async () => {
    const { gridRef, onDeleteBlocked } = renderGrid([row(1, { returnedQty: 3 }), row(2)]);
    await selectRowAndPressDelete('찹쌀1');
    expect(onDeleteBlocked).toHaveBeenCalledWith(expect.stringContaining('반품이 등록된 입고는 지울 수 없어요'));
    expect(gridRef.current?.getChanges().deletedRows ?? []).toHaveLength(0);
    fireEvent.contextMenu(screen.getByText('찹쌀1'));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: '행 삭제' })).toHaveAttribute('aria-disabled', 'true');
  }, 30000);

  it('막히지 않은 줄은 Delete 키로 뺀다', async () => {
    const { gridRef, onDeleteBlocked } = renderGrid([row(1), row(2)]);
    await selectRowAndPressDelete('찹쌀2');
    await waitFor(() => expect(gridRef.current?.getChanges().deletedRows.map((r) => r.id)).toEqual([2]));
    expect(onDeleteBlocked).not.toHaveBeenCalled();
  }, 30000);

  it('삭제 권한이 없으면 Delete 키로 빼지 않는다', async () => {
    const { gridRef } = renderGrid([row(1)], false);
    await selectRowAndPressDelete('찹쌀1');
    expect(gridRef.current?.getChanges().deletedRows ?? []).toHaveLength(0);
  }, 30000);
});

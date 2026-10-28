import { describe, expect, it, vi } from 'vitest';
import {
  createGridRafScheduler,
  DEFAULT_GRID_ROW_OVERSCAN,
  getVirtualColumnIndexes,
  getVirtualRowWindow,
} from '../src/shared/components/f1-grid/core/GridVirtualization';
import {
  createGridCellRange,
  getGridCellRangeBounds,
} from '../src/shared/components/f1-grid/selection/GridSelection';

describe('F1Grid virtualization engine', () => {
  it('uses a tighter default row overscan for large data rendering', () => {
    expect(DEFAULT_GRID_ROW_OVERSCAN).toBe(4);
  });

  it('calculates a fixed-height window without scanning 100,000 rows', () => {
    const window = getVirtualRowWindow({
      rowCount: 100_000,
      rowHeight: 32,
      scrollTop: 320_000,
      viewportHeight: 320,
      overscan: 4,
    });

    expect(window).toEqual({
      startIndex: 9_996,
      endIndex: 10_014,
      topPadding: 319_872,
      bottomPadding: 2_879_552,
    });
  });

  it('renders viewport columns plus overscan, pinned, and protected columns', () => {
    const indexes = getVirtualColumnIndexes({
      widths: [100, 100, 100, 100, 100, 100, 100, 100],
      scrollLeft: 300,
      viewportWidth: 250,
      overscan: 1,
      pinnedIndexes: [0, 7],
      protectedIndexes: [6],
    });

    expect(indexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the column window aligned when the scroll boundary lands exactly on a column edge', () => {
    const indexes = getVirtualColumnIndexes({
      widths: [40, 53, 66, 79, 92, 105],
      scrollLeft: 330,
      viewportWidth: 60,
      overscan: 1,
      pinnedIndexes: [0, 5],
      protectedIndexes: [4],
    });

    expect(indexes).toEqual([0, 3, 4, 5]);
  });

  it('coalesces repeated viewport updates into one animation frame using the latest value', () => {
    let frameCallback: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 7;
    });
    const cancelFrame = vi.fn();
    const onFlush = vi.fn();
    const scheduler = createGridRafScheduler(
      onFlush,
      requestFrame,
      cancelFrame,
    );

    scheduler.schedule({ scrollTop: 32, scrollLeft: 10 });
    scheduler.schedule({ scrollTop: 96, scrollLeft: 40 });

    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(onFlush).not.toHaveBeenCalled();

    frameCallback?.(16);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith({ scrollTop: 96, scrollLeft: 40 });

    scheduler.cancel();
    expect(cancelFrame).not.toHaveBeenCalled();
  });

  it('resolves an anchor/focus selection into numeric bounds once per range change', () => {
    const range = createGridCellRange(
      { rowId: 'row-8', columnIndex: 7 },
      { rowId: 'row-3', columnIndex: 2 },
    );
    const rowIndexById = new Map([
      ['row-3', 3],
      ['row-8', 8],
    ]);

    expect(getGridCellRangeBounds(range, rowIndexById)).toEqual({
      minRowIndex: 3,
      maxRowIndex: 8,
      minColumnIndex: 2,
      maxColumnIndex: 7,
    });
  });
});

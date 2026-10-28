export const DEFAULT_GRID_ROW_OVERSCAN = 4;
export const DEFAULT_GRID_COLUMN_OVERSCAN = 2;

export type GridViewportMetrics = {
  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  verticalScrollbarWidth: number;
};

export type GridRowWindow = {
  startIndex: number;
  endIndex: number;
  topPadding: number;
  bottomPadding: number;
};

export function getVirtualRowWindow({
  rowCount,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscan,
}: {
  rowCount: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  overscan: number;
}): GridRowWindow {
  const normalizedRowCount = Math.max(0, Math.floor(rowCount));
  const normalizedRowHeight = Math.max(1, rowHeight);
  const normalizedOverscan = Math.max(
    2,
    Math.min(DEFAULT_GRID_ROW_OVERSCAN, Math.max(0, Math.floor(overscan))),
  );
  const normalizedScrollTop = Math.max(0, scrollTop);
  const normalizedViewportHeight = Math.max(0, viewportHeight);
  const startIndex = Math.max(
    0,
    Math.floor(normalizedScrollTop / normalizedRowHeight) - normalizedOverscan,
  );
  const endIndex = Math.min(
    normalizedRowCount,
    Math.ceil(
      (normalizedScrollTop + normalizedViewportHeight) / normalizedRowHeight,
    ) + normalizedOverscan,
  );

  return {
    startIndex,
    endIndex,
    topPadding: startIndex * normalizedRowHeight,
    bottomPadding:
      Math.max(0, normalizedRowCount - endIndex) * normalizedRowHeight,
  };
}

export function getVirtualColumnIndexes({
  widths,
  scrollLeft,
  viewportWidth,
  overscan,
  pinnedIndexes = [],
  protectedIndexes = [],
}: {
  widths: number[];
  scrollLeft: number;
  viewportWidth: number;
  overscan: number;
  pinnedIndexes?: number[];
  protectedIndexes?: number[];
}): number[] {
  if (widths.length === 0) return [];

  const normalizedScrollLeft = Math.max(0, scrollLeft);
  const viewportEnd = normalizedScrollLeft + Math.max(0, viewportWidth);
  const normalizedOverscan = Math.max(0, Math.floor(overscan));
  let currentLeft = 0;
  let firstVisible = widths.length - 1;
  let lastVisible = 0;
  let foundVisible = false;

  widths.forEach((rawWidth, index) => {
    const width = Math.max(0, rawWidth);
    const right = currentLeft + width;
    if (right >= normalizedScrollLeft && currentLeft <= viewportEnd) {
      if (!foundVisible) firstVisible = index;
      lastVisible = index;
      foundVisible = true;
    }
    currentLeft = right;
  });

  if (!foundVisible) {
    const lastIndex = widths.length - 1;
    firstVisible = lastIndex;
    lastVisible = lastIndex;
  }

  const startIndex = Math.max(0, firstVisible - normalizedOverscan);
  const endIndex = Math.min(
    widths.length - 1,
    lastVisible + normalizedOverscan,
  );
  const indexes = new Set<number>();

  for (let index = startIndex; index <= endIndex; index += 1) {
    indexes.add(index);
  }
  [...pinnedIndexes, ...protectedIndexes].forEach((index) => {
    if (index >= 0 && index < widths.length) indexes.add(index);
  });

  return Array.from(indexes).sort((left, right) => left - right);
}

export function createGridRafScheduler<T>(
  onFlush: (value: T) => void,
  requestFrame: (
    callback: FrameRequestCallback,
  ) => number = window.requestAnimationFrame.bind(window),
  cancelFrame: (handle: number) => void = window.cancelAnimationFrame.bind(
    window,
  ),
) {
  let frameHandle: number | undefined;
  let latestValue: T | undefined;

  return {
    schedule(value: T) {
      latestValue = value;
      if (frameHandle !== undefined) return;

      frameHandle = requestFrame(() => {
        frameHandle = undefined;
        if (latestValue !== undefined) onFlush(latestValue);
      });
    },
    cancel() {
      if (frameHandle !== undefined) {
        cancelFrame(frameHandle);
        frameHandle = undefined;
      }
      latestValue = undefined;
    },
  };
}

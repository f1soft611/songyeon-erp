export type ImageResizeDirection =
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'nw';

export function calculateImageResizeWidth(
  startWidth: number,
  delta: number,
): number {
  const safeStartWidth = Number.isFinite(startWidth) ? startWidth : 320;
  const safeDelta = Number.isFinite(delta) ? delta : 0;
  return Math.max(120, Math.min(1200, Math.round(safeStartWidth + safeDelta)));
}

export function calculateImageResize(
  startWidth: number,
  startHeight: number,
  deltaX: number,
  deltaY: number,
  direction: ImageResizeDirection,
): { width: number; height: number } {
  const safeStartWidth = Number.isFinite(startWidth) ? startWidth : 320;
  const safeStartHeight = Number.isFinite(startHeight) ? startHeight : 200;
  const safeDeltaX = Number.isFinite(deltaX) ? deltaX : 0;
  const safeDeltaY = Number.isFinite(deltaY) ? deltaY : 0;
  const isCorner = direction.length === 2;
  const hasHorizontalAxis = direction.includes('e') || direction.includes('w');
  const hasVerticalAxis = direction.includes('n') || direction.includes('s');
  const horizontalDelta = direction.includes('w') ? -safeDeltaX : safeDeltaX;
  const verticalDelta = direction.includes('n') ? -safeDeltaY : safeDeltaY;

  if (isCorner) {
    const aspectRatio = Math.max(0.01, safeStartWidth / safeStartHeight);
    const proposedWidth =
      Math.abs(horizontalDelta) >= Math.abs(verticalDelta) * aspectRatio
        ? safeStartWidth + horizontalDelta
        : safeStartWidth + verticalDelta * aspectRatio;
    const width = calculateImageResizeWidth(
      safeStartWidth,
      proposedWidth - safeStartWidth,
    );
    return {
      width,
      height: Math.max(80, Math.round(width / aspectRatio)),
    };
  }

  const width = hasHorizontalAxis
    ? calculateImageResizeWidth(safeStartWidth, horizontalDelta)
    : Math.round(safeStartWidth);
  const height = hasVerticalAxis
    ? Math.max(80, Math.round(safeStartHeight + verticalDelta))
    : Math.max(80, Math.round(safeStartHeight));

  return { width, height };
}

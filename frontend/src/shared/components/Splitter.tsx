import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type SplitterDirection = 'horizontal' | 'vertical';
type SplitterMode = 'split' | 'stacked';

type SplitterProps = {
  direction?: SplitterDirection;
  mobileDirection?: SplitterDirection;
  mobileMode?: SplitterMode;
  mobileBreakpoint?: number;
  initialSize?: number;
  onSizeChange?: (size: number) => void;
  minSize?: number;
  maxSize?: number;
  handleSize?: number;
  leftFlex?: number;
  rightFlex?: number;
  ariaLabel?: string;
  className?: string;
  children: [ReactNode, ReactNode];
};

export function Splitter({
  direction = 'horizontal',
  mobileDirection,
  mobileMode = 'split',
  mobileBreakpoint = 768,
  initialSize = 320,
  onSizeChange,
  minSize = 180,
  maxSize,
  handleSize = 10,
  leftFlex,
  rightFlex,
  ariaLabel = '영역 분리기',
  className,
  children,
}: SplitterProps) {
  const [size, setSize] = useState<number>(initialSize);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < mobileBreakpoint;
  });
  const [leftRatio, setLeftRatio] = useState<number>(leftFlex ?? 1);
  const [rightRatio, setRightRatio] = useState<number>(rightFlex ?? 1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    startPoint: 0,
    startSize: initialSize,
    startRatio: leftFlex ?? 1,
  });

  const resolvedMode = isMobile ? mobileMode : 'split';
  const resolvedDirection =
    isMobile && mobileDirection ? mobileDirection : direction;

  const hasExplicitFlex =
    typeof leftFlex === 'number' || typeof rightFlex === 'number';

  useEffect(() => {
    if (typeof leftFlex === 'number') {
      setLeftRatio(leftFlex);
    }
    if (typeof rightFlex === 'number') {
      setRightRatio(rightFlex);
    }
  }, [leftFlex, rightFlex]);

  const clampSize = useCallback(
    (nextValue: number) => {
      if (resolvedMode === 'stacked') {
        return initialSize;
      }

      const root = rootRef.current;
      const containerSize = root
        ? resolvedDirection === 'horizontal'
          ? root.clientWidth
          : root.clientHeight
        : 0;

      const limitMax =
        typeof maxSize === 'number'
          ? Math.min(maxSize, containerSize || maxSize || maxSize)
          : containerSize || Number.POSITIVE_INFINITY;

      return Math.min(
        Math.max(nextValue, minSize),
        Math.max(minSize, limitMax),
      );
    },
    [initialSize, maxSize, minSize, resolvedDirection, resolvedMode],
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  useEffect(() => {
    if (resolvedMode === 'stacked') {
      dragRef.current.active = false;
      document.body.style.cursor = '';
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragRef.current.active || !rootRef.current) return;

      const delta =
        resolvedDirection === 'horizontal'
          ? event.clientX - dragRef.current.startPoint
          : event.clientY - dragRef.current.startPoint;

      if (hasExplicitFlex) {
        const totalRatio = leftRatio + rightRatio;
        const rootSize =
          resolvedDirection === 'horizontal'
            ? rootRef.current.clientWidth
            : rootRef.current.clientHeight;

        if (rootSize <= 0 || totalRatio <= 0) return;

        const startLeftSize =
          (dragRef.current.startRatio / totalRatio) * rootSize;
        const minLeftSize = minSize;
        const maxLeftSize = Math.max(
          minLeftSize,
          typeof maxSize === 'number'
            ? Math.min(maxSize, rootSize - minLeftSize)
            : rootSize - minLeftSize,
        );
        const nextLeftSize = Math.min(
          Math.max(startLeftSize + delta, minLeftSize),
          maxLeftSize,
        );
        const nextLeftRatio = (nextLeftSize / rootSize) * totalRatio;

        setLeftRatio(nextLeftRatio);
        setRightRatio(Math.max(totalRatio - nextLeftRatio, 0.001));
        return;
      }

      const nextSize = clampSize(dragRef.current.startSize + delta);
      setSize(nextSize);
      onSizeChange?.(nextSize);
    };

    const handlePointerUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    clampSize,
    hasExplicitFlex,
    leftRatio,
    maxSize,
    minSize,
    onSizeChange,
    resolvedDirection,
    resolvedMode,
    rightRatio,
  ]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (resolvedMode === 'stacked') return;

      event.preventDefault();
      dragRef.current = {
        active: true,
        startPoint:
          resolvedDirection === 'horizontal' ? event.clientX : event.clientY,
        startSize: size,
        startRatio: hasExplicitFlex ? leftRatio : 1,
      };
      document.body.style.cursor =
        resolvedDirection === 'horizontal' ? 'col-resize' : 'row-resize';
    },
    [hasExplicitFlex, leftRatio, resolvedDirection, resolvedMode, size],
  );

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection:
      resolvedMode === 'stacked'
        ? 'column'
        : resolvedDirection === 'horizontal'
          ? 'row'
          : 'column',
    width: '100%',
    height: resolvedMode === 'stacked' ? 'auto' : '100%',
    minWidth: 0,
    minHeight: resolvedMode === 'stacked' ? '100%' : 0,
    overflowX: 'hidden',
    overflowY: resolvedMode === 'stacked' ? 'auto' : 'hidden',
    position: 'relative',
  };

  const leftStyle: CSSProperties = {
    flex:
      resolvedMode === 'stacked'
        ? '0 0 auto'
        : hasExplicitFlex
          ? `${leftRatio} 1 0%`
          : `0 0 ${size}px`,
    width:
      resolvedMode === 'stacked'
        ? '100%'
        : hasExplicitFlex
          ? 'auto'
          : resolvedDirection === 'horizontal'
            ? `${size}px`
            : '100%',
    height:
      resolvedMode === 'stacked'
        ? 'auto'
        : resolvedDirection === 'vertical'
          ? `${size}px`
          : '100%',
    minWidth: 0,
    minHeight: resolvedMode === 'stacked' ? 240 : 0,
    overflow: resolvedMode === 'stacked' ? 'visible' : 'hidden',
  };

  const rightStyle: CSSProperties = {
    flex:
      resolvedMode === 'stacked'
        ? '0 0 auto'
        : hasExplicitFlex
          ? `${rightRatio} 1 0%`
          : 1,
    minWidth: 0,
    minHeight: resolvedMode === 'stacked' ? 240 : 0,
    overflow: resolvedMode === 'stacked' ? 'visible' : 'hidden',
  };

  const handleStyle: CSSProperties = {
    position: 'relative',
    flex: resolvedMode === 'stacked' ? '0 0 0px' : `0 0 ${handleSize}px`,
    width:
      resolvedMode === 'stacked'
        ? '0px'
        : resolvedDirection === 'horizontal'
          ? `${handleSize}px`
          : '100%',
    height:
      resolvedMode === 'stacked'
        ? '0px'
        : resolvedDirection === 'vertical'
          ? `${handleSize}px`
          : '100%',
    display: resolvedMode === 'stacked' ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    borderLeft:
      resolvedMode === 'stacked' || resolvedDirection !== 'horizontal'
        ? 'none'
        : '1px solid rgba(148, 163, 184, 0.18)',
    borderTop:
      resolvedMode === 'stacked' || resolvedDirection !== 'vertical'
        ? 'none'
        : '1px solid rgba(148, 163, 184, 0.18)',
    cursor:
      resolvedMode === 'stacked'
        ? 'auto'
        : resolvedDirection === 'horizontal'
          ? 'col-resize'
          : 'row-resize',
    userSelect: 'none',
    touchAction: 'none',
  };

  return (
    <div ref={rootRef} className={className} style={containerStyle}>
      <div style={leftStyle}>{children[0]}</div>
      {!isMobile ? (
        <div
          role="separator"
          aria-orientation={
            resolvedDirection === 'horizontal' ? 'horizontal' : 'vertical'
          }
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          style={handleStyle}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'block',
              width: resolvedDirection === 'horizontal' ? '2px' : '32px',
              height: resolvedDirection === 'vertical' ? '2px' : '32px',
              borderRadius: 999,
              backgroundColor: 'rgba(100, 116, 139, 0.9)',
            }}
          />
        </div>
      ) : null}
      <div style={rightStyle}>{children[1]}</div>
    </div>
  );
}

export default Splitter;

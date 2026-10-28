import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid } from '../src/shared/components/f1-grid/core/F1Grid';

describe('F1Grid pinned-column drag selection', () => {
  it('keeps the overlay aligned when a pinned left column is part of the drag range', () => {
    const getBoundingClientRect = (
      left: number,
      top: number,
      right: number,
      bottom: number,
    ) => ({
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
      x: left,
      y: top,
      toJSON: () => ({}),
    });

    render(
      <F1Grid
        rows={[
          { id: '1', code: 'A', name: 'Alpha' },
          { id: '2', code: 'B', name: 'Beta' },
        ]}
        columns={[
          { field: 'code', headerName: 'Code', pinned: 'left' },
          { field: 'name', headerName: 'Name' },
        ]}
        rowKey="id"
      />,
    );

    const grid = screen.getByRole('grid');
    const body = Array.from(grid.children)[1] as HTMLDivElement;
    Object.defineProperty(body, 'scrollLeft', {
      configurable: true,
      value: 120,
      writable: true,
    });
    Object.defineProperty(body, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });
    Object.defineProperty(body, 'getBoundingClientRect', {
      configurable: true,
      value: () => getBoundingClientRect(0, 0, 1000, 500),
    });

    const start = screen.getByRole('gridcell', { name: 'A' });
    const end = screen.getByRole('gridcell', { name: 'Beta' });
    start.setAttribute('data-grid-pinned', 'left');
    end.removeAttribute('data-grid-pinned');

    Object.defineProperty(start, 'getBoundingClientRect', {
      configurable: true,
      value: () => getBoundingClientRect(50, 20, 120, 40),
    });
    Object.defineProperty(end, 'getBoundingClientRect', {
      configurable: true,
      value: () => getBoundingClientRect(220, 20, 290, 60),
    });

    fireEvent.mouseDown(start);
    fireEvent.mouseEnter(end);

    const overlay = document.querySelector(
      '[data-range-overlay="drag"]',
    ) as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect(
      parseFloat(window.getComputedStyle(overlay as HTMLElement).left),
    ).toBe(171);
  });
});

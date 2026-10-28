import { describe, expect, it } from 'vitest';
import {
  calculateImageResize,
  calculateImageResizeWidth,
} from '../src/shared/components/rich-text-editor/imageResize';

describe('shared rich text editor image resizing', () => {
  it('clamps resized widths to the supported range', () => {
    expect(calculateImageResizeWidth(320, -500)).toBe(120);
    expect(calculateImageResizeWidth(320, 100)).toBe(420);
    expect(calculateImageResizeWidth(1200, 300)).toBe(1200);
  });

  it('preserves aspect ratio for corner resize handles', () => {
    expect(calculateImageResize(320, 200, 100, 0, 'se')).toEqual({
      width: 420,
      height: 263,
    });
  });
});

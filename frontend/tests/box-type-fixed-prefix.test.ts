import { describe, expect, it } from 'vitest';
import { applyFixedPrefix, withFixedPrefix } from '../src/shared/utils/fixedPrefixInput';

const P = 'PACK-';

describe('포장유형 코드 편집창: 앞의 PACK- 는 지우지 못한다', () => {
  it('PACK- 뒤만 바뀌는 입력은 그대로 둔다', () => {
    expect(applyFixedPrefix('PACK-', 5, 5, 'insertText', 'p', P)).toBe('pass');
    expect(applyFixedPrefix('PACK-AB', 7, 7, 'deleteContentBackward', null, P)).toBe('pass');
    expect(applyFixedPrefix('PACK-AB', 5, 7, 'deleteContentBackward', null, P)).toBe('pass');
  });

  it('PACK- 를 지우는 입력은 막는다(뒤로 지우기는 커서가 PACK- 바로 뒤일 때도)', () => {
    expect(applyFixedPrefix('PACK-', 5, 5, 'deleteContentBackward', null, P)).toBe('block');
    expect(applyFixedPrefix('PACK-AB', 3, 3, 'deleteContentForward', null, P)).toBe('block');
    expect(applyFixedPrefix('PACK-AB', 2, 2, 'deleteWordBackward', null, P)).toBe('block');
  });

  it('PACK- 까지 걸친 고르기 · 붙여넣기는 PACK- 를 남기고 나머지만 바꾼다', () => {
    // 전체를 고르고 지움
    expect(applyFixedPrefix('PACK-AB', 0, 7, 'deleteContentBackward', null, P)).toEqual({ value: 'PACK-', caret: 5 });
    // 전체를 고르고 글자를 침
    expect(applyFixedPrefix('PACK-AB', 0, 7, 'insertText', 'x', P)).toEqual({ value: 'PACK-x', caret: 6 });
    // PACK- 안쪽에 커서를 두고 글자를 침 → PACK- 바로 뒤에 들어간다
    expect(applyFixedPrefix('PACK-AB', 2, 2, 'insertText', 'z', P)).toEqual({ value: 'PACK-zAB', caret: 6 });
    // 붙여넣기
    expect(applyFixedPrefix('PACK-AB', 3, 6, 'insertFromPaste', 'XY', P)).toEqual({ value: 'PACK-XYB', caret: 7 });
  });

  it('PACK- 가 통째로 빠진 값에는 다시 붙인다', () => {
    expect(withFixedPrefix('p', P)).toBe('PACK-p');
    expect(withFixedPrefix('PACK-AB', P)).toBe('PACK-AB');
    expect(withFixedPrefix('pack-std', P)).toBe('PACK-std');
    expect(withFixedPrefix('PACK', P)).toBe('PACK-');
    expect(withFixedPrefix('', P)).toBe('PACK-');
  });
});

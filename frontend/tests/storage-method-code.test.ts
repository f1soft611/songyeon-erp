import { describe, expect, it } from 'vitest';
import { storageCodeOf } from '../src/pages/sa/product/utils/productRegister';

// 보관방법 공통코드(2026-10-23): 견적 등에서 넘어온 글자를 코드로 바꾼다
const options = [
  { code: '001', name: '실온(1℃~35℃)' },
  { code: '002', name: '냉장(0℃~10℃)' },
  { code: '003', name: '냉동(-18℃이하)' },
];

describe('storageCodeOf', () => {
  it('keeps codes and maps exact names', () => {
    expect(storageCodeOf(options, '002')).toBe('002');
    expect(storageCodeOf(options, '냉동(-18℃이하)')).toBe('003');
  });

  it('maps old screen text by its leading word', () => {
    expect(storageCodeOf(options, '냉장보관(0℃~10℃)')).toBe('002');
    expect(storageCodeOf(options, '실온보관(1℃~35℃)')).toBe('001');
  });

  it('returns empty for blank or unknown text', () => {
    expect(storageCodeOf(options, '')).toBe('');
    expect(storageCodeOf(options, '상온')).toBe('');
  });
});

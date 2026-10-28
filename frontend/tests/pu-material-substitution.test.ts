import { describe, expect, it } from 'vitest';

import {
  UNDO_MESSAGE, applyCount, candidatesFor, clientOrStock, detailSubText, formatQty, materialLabel, summaryText,
  type SubstitutionSchedule,
} from '../src/pages/pu/substitution/utils/materialSubstitution';

const row = (id: number, extra: Partial<SubstitutionSchedule> = {}): SubstitutionSchedule => ({
  id, productName: `품목${id}`, clientName: '대한상사', orderQty: '1,000kg', lotNo: `20261013-0${id}`, substitutionCount: 0, ...extra,
});

describe('재료 치환등록 utils(송연 39-material-substitute.js)', () => {
  it('목록 요약: 건수와 바꿔 쓰는 원재료 수(없으면 생략), 빈 목록은 빈 글자', () => {
    expect(summaryText([])).toBe('');
    expect(summaryText([row(1), row(2)])).toBe('생산 2건');
    expect(summaryText([row(1, { substitutionCount: 2 }), row(2, { substitutionCount: 1 })])).toBe('생산 2건  ·  바꿔 쓰는 원재료 3건');
  });

  it('거래처가 없으면 재고생산, 상세 머리 한 줄', () => {
    expect(clientOrStock('')).toBe('재고생산');
    expect(clientOrStock(null)).toBe('재고생산');
    expect(detailSubText(row(1))).toBe('대한상사  ·  생산지시량 1,000kg  ·  로트 20261013-01');
    expect(detailSubText(row(1, { clientName: '', orderQty: '', lotNo: '' }))).toBe('재고생산  ·  생산지시량 -  ·  로트 -');
  });

  it('후보: 이름 뒤에 코드를 붙이고 자기 자신은 뺀다', () => {
    const materials = [{ code: 'M1', name: '양파밀링' }, { code: 'M2', name: '양파밀링' }, { code: 'M3', name: '설탕', stockQty: 12.5 }];
    expect(materialLabel(materials[1])).toBe('양파밀링 (M2)');
    expect(candidatesFor(materials, 'M1').map((m) => m.code)).toEqual(['M2', 'M3']);
  });

  it('바꾼 뒤 목록의 원재료치환 칸만 고친다', () => {
    const next = applyCount([row(1), row(2)], { id: 2, substitutionCount: 1 });
    expect(next.map((r) => r.substitutionCount)).toEqual([0, 1]);
    expect(applyCount([row(1, { substitutionCount: 1 })], { id: 1 })[0].substitutionCount).toBe(0);
  });

  it('숫자와 확인 문구', () => {
    expect(formatQty(5.99)).toBe('5.99');
    expect(formatQty(1234.567)).toBe('1,234.57');
    expect(formatQty(null)).toBe('');
    expect(UNDO_MESSAGE).toBe('이 치환을 되돌릴까요?\n원래 배합표의 원재료로 다시 계산됩니다.');
  });
});

import { describe, expect, it } from 'vitest';

import {
  accBody, accFormOf, cardNumberText, deleteConfirmText, directionOf, filterSubjects, payAccountOptions, payAccountText, rowName, toggledBody,
  type AccBank, type AccCard, type AccSubject,
} from '../src/pages/ha/accbasic/utils/accBasic';

const subjects: AccSubject[] = [
  { id: 1, code: '101', name: '현금', category: '자산', direction: '차변', active: 1 },
  { id: 2, code: '511', name: '복리후생비', category: '비용', direction: '차변', active: 1 },
  { id: 3, code: '999', name: '안쓰는계정', category: '비용', direction: '차변', active: 0 },
];
const banks: AccBank[] = [
  { id: 1, bankName: '농협', accountNo: '301-1234', active: 1 },
  { id: 2, bankName: '신한', accountNo: '110-9999', active: 0 },
];

describe('기초회계정보(송연 31-acc-basic.js)', () => {
  it('계정과목 찾기: 이름 · 코드, 사용안함 숨기기', () => {
    expect(filterSubjects(subjects, '', true).map((r) => r.id)).toEqual([1, 2]);
    expect(filterSubjects(subjects, '', false).map((r) => r.id)).toEqual([1, 2, 3]);
    expect(filterSubjects(subjects, '51', true).map((r) => r.id)).toEqual([2]);
    expect(filterSubjects(subjects, '현금', true).map((r) => r.id)).toEqual([1]);
  });

  it('증가할 때: 자산 · 비용은 차변, 부채 · 자본 · 수익은 대변', () => {
    expect(['자산', '부채', '자본', '수익', '비용'].map(directionOf)).toEqual(['차변', '대변', '대변', '대변', '차변']);
  });

  it('카드 번호 · 결제계좌 글자, 지우기 확인 이름', () => {
    const card: AccCard = { id: 5, issuer: '신한', last4: '4821', active: 1, payBank: '농협', payAccountNo: '301-1234' };
    expect(cardNumberText('4821')).toBe('**** **** **** 4821');
    expect(payAccountText(card)).toBe('농협 301-1234');
    expect(payAccountText({ ...card, payBank: null })).toBe('');
    expect(rowName('subject', subjects[1])).toBe('511 복리후생비');
    expect(rowName('bank', banks[0])).toBe('농협 301-1234');
    expect(rowName('card', card)).toBe('신한 ****4821');
    expect(deleteConfirmText('511 복리후생비').startsWith('"511 복리후생비" 을(를) 지울까요?')).toBe(true);
  });

  it('결제계좌 고르기: 사용 중인 계좌만, 이미 물려 있던 사용안함 계좌는 남긴다', () => {
    expect(payAccountOptions(banks, null)).toEqual([{ value: 1, label: '농협 301-1234' }]);
    expect(payAccountOptions(banks, 2).map((o) => o.label)).toEqual(['농협 301-1234', '신한 110-9999 (사용안함)']);
  });

  it('저장 몸통: 탭 칸만 · 앞뒤 공백 떼기, 사용 켜고 끄기는 지금 값 그대로 active 만 뒤집기', () => {
    const f = { ...accFormOf('subject', null), code: ' 511 ', name: ' 복리후생비 ', note: ' ' };
    expect(accBody('subject', f)).toEqual({ code: '511', name: '복리후생비', category: '비용', note: '', active: 1 });
    const card: AccCard = { id: 5, issuer: '신한', last4: '4821', nickname: '영업부', holder: null, bankAccountId: 1, note: null, active: 1 };
    expect(accBody('card', accFormOf('card', card))).toEqual({ issuer: '신한', last4: '4821', nickname: '영업부', holder: '', bankAccountId: 1, note: '', active: 1 });
    expect(toggledBody('subject', subjects[2])).toMatchObject({ code: '999', name: '안쓰는계정', active: 1 });
    expect(toggledBody('bank', banks[0])).toMatchObject({ bankName: '농협', accountNo: '301-1234', active: 0 });
  });
});

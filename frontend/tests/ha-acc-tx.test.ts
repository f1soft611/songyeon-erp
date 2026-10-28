import { describe, expect, it } from 'vitest';

import {
  TX_EXCEL_COLUMNS, bankOptions, cardOptions, deleteText, emptyTxForm, excelFileName, signedMoney, subjectOptions, summaryParts, txBody, txFormOf, whereText,
  type AccTransaction,
} from '../src/pages/ha/acctx/utils/accTx';

const tx = (extra: Partial<AccTransaction> = {}): AccTransaction => ({ id: 1, kind: '출금', txDate: '2026-10-14', amount: 15000, ...extra });

describe('회계거래현황(송연 33-acc-cash.js 12~171)', () => {
  it('금액: 입금은 +, 출금은 −, 합계 글자(차이는 입금 − 출금)', () => {
    expect(signedMoney(tx())).toBe('−15,000');
    expect(signedMoney(tx({ kind: '입금', amount: 1234567 }))).toBe('+1,234,567');
    expect(summaryParts(1000, 3000)).toEqual({ inText: '1,000', outText: '3,000', diffText: '-2,000' });
  });

  it('계좌·카드 칸: 계좌가 있으면 계좌, 없으면 카드 뒤 4자리', () => {
    expect(whereText(tx({ bankName: '농협', accountNo: '301-1234' }))).toBe('농협 301-1234');
    expect(whereText(tx({ cardIssuer: '신한', cardLast4: '4821' }))).toBe('신한 ****4821');
    expect(whereText(tx())).toBe('');
  });

  it('고르는 칸: 사용 중인 것만, 이미 물려 있던 사용안함은 남긴다', () => {
    const subjects = [{ id: 1, code: '511', name: '복리후생비', category: '비용', active: 1 }, { id: 2, code: '999', name: '안씀', category: '비용', active: 0 }];
    expect(subjectOptions(subjects).map((o) => o.label)).toEqual(['511 복리후생비 (비용)']);
    expect(subjectOptions(subjects, 2).map((o) => o.label)).toEqual(['511 복리후생비 (비용)', '999 안씀 (비용) · 사용안함']);
    expect(bankOptions([{ id: 1, bankName: '농협', accountNo: '301', active: 1 }]).map((o) => o.label)).toEqual(['농협 301']);
    expect(cardOptions([{ id: 1, issuer: '신한', last4: '4821', nickname: '법인', active: 1 }]).map((o) => o.label)).toEqual(['신한 ****4821 · 법인']);
  });

  it('창: 새로 적기는 출금 · 오늘 · 계좌, 고치기는 그 줄 값, 보낼 때 빈 고르기는 null', () => {
    expect(emptyTxForm('2026-10-14')).toMatchObject({ kind: '출금', txDate: '2026-10-14', method: '계좌', amount: '' });
    const f = txFormOf(tx({ subjectId: 3, bankAccountId: null, note: '식대' }));
    expect(f).toMatchObject({ subjectId: '3', bankAccountId: '', amount: '15000', note: '식대' });
    expect(txBody({ ...f, clientName: ' 태화 ' })).toMatchObject({ clientName: '태화', subjectId: 3, bankAccountId: null, cardId: null, amount: '15000' });
  });

  it('지우기 문구 · 엑셀 이름 · 칸', () => {
    expect(deleteText(tx())).toBe('2026-10-14 출금 15,000원을 지울까요?');
    expect(excelFileName('2026-10-01', '2026-10-31')).toBe('회계거래현황_2026-10-01_2026-10-31.xlsx');
    expect(TX_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['날짜', '구분', '거래처', '계정코드', '계정과목', '금액', '수단', '계좌·카드', '비고', '적은 사람']);
  });
});

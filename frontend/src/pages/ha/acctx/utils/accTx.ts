// 인사·회계 > 회계거래현황 (송연 33-acc-cash.js 12~171)
import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import type { AccBank, AccCard, AccSubject } from '../../accbasic/utils/accBasic';

export type TxKind = '입금' | '출금';
export const TX_METHODS = ['계좌', '현금', '카드', '어음', '기타'];

export type AccTransaction = {
  id: number; kind: TxKind; txDate: string; clientName?: string | null; subjectId?: number | null; amount: number; method?: string | null;
  bankAccountId?: number | null; cardId?: number | null; note?: string | null; createdBy?: string | null;
  subjectCode?: string | null; subjectName?: string | null; subjectCategory?: string | null;
  bankName?: string | null; accountNo?: string | null; cardIssuer?: string | null; cardLast4?: string | null;
};
export type TxFilter = { start: string; end: string; kind: string; clientName: string };

export const money = (v: number | null | undefined) => Number(v || 0).toLocaleString('ko-KR');
// 금액 칸: 입금은 +, 출금은 − (금액은 늘 양수로 적히고 방향은 구분이 정한다)
export const signedMoney = (r: AccTransaction) => `${r.kind === '입금' ? '+' : '−'}${money(r.amount)}`;
export const whereText = (r: AccTransaction) =>
  (r.bankName ? `${r.bankName} ${r.accountNo || ''}` : r.cardIssuer ? `${r.cardIssuer} ****${r.cardLast4 || ''}` : '');
export const summaryParts = (inTotal: number, outTotal: number) => ({ inText: money(inTotal), outText: money(outTotal), diffText: money(inTotal - outTotal) });

// 고르는 칸: 사용안함으로 내린 것은 새로 고를 수 없되, 이미 물려 있던 것은 남긴다(안 그러면 지난 전표를 고칠 때 빈칸이 된다)
function usable<T extends { id: number; active: number }>(list: T[], current: number | null | undefined, label: (x: T) => string) {
  return list.filter((x) => x.active || (current != null && x.id === current))
    .map((x) => ({ value: x.id, label: `${label(x)}${x.active ? '' : ' · 사용안함'}` }));
}
export const subjectOptions = (list: AccSubject[], current?: number | null) => usable(list, current, (s) => `${s.code} ${s.name} (${s.category})`);
export const bankOptions = (list: AccBank[], current?: number | null) => usable(list, current, (b) => `${b.bankName} ${b.accountNo}`);
export const cardOptions = (list: AccCard[], current?: number | null) => usable(list, current, (c) => `${c.issuer} ****${c.last4}${c.nickname ? ` · ${c.nickname}` : ''}`);

// 적기 · 고치기 창 입력값
export type TxForm = { kind: TxKind; txDate: string; clientName: string; amount: string; method: string; subjectId: string; bankAccountId: string; cardId: string; note: string };
export const emptyTxForm = (today: string): TxForm => ({ kind: '출금', txDate: today, clientName: '', amount: '', method: '계좌', subjectId: '', bankAccountId: '', cardId: '', note: '' });
export const txFormOf = (r: AccTransaction): TxForm => ({
  kind: r.kind, txDate: r.txDate || '', clientName: r.clientName || '', amount: r.amount != null ? String(r.amount) : '', method: r.method || '계좌',
  subjectId: r.subjectId != null ? String(r.subjectId) : '', bankAccountId: r.bankAccountId != null ? String(r.bankAccountId) : '',
  cardId: r.cardId != null ? String(r.cardId) : '', note: r.note || '',
});
export const txBody = (f: TxForm) => ({
  kind: f.kind, txDate: f.txDate, clientName: f.clientName.trim(), amount: f.amount, method: f.method,
  subjectId: f.subjectId ? Number(f.subjectId) : null, bankAccountId: f.bankAccountId ? Number(f.bankAccountId) : null,
  cardId: f.cardId ? Number(f.cardId) : null, note: f.note.trim(),
});

export const deleteText = (r: AccTransaction) => `${r.txDate} ${r.kind} ${money(r.amount)}원을 지울까요?`;
export const excelFileName = (start: string, end: string) => `회계거래현황_${start}_${end}.xlsx`;
export const TX_EXCEL_COLUMNS: ExcelColumn<AccTransaction>[] = [
  { key: 'txDate', label: '날짜' }, { key: 'kind', label: '구분' }, { key: 'clientName', label: '거래처', width: 16 },
  { key: 'subjectCode', label: '계정코드' }, { key: 'subjectName', label: '계정과목', width: 14 },
  { key: 'amount', label: '금액' }, { key: 'method', label: '수단' },
  { key: (r) => whereText(r), label: '계좌·카드', width: 22 }, { key: 'note', label: '비고', width: 20 }, { key: 'createdBy', label: '적은 사람' },
];

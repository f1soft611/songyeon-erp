// 인사·회계 > 매출·매입관리 (송연 10-accounting.js ACCM · accounting.py /api/accounting/trade-report)
// 매출과 매입은 보는 법이 같아서 한 화면 두 탭으로 둔다. 두 탭이 하는 일이 똑같고 칸 이름만 다르다 — 한 벌로 만들고 설정만 바꾼다.
import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import { todayFileTag } from '../../../../shared/utils/excelFile';

export type TradeKind = '매출' | '매입';
export type TradeView = 'summary' | 'detail' | 'yoy';
export type TradeUnit = 'day' | 'month' | 'year';

export type TradeRow = {
  date: string | null; clientName: string; itemName: string; qty: number | null; unitPrice: number | null;
  supplyAmount: number | null; vatAmount: number | null; amount: number | null;
};
export type TradePeriod = { period: string; count: number; qty: number; supplyAmount: number; vatAmount: number; amount: number; unpriced: number };
export type TradeCompare = { period: string; cur: number; prev: number; diff: number; pct: number | null };
export type TradeReport = {
  kind: TradeKind; view: TradeView; unit: TradeUnit; start: string; end: string; clients: string[]; items: string[];
  totalAmount: number; totalQty: number; unpriced: number;
  rows?: TradeRow[]; periods?: TradePeriod[]; compare?: TradeCompare[];
  prevStart?: string; prevEnd?: string; totalPrev?: number; totalDiff?: number; totalPct?: number | null;
};
export type TradeSearch = { start: string; end: string; view: TradeView; unit: TradeUnit; clients: string[]; items: string[] };

export const ACC_SALES: Record<TradeKind, { tab: string; itemLabel: string; dateLabel: string; totalLabel: string; meta: string }> = {
  매출: {
    tab: '매출관리', itemLabel: '제품명', dateLabel: '출고일', totalLabel: '총 매출',
    meta: '확정된 출하 × 판매단가(단가관리) 기준으로 계산한 매출이에요. 이월된 건은 이월된 달에 반영돼요.',
  },
  매입: {
    tab: '매입관리', itemLabel: '원재료명', dateLabel: '입고일', totalLabel: '총 매입액(부가세포함)',
    meta: '입고등록된 원재료 매입 내역이에요. 단가 × 수량 = 공급가액, 부가세(10%)는 자동 계산돼요.',
  },
};
export const UNIT_LABEL: Record<TradeUnit, string> = { day: '일자', month: '월', year: '년도' };
export const VIEW_OPTIONS: { value: TradeView; label: string }[] = [
  { value: 'summary', label: '집계' }, { value: 'detail', label: '내역' }, { value: 'yoy', label: '전년동기간비교' },
];
export const UNIT_OPTIONS: { value: TradeUnit; label: string }[] = [
  { value: 'day', label: '일별' }, { value: 'month', label: '월별' }, { value: 'year', label: '년별' },
];

// 송연 fmt(수량) / fmtPrice(금액). 매출액은 판매단가 × 수량이라 소수가 남는데, 여기서만 원 단위로 반올림하면 줄마다 깎여 합계가 안 맞는다
export const qtyText = (v: number | null | undefined) =>
  (v == null || !Number.isFinite(v) ? '' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 }));
export const moneyText = (v: number | null | undefined) =>
  (v == null || !Number.isFinite(v) ? '' : (Math.round(v * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 }));
// 합계 · 집계처럼 늘 숫자가 있는 칸(송연 accmMoney: 빈 값은 0원)
export const sumMoney = (v: number | null | undefined) => moneyText(v ?? 0);
// 증감: + / − 를 붙인다. 증감률: 작년이 0원이면 몇 % 늘었는지 말할 수 없어 '신규'(올해도 0 이면 '-')
export const signedMoney = (d: number) => `${d >= 0 ? '+' : '−'}${sumMoney(Math.abs(d))}`;
export const pctText = (pct: number | null | undefined, cur: number) =>
  (pct == null ? (cur > 0 ? '신규' : '') : `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`);

// 조회 창을 처음 열 때: 이번 달 1일 ~ 오늘
export function defaultPeriod(date = new Date()) {
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return { start: `${ym}-01`, end: `${ym}-${String(date.getDate()).padStart(2, '0')}` };
}
export function searchError(s: { start: string; end: string }): string {
  if (!s.start || !s.end) return '조회 기간을 골라주세요';
  if (s.start > s.end) return '시작일이 종료일보다 늦어요';
  return '';
}

// 조건 줄. 몇 곳을 담았는지만 적는다(스무 곳을 담으면 이름이 화면을 덮는다. 무엇을 담았는지는 조회 창에 그대로 남아 있다)
export function conditionText(r: TradeReport): string {
  const viewName = { summary: `집계(${UNIT_LABEL[r.unit]})`, detail: '내역', yoy: '전년동기간비교' }[r.view];
  const picked = (list: string[], name: string, unit: string) => (list.length ? `${name} ${list.length}${unit}` : `${name} 전체`);
  const base = `${r.start} ~ ${r.end} · ${r.kind} · ${viewName} · ${picked(r.clients, '거래처', '곳')} · ${picked(r.items, ACC_SALES[r.kind].itemLabel, '개')}`;
  return r.view === 'yoy' ? `${base} (작년 ${r.prevStart} ~ ${r.prevEnd})` : base;
}

// 담는 칸의 '해당하는 거래처가 없습니다' — 받침이 있으면 '이', 없으면 '가'
export function josaIGa(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return '이(가)';
  return (last - 0xac00) % 28 ? '이' : '가';
}
export const PICKER_LIMIT = 50;

// 엑셀(송연 downloadRowsAsExcel: 이름 끝에 오늘 날짜)
export function excelOf(r: TradeReport): { rows: unknown[]; columns: ExcelColumn<never>[]; fileName: string } {
  const cfg = ACC_SALES[r.kind];
  const isSale = r.kind === '매출';
  const stamp = `${r.kind}관리_${r.start}~${r.end}`;
  const name = (suffix: string) => `${stamp}_${suffix}_${todayFileTag()}.xlsx`;
  const vat = isSale ? [] : [{ key: 'supplyAmount', label: '공급가액' }, { key: 'vatAmount', label: '부가세' }];
  if (r.view === 'detail') {
    const columns = [
      { key: 'date', label: cfg.dateLabel }, { key: 'clientName', label: '거래처', width: 16 }, { key: 'itemName', label: cfg.itemLabel, width: 18 },
      { key: 'qty', label: '수량' }, { key: 'unitPrice', label: isSale ? '판매단가' : '단가' }, ...vat, { key: 'amount', label: isSale ? '매출액' : '합계' },
    ];
    return { rows: r.rows ?? [], columns: columns as ExcelColumn<never>[], fileName: name('내역') };
  }
  if (r.view === 'summary') {
    const columns = [
      { key: 'period', label: UNIT_LABEL[r.unit] }, { key: 'count', label: '건수' }, { key: 'qty', label: '수량' }, ...vat,
      { key: 'amount', label: isSale ? '매출액' : '합계금액' },
    ];
    return { rows: r.periods ?? [], columns: columns as ExcelColumn<never>[], fileName: name('집계') };
  }
  const columns: ExcelColumn<TradeCompare>[] = [
    { key: 'period', label: UNIT_LABEL[r.unit] }, { key: 'cur', label: '올해' }, { key: 'prev', label: '작년' }, { key: 'diff', label: '증감' },
    { key: (c) => (c.pct == null ? '신규' : c.pct), label: '증감률(%)' },
  ];
  return { rows: r.compare ?? [], columns: columns as unknown as ExcelColumn<never>[], fileName: name('전년비교') };
}

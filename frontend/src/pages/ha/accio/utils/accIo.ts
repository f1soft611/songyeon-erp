// 인사·회계 > 입·출금관리 (송연 33-acc-cash.js 174~302)
// 회계거래현황과 같은 전표를 한쪽(입금 또는 출금)만 기간 안에서 계정과목별 · 거래처별 · 수단별로 묶어 본다. 여기서는 고치지 않는다.
import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import type { AccTransaction, TxKind } from '../../acctx/utils/accTx';

export type Bucket = { label: string; amount: number; count: number };
export type CashReport = { kind: TxKind; start: string; end: string; rows: AccTransaction[]; total: number; bySubject: Bucket[]; byClient: Bucket[]; byMethod: Bucket[] };

// 두 탭이 하는 일이 똑같고 kind 만 다르다. 한 벌로 만들고 kind 만 바꾼다(따로 만들면 한쪽을 고칠 때 다른 쪽을 빠뜨린다)
export const ACC_REPORTS: Record<TxKind, { color: string; meta: string; tab: string }> = {
  입금: { color: '#0f766e', meta: '기간 안에 들어온 돈을 계정과목별·거래처별로 묶어서 봐요', tab: '입금관리' },
  출금: { color: '#dc2626', meta: '기간 안에 나간 돈을 계정과목별·거래처별로 묶어서 봐요', tab: '출금관리' },
};

export const reportFileName = (r: CashReport) => `${r.kind}관리_${r.start}_${r.end}.xlsx`;
export const REPORT_EXCEL_COLUMNS: ExcelColumn<AccTransaction>[] = [
  { key: 'txDate', label: '날짜' }, { key: 'clientName', label: '거래처', width: 16 },
  { key: 'subjectCode', label: '계정코드' }, { key: 'subjectName', label: '계정과목', width: 14 },
  { key: 'amount', label: '금액' }, { key: 'method', label: '수단' }, { key: 'note', label: '비고', width: 20 },
];

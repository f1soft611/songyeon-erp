import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import { formatQty } from '../../../../shared/utils/numberFormat';
import { parseQtyNumber } from '../../../sa/order/utils/salesOrder';

// 생산관리 > 생산확정 (송연 PD0001, 기존 20-production.js). 생산지시량은 '1,000kg' 처럼 단위가 붙은 글자다.

// 서버 생산확정 한 줄
export type SavedSchedule = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  actualQty?: string | null;
  note?: string | null;
  logisticsDate?: string | null;
  sourceOrderId?: number | null;
  isStockProduction?: number | null;
  lotNo?: string | null;
  substitutionCount?: number | null; // 원재료 치환 쪽지 수
};

// 화면 한 줄. 확정 전이면 id 가 없다(locked = 확정된 줄. 2026-10-26 부터 잠그지 않고 바로 고친다)
export type ScheduleRow = {
  key: number;
  id?: number;
  locked: boolean;
  clientName: string;
  productName: string;
  orderQty: string;
  note: string;
  scheduleDate: string; // 생산예정일(확정된 줄은 서버 값, 가져온 줄은 수주의 생산예정일)
  logisticsDate: string | null;
  sourceOrderId?: number;
  isStockProduction: boolean;
  substitutionCount: number;
  actualQty?: string; // 실생산량(적혔으면 지우지 못한다, 2026-10-26)
};

// 가져오기 창의 수주 한 줄
export type PendingOrder = {
  id: number;
  orderDate?: string | null;
  productionDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  note?: string | null;
  logisticsDate?: string | null;
  isStockProduction?: number | null;
};

// 투입지시서(머리 + 원재료 줄)
export type BatchSheet = {
  header: {
    id: number;
    clientName?: string | null;
    productName?: string | null;
    productCode?: string | null;
    orderQty?: string | null;
    note?: string | null;
    scheduleDate?: string | null;
    lotNo?: string | null;
    substitutionCount?: number | null;
  };
  rows: { materialName?: string | null; originName?: string | null; qty?: number | null; substituted?: boolean; reason?: string | null }[];
};

export type ScheduleSaveBody = {
  scheduleDate: string;
  clientName: string;
  productName: string;
  orderQty: string;
  note: string;
  logisticsDate: string | null;
  sourceOrderId: number | null;
  isStockProduction: number;
};

export function fromSaved(record: SavedSchedule, key: number): ScheduleRow {
  return {
    key,
    id: record.id,
    locked: true,
    clientName: record.clientName ?? '',
    productName: record.productName ?? '',
    orderQty: record.orderQty ?? '',
    note: record.note ?? '',
    scheduleDate: record.scheduleDate ?? '',
    logisticsDate: record.logisticsDate ?? null,
    sourceOrderId: record.sourceOrderId ?? undefined,
    isStockProduction: Boolean(record.isStockProduction),
    substitutionCount: record.substitutionCount ?? 0,
    actualQty: record.actualQty ?? '',
  };
}

// ===== 2026-10-26 제목줄 [저장] · [삭제] =====
// 저장할 칸만 모은 글자(처음 불러온 값과 비교해 고친 확정 줄을 찾는다). 조회 날짜와 상관없게 날짜 칸은 줄 값만 본다
export const scheduleSnapshot = (row: ScheduleRow): string => JSON.stringify(saveBodyOf(row, row.scheduleDate));

// [저장]이 보낼 고친 확정 줄(화면 차례대로). 새 줄은 줄의 [확정]으로만 등록한다
export const changedSchedules = (rows: ScheduleRow[], originals: Map<number, string>): ScheduleRow[] =>
  rows.filter((row) => row.id && originals.get(row.id) !== scheduleSnapshot(row));

// 지울 수 있는 줄: 확정 전 줄, 실생산량이 안 적힌 확정 줄(출하확정된 건은 서버가 막는다)
export const canDeleteSchedule = (row: ScheduleRow): boolean => !String(row.actualQty ?? '').trim();

// 송연 pullOneOrder: 담기만 한다('확정' 을 눌러야 실제로 등록된다)
export function rowFromOrder(order: PendingOrder, key: number): ScheduleRow {
  return {
    key,
    locked: false,
    clientName: order.clientName ?? '',
    productName: order.productName ?? '',
    orderQty: order.orderQty ?? '',
    note: order.note ?? '',
    scheduleDate: order.productionDate ?? '',
    logisticsDate: order.logisticsDate ?? null,
    sourceOrderId: order.id,
    isStockProduction: Boolean(order.isStockProduction),
    substitutionCount: 0,
  };
}

// 송연 pc-save 본문(생산일자가 비었으면 조회 날짜)
export function saveBodyOf(row: ScheduleRow, date: string): ScheduleSaveBody {
  return {
    scheduleDate: row.scheduleDate || date,
    clientName: row.clientName.trim(),
    productName: row.productName.trim(),
    orderQty: row.orderQty.trim(),
    note: row.note.trim(),
    logisticsDate: row.logisticsDate,
    sourceOrderId: row.sourceOrderId ?? null,
    isStockProduction: row.isStockProduction ? 1 : 0,
  };
}

// 합계는 화면에 보이는 줄로 센다(아직 확정 안 한 줄도 포함 — 송연 updatePcSummaryFromDOM)
export const scheduleSummary = (rows: { orderQty: string }[]) => ({
  count: rows.length,
  total: rows.reduce((sum, row) => sum + parseQtyNumber(row.orderQty), 0),
});

// 가져오기 기본 기간: 대상 날짜 3일 전 ~ 7일 뒤
export function importRange(date: string): { start: string; end: string } {
  if (!date) return { start: '', end: '' };
  const base = new Date(`${date}T00:00:00`);
  const shift = (days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return { start: shift(-3), end: shift(7) };
}

// 송연 엑셀: 그 날짜 확정건(서버에서 다시 받는다)
export const SCHEDULE_EXCEL_COLUMNS: ExcelColumn<SavedSchedule>[] = [
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'orderQty', label: '생산지시량', width: 12 },
  { key: 'actualQty', label: '실생산량', width: 12 },
  { key: 'note', label: '비고', width: 20 },
  { key: 'logisticsDate', label: '물류출고일', width: 12 },
];

export const NO_BOM_MESSAGE = '이 품목은 제품BOM에 배합이 없어서 투입지시서를 만들 수 없어요.\n공통관리 > 기초정보 > 제품BOM에서 배합을 먼저 등록해주세요.';

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 송연 printPcBatchSheet: 현장 투입지시서. '오늘 이 로트에 몇 kg 씩 넣어라' 는 지시라 배합비(%)는 넣지 않는다.
export function buildBatchSheetHtml(sheet: BatchSheet, today: Date): string {
  const { header, rows } = sheet;
  const total = rows.reduce((sum, row) => sum + (row.qty || 0), 0);
  const printed = `${today.getFullYear()}. ${String(today.getMonth() + 1).padStart(2, '0')}. ${String(today.getDate()).padStart(2, '0')}`;
  const body = rows.map((row, index) => `<tr${row.substituted ? ' class="sub"' : ''}>
      <td class="center">${index + 1}</td>
      <td>${escapeHtml(row.materialName)}${row.substituted
        ? `<div class="subnote">원래: ${escapeHtml(row.originName)} → 바꿔 씀${row.reason ? ` · ${escapeHtml(row.reason)}` : ''}</div>` : ''}</td>
      <td class="right strong">${escapeHtml(formatQty(row.qty ?? 0))}</td>
      <td></td>
    </tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>투입지시서 - ${escapeHtml(header.productName)}</title>
<style>
  html, body { margin: 0; padding: 0; background: #e8e8e8; }
  .sheet-page { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 15mm 14mm; box-sizing: border-box;
    background: #fff; box-shadow: 0 0 8px rgba(0,0,0,.2); font-family: 'Malgun Gothic','Apple SD Gothic Neo',sans-serif; color: #111; }
  .sheet-page h1 { margin: 0 0 10px; font-size: 19px; letter-spacing: 2px; text-align: center; }
  .sheet-header { width: 100%; margin-bottom: 10px; border-collapse: collapse; }
  .sheet-header th, .sheet-header td { padding: 7px 9px; border: 1px solid #000; font-size: 12.5px; }
  .sheet-header th { width: 14%; background: #f2f2f2; text-align: left; }
  .sheet-items { width: 100%; border-collapse: collapse; }
  .sheet-items th, .sheet-items td { height: 24px; padding: 6px 8px; border: 1px solid #000; font-size: 12.5px; }
  .sheet-items th { background: #f2f2f2; font-weight: 700; }
  .sheet-items th.col-no { width: 8%; }
  .sheet-items th.col-qty { width: 20%; }
  .sheet-items tr.sub td { background: #FFF6E0; }
  .sheet-items .subnote { margin-top: 2px; color: #8A5A00; font-size: 10.5px; }
  .sheet-items tfoot td { background: #fafafa; font-weight: 700; }
  .center { text-align: center; } .right { text-align: right; } .strong { font-weight: 700; }
  .sheet-subnote { margin-top: 8px; color: #8A5A00; font-size: 12px; }
  .sheet-sign { width: 100%; margin-top: 14px; border-collapse: collapse; }
  .sheet-sign td { height: 52px; padding: 5px 8px; border: 1px solid #000; font-size: 12px; vertical-align: top; }
  .sheet-printed { margin-top: 8px; color: #666; font-size: 11px; }
  .sheet-print { margin-top: 20px; padding: 8px 20px; font-size: 13px; }
  @page { size: A4; margin: 0; }
  @media print { .no-print { display: none; } html, body { background: #fff; } .sheet-page { margin: 0; box-shadow: none; } }
</style></head><body>
<div class="sheet-page">
  <h1>생 산 투 입 지 시 서</h1>
  <table class="sheet-header"><tbody>
    <tr><th>품목명</th><td colspan="3">${escapeHtml(header.productName)}</td><th>로트번호</th><td>${escapeHtml(header.lotNo || '-')}</td></tr>
    <tr><th>거래처</th><td>${escapeHtml(header.clientName || '-')}</td><th>생산일자</th><td>${escapeHtml(header.scheduleDate || '-')}</td>
      <th>생산지시량</th><td class="strong">${escapeHtml(header.orderQty || '-')}</td></tr>
    <tr><th>특이사항</th><td colspan="5">${escapeHtml(header.note || '-')}</td></tr>
  </tbody></table>
  <table class="sheet-items">
    <thead><tr><th class="col-no">번호</th><th>원재료명</th><th class="col-qty">투입량(kg)</th><th class="col-qty">실투입</th></tr></thead>
    <tbody>${body}</tbody>
    <tfoot><tr><td colspan="2" class="right">합계</td><td class="right">${escapeHtml(formatQty(total))}</td><td></td></tr></tfoot>
  </table>
  ${header.substitutionCount ? '<div class="sheet-subnote">※ 색이 칠해진 줄은 이번 생산건만 다른 원재료로 바꿔 쓰는 것입니다. 제품BOM은 바뀌지 않았습니다.</div>' : ''}
  <table class="sheet-sign"><tbody><tr><td>계량자</td><td>확인자</td><td>생산책임자</td></tr></tbody></table>
  <div class="sheet-printed">출력일 ${printed}</div>
  <button type="button" class="sheet-print no-print" onclick="window.print()">인쇄하기</button>
</div>
</body></html>`;
}

import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { ProdActualRecord, ProdActualRow } from '../types/prodActual.types';

// 생산관리 > 생산실적 > 생산입고 화면 규칙(송연 PD0002)

export const toActualRow = (record: ProdActualRecord): ProdActualRow => ({
  ...record,
  input: record.actualQty ?? '',
  saved: (record.actualQty ?? '').trim(),
});

const inputText = (row: ProdActualRow) => String(row.input ?? '').trim();

// 2026-10-30 제목줄 [저장]이 보낼 줄: 칸 값이 저장된 값과 다른 줄.
// 새로 적은 줄은 입고, 저장된 값을 바꾼 줄은 수정. 저장된 값을 비운 줄은 [저장]으로 보내지 않는다(입고취소는 제목줄 [입고취소])
export function actualChanges(rows: ProdActualRow[]) {
  const changed = rows.filter((row) => inputText(row) !== row.saved);
  return {
    receives: changed.filter((row) => !row.saved && inputText(row)),
    updates: changed.filter((row) => row.saved && inputText(row)),
    cleared: changed.filter((row) => row.saved && !inputText(row)),
  };
}

// [저장] 전 확인 문구(재고가 움직인다)
export function actualSaveMessage(receives: number, updates: number): string {
  const parts = [receives ? `입고 ${receives}건` : '', updates ? `수정 ${updates}건` : ''].filter(Boolean).join(' · ');
  return `${parts}을 저장할까요? 제품 재고가 그만큼 바뀌어요.`;
}

// [입고취소] 전 확인 문구(송연과 같음. 여러 줄이면 건수로)
export const cancelMessage = (rows: ProdActualRow[]) => (rows.length === 1
  ? `실생산량 ${rows[0].saved} 을 지우고 재고도 그만큼 되돌릴까요?`
  : `입고 ${rows.length}건의 실생산량을 지우고 재고도 그만큼 되돌릴까요?`);

export const actualSendValue = inputText;

// 송연 엑셀 칸
export const ACTUAL_EXCEL_COLUMNS: ExcelColumn<ProdActualRecord>[] = [
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'orderQty', label: '생산지시량계획', width: 14 },
  { key: 'actualQty', label: '실생산량', width: 12 },
];

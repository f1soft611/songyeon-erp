import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 생산관리 > 생산입고 (송연 PD0002). 실생산량은 '980kg' 처럼 단위가 붙은 글자다.
export type ActualRecord = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  productCode?: string | null;
  orderQty?: string | null;
  actualQty?: string | null;
  lotNo?: string | null;
};

// 화면 한 줄: input 은 칸에 치고 있는 값, saved 는 서버에 들어간 값(있으면 잠근다)
export type ActualRow = ActualRecord & { input: string; saved: string; editing: boolean };

export const toActualRow = (record: ActualRecord): ActualRow => ({
  ...record,
  input: record.actualQty ?? '',
  saved: (record.actualQty ?? '').trim(),
  editing: false,
});

// 저장된 줄(실생산량이 적힌 줄)은 잠긴다. '수정' 을 누른 줄만 다시 칠 수 있다.
export const isLocked = (row: ActualRow) => Boolean(row.saved) && !row.editing;

export const undoMessage = (row: ActualRow) => `실생산량 ${row.saved} 을 지우고 재고도 그만큼 되돌릴까요?`;

// 송연 엑셀 칸
export const ACTUAL_EXCEL_COLUMNS: ExcelColumn<ActualRecord>[] = [
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'orderQty', label: '생산지시량계획', width: 14 },
  { key: 'actualQty', label: '실생산량', width: 12 },
];

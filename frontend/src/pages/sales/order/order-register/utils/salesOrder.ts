import type { ExcelColumn } from '../../../../../shared/utils/excelFile';

// 영업관리 > 수주등록 화면 한 줄. key 는 화면에서만 쓰는 줄 구분값(저장 전 줄은 id 가 없다).
export type OrderRow = {
  key: number;
  id?: number;
  clientName: string;
  productName: string;
  orderQty: string | number; // 2026-10-23 숫자 칸: 표에서 고치면 숫자가 들어온다(불러온 값은 글자)
  note: string;
  productionDate: string;
  isStockProduction: boolean;
  logisticsDate: string;
  importedProduction?: boolean; // 생산확정에서 가져간 줄
  importedShipment?: boolean; // 출하등록에서 가져간 줄
};

// 서버 SalesOrderVO 한 줄
export type SavedOrder = {
  id: number;
  orderDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  note?: string | null;
  productionDate?: string | null;
  isStockProduction?: number | null;
  logisticsDate?: string | null;
  importedProduction?: number | null;
  importedShipment?: number | null;
};

// 저장 본문(서버 SalesOrderVO)
export type OrderSaveBody = {
  orderDate: string;
  clientName: string;
  productName: string;
  orderQty: string;
  note: string;
  productionDate: string | null;
  isStockProduction: number;
  logisticsDate: string | null;
};

// 송연 parseQtyNumber: '1,000kg' 처럼 글자가 섞여도 첫 숫자를 읽는다. 숫자가 없으면 0.
export function parseQtyNumber(value: string): number {
  const match = String(value || '').replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) || 0 : 0;
}

// 수량 글자(숫자 칸이라 숫자로 올 수 있다)
export const qtyText = (value: string | number | null | undefined): string => (value == null ? '' : String(value).trim());

// 표 아래 합계: 수주품목수량(줄 수)·총수주량(수량 합)
export function summaryOf(rows: OrderRow[]): { count: number; total: number } {
  return { count: rows.length, total: rows.reduce((sum, row) => sum + parseQtyNumber(qtyText(row.orderQty)), 0) };
}

export function formatTotal(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function emptyOrderRow(key: number): OrderRow {
  return {
    key,
    clientName: '',
    productName: '',
    orderQty: '',
    note: '',
    productionDate: '',
    isStockProduction: false,
    logisticsDate: '',
  };
}

// 저장된 줄(2026-10-23 부터 잠그지 않는다. 고치고 제목줄 [저장]으로 보낸다)
export function fromSaved(saved: SavedOrder, key: number): OrderRow {
  return {
    key,
    id: saved.id,
    clientName: saved.clientName ?? '',
    productName: saved.productName ?? '',
    orderQty: saved.orderQty ?? '',
    note: saved.note ?? '',
    productionDate: saved.productionDate ?? '',
    isStockProduction: Boolean(saved.isStockProduction),
    logisticsDate: saved.logisticsDate ?? '',
    importedProduction: Boolean(saved.importedProduction),
    importedShipment: Boolean(saved.importedShipment),
  };
}

// 송연 p-save 본문: 재고생산이면 물류출고일은 보내지 않는다
export function saveBodyOf(row: OrderRow, orderDate: string): OrderSaveBody {
  return {
    orderDate,
    clientName: row.clientName.trim(),
    productName: row.productName.trim(),
    orderQty: qtyText(row.orderQty),
    note: row.note.trim(),
    productionDate: row.productionDate || null,
    isStockProduction: row.isStockProduction ? 1 : 0,
    logisticsDate: row.isStockProduction ? null : row.logisticsDate || null,
  };
}

// 저장할 칸만 모은 글자(처음 불러온 값과 비교해 고친 줄을 찾는다)
export function orderSnapshot(row: OrderRow): string {
  return JSON.stringify(saveBodyOf(row, ''));
}

// 아무것도 안 적은 새 줄(제목줄 [저장]이 건너뛴다)
export function isBlankOrderRow(row: OrderRow): boolean {
  return !row.id && !row.clientName.trim() && !row.productName.trim() && !qtyText(row.orderQty) && !row.note.trim()
    && !row.productionDate && !row.logisticsDate && !row.isStockProduction;
}

// 제목줄 [저장]이 보낼 줄(2026-10-23): 새 줄(빈 줄 빼고) + 처음 값과 달라진 저장된 줄. 가져간 줄은 빼고 화면 차례대로
export function pendingOrderRows(rows: OrderRow[], originals: Map<number, string>): OrderRow[] {
  return rows.filter((row) => {
    if (importedLabel(row)) return false;
    if (!row.id) return !isBlankOrderRow(row);
    return originals.get(row.id) !== orderSnapshot(row);
  });
}

// 생산확정·출하등록에서 가져간 줄은 표시만 남기고 고치지 못한다
export function importedLabel(row: OrderRow): string {
  if (row.importedProduction && row.importedShipment) return '생산+출하 가져감';
  if (row.importedProduction) return '생산확정에서 가져감';
  if (row.importedShipment) return '출하등록에서 가져감';
  return '';
}

// 2026-10-23 줄 잠금([수정] 단추)을 없앴다. 가져간 줄만 고치지 못한다
export function canEditOrder(row: OrderRow): boolean {
  return !importedLabel(row);
}

// 송연 attachUnknownClientGuard: 수주 거래처 목록에 없으면 막는다(목록을 못 받았으면 서버 확인에 맡긴다)
export function isUnknownClient(typed: string, clients: string[]): boolean {
  const name = typed.trim();
  return Boolean(name) && clients.length > 0 && !clients.includes(name);
}

// 서버가 거절하면 고칠 칸으로 보낸다(물류출고일 문구면 물류출고일, 아니면 거래처)
export function focusFieldOf(message: string): 'logisticsDate' | 'clientName' {
  return message.includes('물류출고일') ? 'logisticsDate' : 'clientName';
}

// 송연 prod-excel-btn 칸
export const ORDER_EXCEL_COLUMNS: ExcelColumn<SavedOrder>[] = [
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'orderQty', label: '수량', width: 10 },
  { key: 'note', label: '비고', width: 20 },
  { key: 'productionDate', label: '생산예정일', width: 12 },
  { key: (row) => (row.isStockProduction ? '재고생산' : ''), label: '재고생산', width: 10 },
  { key: 'logisticsDate', label: '물류출고일', width: 12 },
];

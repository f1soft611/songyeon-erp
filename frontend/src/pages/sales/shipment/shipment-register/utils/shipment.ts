import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import { formatQty } from '../../../../../shared/utils/numberFormat';
import { parseQtyNumber } from '../../../order/order-register/utils/salesOrder';

// 영업관리 > 출하등록 (송연 SA0005)

// 서버 출하 한 줄. source = manual(출하등록에서 넣은 줄) | production(물류출고일이 있는 생산확정 줄)
export type ShipmentRecord = {
  id: number;
  source: 'manual' | 'production';
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null; // 실출하량이 있으면 실출하량, 없으면 예정량
  note?: string | null;
  lotId?: number | null;
  lotNo?: string | null;
  lotDate?: string | null;
  shipConfirmed?: number | null;
  lotAllocations?: LotAllocation[];
};

// 로트 칸 글자와 모양. tone: teal = 고른 로트, muted = 미선택·예정
export type LotLabel = { text: string; tone: 'teal' | 'muted'; bold: boolean };

// 화면 한 줄. key 는 화면에서만 쓰는 줄 구분값, record 가 없으면 아직 저장 전인 새 줄
export type ShipmentRow = {
  key: number;
  record: ShipmentRecord | null;
  clientName: string;
  productName: string;
  scheduleDate: string;
  orderQty: string | number; // 출하량(숫자 칸: 표에서 고치면 숫자가 들어온다)
  note: string;
  lotId: number | null;
  sourceOrderId: number | null;
  lotLabel: LotLabel;
};

export type LotAllocation = { lotId: number; qty: number | string; lotNo?: string | null; lotDate?: string | null };

// 로트 선택의 로트 한 건. status = produced(생산입고 끝) | planned(생산확정만 됨)
export type ProductLot = {
  lotId: number;
  lotDate: string;
  lotNo: string;
  status: 'produced' | 'planned';
  producedQty: number;
  shippedQty: number;
  remainingQty: number;
  clientName: string;
  orderQty: string;
};

// 수주 한 줄(로트 선택의 생산예정 수주, 수주등록 가져오기 목록)
export type PendingOrder = {
  id: number;
  orderDate?: string | null;
  productionDate?: string | null;
  logisticsDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  note?: string | null;
};

// 로트 선택에서 고른 것
export type LotPick = {
  lotId: number | null;
  lotDate: string | null;
  lotNo?: string;
  remainingQty: number;
  clientName: string | null;
  orderQty: string | null;
  beforeStockIn?: boolean;
  fromSalesOrder?: boolean;
  sourceOrderId?: number;
};

// 저장된 줄을 로트 여러 개로 나눠 적을 때
export type AllocationMode = { shipmentId: number; targetQty: number; existing: LotAllocation[] };

export type ShipmentSaveBody = {
  scheduleDate: string;
  clientName: string;
  productName: string;
  orderQty: string;
  note: string;
  lotId: number | null;
  sourceOrderId: number | null;
};

// 송연 lotText: 로트번호, 없으면 생산일
export const lotText = (lotNo?: string | null, lotDate?: string | null): string => lotNo || lotDate || '';

// 송연 shipLotText: 나뉘어 있으면 로트마다 수량까지 적는다
export function shipLotText(record: ShipmentRecord): string {
  const allocations = record.lotAllocations || [];
  if (allocations.length > 1) {
    return allocations.map((a) => `${lotText(a.lotNo, a.lotDate)} ${formatQty(parseQtyNumber(String(a.qty)))}`).join(' · ');
  }
  if (allocations.length === 1) return lotText(allocations[0].lotNo, allocations[0].lotDate);
  return lotText(record.lotNo, record.lotDate);
}

export function initialLotLabel(record: ShipmentRecord | null): LotLabel {
  const text = record ? shipLotText(record) : '';
  return text ? { text: `로트 ${text}`, tone: 'teal', bold: true } : { text: '미선택', tone: 'muted', bold: false };
}

// 송연 onPick: 고른 것에 따라 로트 칸 글자를 바꾼다
export function pickedLotLabel(lot: LotPick): LotLabel {
  if (lot.fromSalesOrder) return { text: `수주등록 기준 (${lot.lotDate ?? ''}) — 생산확정되면 자동연결됨`, tone: 'muted', bold: false };
  if (lot.beforeStockIn) {
    return { text: `로트 ${lotText(lot.lotNo, lot.lotDate)} (생산입고 전 · 계획잔량 ${formatQty(lot.remainingQty)})`, tone: 'muted', bold: true };
  }
  return { text: `로트 ${lotText(lot.lotNo, lot.lotDate)} (잔량 ${formatQty(lot.remainingQty)})`, tone: 'teal', bold: true };
}

export function toShipmentRow(key: number, record: ShipmentRecord | null, date: string): ShipmentRow {
  return {
    key,
    record,
    clientName: record?.clientName || '',
    productName: record?.productName || '',
    scheduleDate: record?.scheduleDate || date,
    orderQty: record?.orderQty || '',
    note: record?.note || '',
    lotId: record?.lotId ?? null,
    sourceOrderId: null,
    lotLabel: initialLotLabel(record),
  };
}

// 수주등록 가져오기로 담는 새 줄: 출고일은 그 수주의 물류출고일(없으면 조회 날짜)
export function rowFromOrder(key: number, order: PendingOrder, date: string): ShipmentRow {
  return {
    ...toShipmentRow(key, null, date),
    clientName: order.clientName || '',
    productName: order.productName || '',
    orderQty: order.orderQty || '',
    note: order.note || '',
    scheduleDate: order.logisticsDate || date,
    sourceOrderId: order.id,
  };
}

// 로트 선택에서 고른 것: 저장 전 줄이면 비어 있는 거래처·출하량만 채운다
export function applyLotPick(row: ShipmentRow, pick: LotPick): ShipmentRow {
  const next: ShipmentRow = {
    ...row,
    lotId: pick.fromSalesOrder ? null : pick.lotId,
    lotLabel: pickedLotLabel(pick),
  };
  if (pick.fromSalesOrder && pick.sourceOrderId !== undefined) next.sourceOrderId = pick.sourceOrderId;
  if (!row.record) {
    if (!row.clientName.trim()) next.clientName = pick.clientName || '';
    if (!qtyText(row.orderQty)) next.orderQty = pick.orderQty || '';
  }
  return next;
}

export function saveBodyOf(row: ShipmentRow): ShipmentSaveBody {
  return {
    scheduleDate: row.scheduleDate,
    clientName: row.clientName.trim(),
    productName: row.productName.trim(),
    orderQty: qtyText(row.orderQty),
    note: row.note.trim(),
    lotId: row.lotId,
    sourceOrderId: row.sourceOrderId,
  };
}

// 출하량 글자(숫자 칸이라 숫자로 올 수 있다). 2026-10-23 예전에는 .trim() 을 바로 불러 숫자면 저장이 깨졌다
export const qtyText = (value: string | number | null | undefined): string => (value == null ? '' : String(value).trim());

export const isConfirmed = (row: ShipmentRow): boolean => Boolean(row.record?.shipConfirmed);
export const isProductionRow = (row: ShipmentRow): boolean => row.record?.source === 'production';

// ===== 2026-10-23 제목줄 [저장] · [삭제] =====
// 상태 칸(보기만): 출하확정된 줄 · 생산연동 줄(예전 줄 끝 단추 칸의 '— 수정불가' 표시)
export function shipmentStatus(row: ShipmentRow): string {
  if (isConfirmed(row)) return '출하확정됨';
  if (isProductionRow(row)) return '생산연동';
  return '';
}

// 지울 수 있는 줄: 저장 전 새 줄, 출하확정 전의 직접 넣은 출하. 생산연동 줄(생산확정에서 오는 줄)은 지우지 않는다
export const canDeleteShipment = (row: ShipmentRow): boolean => !isConfirmed(row) && !isProductionRow(row);

// 아무것도 안 적은 새 줄(출고일은 조회 날짜가 들어가 있어서 보지 않는다). [저장]이 건너뛴다
export function isBlankShipmentRow(row: ShipmentRow): boolean {
  return !row.record && !row.clientName.trim() && !row.productName.trim() && !qtyText(row.orderQty) && !row.note.trim()
    && row.lotId == null && row.sourceOrderId == null;
}

// 저장된 줄 구분값(직접 넣은 출하와 생산연동 줄은 id 가 겹칠 수 있다)
export const recordKey = (row: ShipmentRow): string => (row.record ? `${row.record.source}:${row.record.id}` : '');

// [저장]이 보낼 줄: 새 줄(빈 줄 빼고)은 등록, 저장된 줄은 출하량이 처음과 달라진 것만(출하확정 줄 빼고). 화면 차례대로
export function pendingShipments(rows: ShipmentRow[], originalQty: Map<string, string>): { creates: ShipmentRow[]; updates: ShipmentRow[] } {
  const creates = rows.filter((row) => !row.record && !isBlankShipmentRow(row));
  const updates = rows.filter((row) => row.record && !isConfirmed(row) && originalQty.get(recordKey(row)) !== qtyText(row.orderQty));
  return { creates, updates };
}

// 이 출하줄이 이미 그 로트에서 가져다 쓰고 있는 양. 다시 배분할 때는 잔량에 도로 더한다.
export function mineByLot(existing: LotAllocation[]): Record<number, number> {
  const mine: Record<number, number> = {};
  existing.forEach((e) => {
    mine[e.lotId] = (mine[e.lotId] || 0) + parseQtyNumber(String(e.qty));
  });
  return mine;
}

export type PlannedItem = {
  id: string;
  kind: '생산확정' | '수주등록';
  date: string | null;
  label: string;
  planned: number;
  shipped: number;
  remaining: number;
  pick: LotPick;
};

// 생산예정 품목: ① 생산확정됐지만 생산입고 전인 로트 ② 아직 생산확정 전인 수주등록 건. 날짜순.
export function plannedItems(lots: ProductLot[], orders: PendingOrder[], mine: Record<number, number>): PlannedItem[] {
  const avail = (lot: ProductLot) => lot.remainingQty + (mine[lot.lotId] || 0);
  const fromLots: PlannedItem[] = lots
    .filter((lot) => lot.status === 'planned' && avail(lot) > 0)
    .map((lot) => ({
      id: `lot-${lot.lotId}`,
      kind: '생산확정',
      date: lot.lotDate,
      label: lotText(lot.lotNo, lot.lotDate),
      planned: lot.producedQty,
      shipped: lot.shippedQty,
      remaining: avail(lot),
      pick: {
        lotId: lot.lotId, lotDate: lot.lotDate, lotNo: lot.lotNo, remainingQty: lot.remainingQty,
        beforeStockIn: true, clientName: lot.clientName, orderQty: lot.orderQty,
      },
    }));
  const fromOrders: PlannedItem[] = orders.map((order) => {
    const qty = parseQtyNumber(order.orderQty || '');
    const date = order.productionDate || order.orderDate || null;
    return {
      id: `order-${order.id}`,
      kind: '수주등록',
      date,
      label: `${date || ''} 예정`,
      planned: qty,
      shipped: 0,
      remaining: qty,
      pick: {
        lotId: null, lotDate: date, remainingQty: qty, fromSalesOrder: true, sourceOrderId: order.id,
        clientName: order.clientName ?? null, orderQty: order.orderQty ?? null,
      },
    };
  });
  return fromLots.concat(fromOrders).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

// 송연 setupAllocBar: 합계와 실출하량 비교, 잔량을 넘긴 로트 확인
export function allocationStatus(values: { want: number; avail: number }[], targetQty: number) {
  const sum = values.reduce((total, value) => total + value.want, 0);
  const over = values.filter((value) => value.want > value.avail + 0.001).map((value) => formatQty(value.want - value.avail));
  const diff = sum - targetQty;
  if (Math.abs(diff) >= 0.001) {
    return { sum, tone: 'danger' as const, message: diff > 0 ? `${formatQty(diff)} 많습니다` : `${formatQty(-diff)} 모자랍니다` };
  }
  if (over.length) return { sum, tone: 'warn' as const, message: `합계는 맞지만 잔량보다 많이 잡은 로트가 있어요 (${over.join(', ')} 초과)` };
  return { sum, tone: 'ok' as const, message: '맞습니다' };
}

// 수주등록 가져오기 기본 기간: 출하일 3일 전 ~ 7일 뒤
export function importRange(date: string): { start: string; end: string } {
  const base = new Date(`${date}T00:00:00`);
  const shift = (days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return { start: shift(-3), end: shift(7) };
}

// 송연 ship-excel-btn 칸
export const SHIPMENT_EXCEL_COLUMNS: ExcelColumn<ShipmentRecord>[] = [
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'productName', label: '품목명', width: 30 },
  { key: 'scheduleDate', label: '출고일', width: 12 },
  { key: 'orderQty', label: '출하량', width: 10 },
  { key: 'note', label: '비고', width: 20 },
];

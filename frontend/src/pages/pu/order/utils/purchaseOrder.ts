import type { ExcelColumn } from '../../../../shared/utils/excelFile';

// 구매관리 > 발주관리 (송연 app.py /api/materials/purchase-order · 19-purchase.js · 38-po-status.js)
// 발주에는 단가를 받지 않는다 — 표에 금액이 적혀 있으면 사람은 그것을 확정 금액으로 읽는다.
export type PurchaseOrder = {
  id: number;
  materialCode?: string | null;
  materialName?: string | null;
  qty?: number | null;
  orderDate?: string | null;
  clientName?: string | null;
  received?: boolean; // 입고가 연결됐는가(입고된 발주는 취소할 수 없다)
};

// 송연 fmt
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

// ===== 발주내역(발주등록 탭): 거래처로 묶어 접어두고, 눌렀을 때만 품목을 편다 =====
// 한 거래처에 여러 품목을 한꺼번에 넣는 일이 많아서, 줄줄이 늘어놓으면 같은 거래처 이름이 열 번씩 되풀이된다.
// 접힌 줄에서도 '몇 종 · 몇 건 미입고' 는 보여야 굳이 펴보지 않고도 어디를 챙길지 안다.
export type HistoryRow = {
  id: string;
  parentId: string | null;
  kind: 'group' | 'item';
  label: string; // 묶음: 거래처 / 품목: 원재료명 (코드)
  info: string; // 묶음: 'N종' / 품목: 입고 상태
  pending: number; // 묶음: 미입고 건수
  received: boolean;
  qty: number;
  poId: number | null;
};

// 서버가 주는 차례(최근 발주일·최근 등록)를 그대로 따른다. 여기서 다시 정렬하면 조회 결과와 순서가 어긋난다.
// 거래처가 없으면 '-' 로 묶는다.
export function historyRows(orders: PurchaseOrder[]): HistoryRow[] {
  const groups: { name: string; rows: PurchaseOrder[] }[] = [];
  const byName = new Map<string, { name: string; rows: PurchaseOrder[] }>();
  orders.forEach((order) => {
    const name = order.clientName || '-';
    let group = byName.get(name);
    if (!group) {
      group = { name, rows: [] };
      byName.set(name, group);
      groups.push(group);
    }
    group.rows.push(order);
  });
  return groups.flatMap((group) => {
    const groupId = `g:${group.name}`;
    const pending = group.rows.filter((row) => !row.received).length;
    const head: HistoryRow = {
      id: groupId,
      parentId: null,
      kind: 'group',
      label: group.name,
      info: `${group.rows.length}종`,
      pending,
      received: pending === 0,
      qty: group.rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
      poId: null,
    };
    const items: HistoryRow[] = group.rows.map((row) => ({
      id: `po:${row.id}`,
      parentId: groupId,
      kind: 'item',
      label: `${row.materialName || ''} (${row.materialCode || ''})`,
      info: row.received ? '입고완료' : '미입고',
      pending: row.received ? 0 : 1,
      received: Boolean(row.received),
      qty: Number(row.qty || 0),
      poId: row.id,
    }));
    return [head, ...items];
  });
}

// 송연 발주내역 엑셀
export const HISTORY_EXCEL_COLUMNS: ExcelColumn<PurchaseOrder>[] = [
  { key: 'clientName', label: '거래처', width: 20 },
  { key: 'materialName', label: '원재료명', width: 28 },
  { key: 'materialCode', label: '원재료코드', width: 12 },
  { key: 'qty', label: '수량', width: 10 },
  { key: (row) => (row.received ? '입고완료' : '미입고'), label: '상태', width: 10 },
];

// ===== 발주 등록 창 =====
// 품목을 '목록에 추가' 하는 순간의 거래처를 그 품목에 저장한다.
// 거래처를 바꿔 다른 품목을 계속 추가하면 여러 거래처를 한번에 등록할 수 있다.
export type StagingItem = { key: number; materialCode: string; materialName: string; qty: number; clientName: string; checked: boolean };
export type MaterialOptionLite = { code: string; name: string };

// 추가할 수 없으면 안내 문구, 되면 null(송연 po-add-item-btn 과 같은 순서·문구)
// 2026-10-26 거래처도 목록(거래처마스터의 매입 거래처)에 있는 것만. 서버도 같은 기준으로 막는다
export function stagingError(clientName: string, materialName: string, qty: string, materials: MaterialOptionLite[], vendors: string[]) {
  if (!clientName.trim()) return '거래처를 먼저 입력해주세요';
  if (!vendors.includes(clientName.trim())) return '등록된 매입 거래처와 일치하지 않아요';
  if (!materialName.trim() || !qty) return '품목과 수량을 입력해주세요';
  if (!materials.some((material) => material.name === materialName.trim())) return '등록된 원재료명과 일치하지 않아요';
  return null;
}

export const toBulkBody = (orderDate: string, items: StagingItem[]) => ({
  orderDate,
  items: items.map((item) => ({ materialCode: item.materialCode, clientName: item.clientName, qty: String(item.qty) })),
});

// ===== 발주현황 탭: 기간 안에 낸 발주를 한 줄씩 =====
// 금액칸이 없는 대신 들어왔는지를 보여준다. 발주해놓고 안 들어온 것을 찾는 것이 이 표의 주 쓰임이다.
export type StatusFilter = '' | '0' | '1';
export type StatusQuery = { start: string; end: string; clientQ: string; materialQ: string; received: StatusFilter };
export type StatusRow = PurchaseOrder & { clientCount: number };

// 아무것도 고르지 않았을 때의 차례: 최근 날짜가 위, 같은 날 안에서는 거래처끼리 붙여둔다, 그 안에서 품목 이름 순
export function sortStatus(rows: PurchaseOrder[]): PurchaseOrder[] {
  return [...rows].sort((a, b) =>
    (b.orderDate || '').localeCompare(a.orderDate || '')
    || (a.clientName || '').localeCompare(b.clientName || '')
    || (a.materialName || '').localeCompare(b.materialName || ''));
}

// 거래처 칸에 같은 날 같은 거래처의 건수를 붙이려고 센다(송연 '대한상사 3건')
export function toStatusRows(rows: PurchaseOrder[]): StatusRow[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = `${row.orderDate}|${row.clientName}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return sortStatus(rows).map((row) => ({ ...row, clientCount: counts.get(`${row.orderDate}|${row.clientName}`) ?? 1 }));
}

export function statusCounts(rows: PurchaseOrder[]) {
  const done = rows.filter((row) => row.received).length;
  return {
    count: rows.length,
    clients: new Set(rows.map((row) => row.clientName).filter(Boolean)).size,
    pending: rows.length - done,
    done,
  };
}

// 송연 발주현황 엑셀(화면 차례 그대로)
export const STATUS_EXCEL_COLUMNS: ExcelColumn<PurchaseOrder>[] = [
  { key: 'orderDate', label: '발주일자', width: 12 },
  { key: 'clientName', label: '거래처', width: 20 },
  { key: 'materialName', label: '발주품목', width: 28 },
  { key: 'materialCode', label: '품목코드', width: 12 },
  { key: 'qty', label: '수량', width: 10 },
  { key: (row) => (row.received ? '입고완료' : '미입고'), label: '입고여부', width: 10 },
];

// 이번 달 1일(송연 posSetDefaultDates)
export const monthStart = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

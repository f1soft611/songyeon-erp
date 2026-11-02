import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { HistoryRow, MaterialOptionLite, PurchaseOrder, StagingItem } from '../types/purchaseOrder.types';

// 구매관리 > 발주관리 > 발주등록 화면 규칙(송연 app.py /api/materials/purchase-order · 19-purchase.js)

// 송연 fmt
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

// ===== 발주내역: 거래처로 묶어 접어두고, 눌렀을 때만 품목을 편다 =====
// 한 거래처에 여러 품목을 한꺼번에 넣는 일이 많아서, 줄줄이 늘어놓으면 같은 거래처 이름이 열 번씩 되풀이된다.
// 접힌 줄에서도 '몇 종 · 몇 건 미입고' 는 보여야 굳이 펴보지 않고도 어디를 챙길지 안다.

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

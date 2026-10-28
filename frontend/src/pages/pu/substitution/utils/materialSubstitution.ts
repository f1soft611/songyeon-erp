// 구매관리 > 재료 치환등록 (송연 app.py /api/material-substitution · 39-material-substitute.js)
// 그날 생산할 건의 원재료를 이번 한 번만 다른 것으로 바꿔 쓴다. 제품BOM 은 바뀌지 않는다.
export type SubstitutionSchedule = {
  id: number;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null;
  orderQtyNumber?: number | null;
  lotNo?: string | null;
  productCode?: string | null;
  note?: string | null;
  substitutionCount?: number | null;
};

export type SubstitutionLine = {
  materialCode: string;
  materialName?: string | null;
  originCode: string;
  originName?: string | null;
  ratioPercent?: number | null;
  qty?: number | null;
  substituted: boolean;
  subId?: number | null;
  reason?: string | null;
};

export type SubstitutionDetail = { header: SubstitutionSchedule; rows: SubstitutionLine[] };
export type SubstitutionMaterial = { code: string; name: string; stockQty?: number | null };

// 송연 fmt
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

// 거래처가 없으면 재고생산이다
export const clientOrStock = (clientName?: string | null) => clientName || '재고생산';

// 목록 위 요약(송연 msub-summary)
export function summaryText(rows: SubstitutionSchedule[]) {
  if (rows.length === 0) return '';
  const subCount = rows.reduce((sum, row) => sum + (row.substitutionCount || 0), 0);
  return `생산 ${rows.length}건` + (subCount ? `  ·  바꿔 쓰는 원재료 ${subCount}건` : '');
}

// 상세 창 머리 아래 한 줄
export const detailSubText = (header: SubstitutionSchedule) =>
  `${clientOrStock(header.clientName)}  ·  생산지시량 ${header.orderQty || '-'}  ·  로트 ${header.lotNo || '-'}`;

// 이름이 겹치는 원재료가 실제로 있다(같은 이름에 코드가 둘) — 고를 때는 코드를 붙여 보여준다
export const materialLabel = (material: SubstitutionMaterial) => `${material.name} (${material.code})`;

// 대신 쓸 원재료 후보: 자기 자신은 뺀다
export const candidatesFor = (materials: SubstitutionMaterial[], fromCode: string) =>
  materials.filter((material) => material.code !== fromCode);

// 바꾸고 나면 뒤에 깔린 목록의 '원재료치환' 칸도 같이 고친다(다시 조회하지 않아도 숫자가 맞게)
export const applyCount = (rows: SubstitutionSchedule[], header: SubstitutionSchedule) =>
  rows.map((row) => (row.id === header.id ? { ...row, substitutionCount: header.substitutionCount ?? 0 } : row));

export const UNDO_MESSAGE = '이 치환을 되돌릴까요?\n원래 배합표의 원재료로 다시 계산됩니다.';
export const PICK_MESSAGE = '대신 쓸 원재료를 목록에서 골라주세요';

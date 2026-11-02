// 영업관리 > 생산가능확인 (송연 SA0006) 값 모양. 2026-10-29 utils/prodCheck.ts 에서 옮겼다

// 만들 것 한 줄(수량은 적는 칸의 값 그대로)
export type ProdCheckLine = { product: string; qty: number | string | null };

// 원재료 한 줄. per 는 합계 표에서만 제품마다의 필요량(lines 순서)
export type ProdCheckRow = {
  code: string;
  name: string | null;
  spec: string | null;
  known: boolean;
  needQty: number;
  stockQty: number;
  afterQty: number;
  shortage: number;
  per?: number[] | null;
};

export type ProdCheckByProduct = { product: string; qty: number; rows: ProdCheckRow[]; shortageCount: number; ok: boolean };

export type ProdCheckResult = {
  date: string;
  lines: { product: string; qtyKg: number }[];
  rows: ProdCheckRow[];
  byProduct: ProdCheckByProduct[];
  unknownProducts: string[];
  shortageCount: number;
  ok: boolean;
};

// 표에 보이는 한 줄(제품마다 필요량은 per0, per1 … 칸으로 펼친다 — 머리글로 정렬할 수 있게)
export type ProdCheckGridRow = ProdCheckRow & { id: string; [perKey: `per${number}`]: number };

export type Verdict = { tone: 'warning' | 'success' | 'error'; text: string };

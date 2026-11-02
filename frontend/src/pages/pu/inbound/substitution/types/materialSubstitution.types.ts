// 구매관리 > 재료 치환등록 값(송연 app.py /api/material-substitution · 39-material-substitute.js)
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
  rowAction?: never; // 표의 [상세보기] 단추 칸 자리(값 없음)
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

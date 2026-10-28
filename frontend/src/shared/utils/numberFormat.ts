// 수량 · 금액 · 비율 보여 주기(송연 format.ts). 2026-10-27 co/basic-info/utils/productBom 에서 옮김 — 여러 업무 화면이 같이 쓴다

// 송연 fmt: 수량·금액을 소수 둘째 자리까지, 정수는 그대로. 값이 없으면 빈칸(S_ERP 표준, 2026-10-28)
export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

// 송연 fmtPrice: 금액·단가는 소수 넷째 자리까지
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return (Math.round(value * 10000) / 10000).toLocaleString('ko-KR', {
    maximumFractionDigits: 4,
  });
}

// 저장된 비율(0~1) → '12.50%'. 소수 셋째 자리가 있으면 '12.345%'
export const percentText = (ratio: number | null | undefined): string => {
  if (ratio == null) return '';
  const percent = Number((ratio * 100).toFixed(3));
  return `${percent.toFixed(Number(percent.toFixed(2)) === percent ? 2 : 3)}%`;
};

// 저장된 비율(0~1) → 편집 칸 퍼센트(소수 셋째 자리)
export const ratioToPercent = (ratio: number | null | undefined): number | null =>
  ratio == null ? null : Number((ratio * 100).toFixed(3));

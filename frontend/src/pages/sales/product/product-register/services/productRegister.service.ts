import { apiDelete, apiPost } from '../../../../../shared/services/apiClient';
import type { ProductRegisterBody } from '../types/productRegister.types';

// 제품(제품코드 발번) → 배합비 → 단가표를 한 번에 넣는다. 발번한 제품코드와 원재료비를 돌려준다.
export async function registerProduct(body: ProductRegisterBody): Promise<{ productCode: string; materialCost: number }> {
  const result = await apiPost<{ productCode?: unknown; materialCost?: unknown }>('/api/v1/sales/product/product-register', body);
  return {
    productCode: result?.productCode == null ? '' : String(result.productCode),
    materialCost: Number(result?.materialCost ?? 0) || 0,
  };
}

// 방금 등록한 제품 지우기(2026-10-28, 제품등록 [삭제]): 제품 · 배합비 · 단가표. 재고 · 수주 · 생산 등에 쓰인 제품이면 서버가 막는다
export async function deleteProduct(productCode: string): Promise<void> {
  await apiDelete(`/api/v1/sales/product/product-register/${encodeURIComponent(productCode)}`);
}

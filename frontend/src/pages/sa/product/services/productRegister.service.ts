import { apiPost } from '../../../../shared/services/apiClient';
import type { ProductRegisterBody } from '../types/productRegister.types';

// 제품(제품코드 발번) → 배합비 → 단가표를 한 번에 넣는다. 발번한 제품코드와 원재료비를 돌려준다.
export async function registerProduct(body: ProductRegisterBody): Promise<{ productCode: string; materialCost: number }> {
  const result = await apiPost<{ productCode?: unknown; materialCost?: unknown }>('/api/v1/sa/products', body);
  return {
    productCode: result?.productCode == null ? '' : String(result.productCode),
    materialCost: Number(result?.materialCost ?? 0) || 0,
  };
}

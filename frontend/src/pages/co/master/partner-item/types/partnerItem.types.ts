import type { ProductBomRow } from '../../item-master/types/itemMaster.types';

// 거래처별 제품조회 그리드 줄: 제품BOM 줄 그대로. detailAction · historyAction: 표의 [상세] · [이력] 단추 칸 자리(값 없음, 2026-10-27)
export type PartnerItemRow = ProductBomRow & { detailAction?: never; historyAction?: never };

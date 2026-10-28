export type WarehouseManagementRow = {
  id: string;
  warehouseName: string;
  use: boolean;
};

export type WarehouseSavePayload = {
  warehouseNm: string;
  useAt: 'Y' | 'N';
};

export interface SystemWarehouseVO {
  warehouseId?: unknown;
  tenantId?: unknown;
  warehouseNm?: unknown;
  useAt?: unknown;
  createdBy?: unknown;
  createdAt?: unknown;
  updatedBy?: unknown;
  updatedAt?: unknown;
}

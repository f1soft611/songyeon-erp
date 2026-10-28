import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '../../../../../shared/services/apiClient';
import type {
  WarehouseManagementRow,
  WarehouseSavePayload,
  SystemWarehouseVO,
} from '../types/warehouseManagement.types';

const toRow = (warehouse: SystemWarehouseVO): WarehouseManagementRow => ({
  id: String(warehouse.warehouseId ?? ''),
  warehouseName: String(warehouse.warehouseNm ?? ''),
  use: String(warehouse.useAt ?? 'Y') !== 'N',
});

export async function fetchWarehouseRows(): Promise<WarehouseManagementRow[]> {
  const result = await apiGet<{ resultList: SystemWarehouseVO[] }>(
    '/api/v1/system/warehouses',
  );
  return (result.resultList ?? []).map(toRow);
}

export async function createWarehouse(
  payload: WarehouseSavePayload,
): Promise<void> {
  await apiPost('/api/v1/system/warehouses', payload);
}

export async function updateWarehouse(
  warehouseId: string,
  payload: WarehouseSavePayload,
): Promise<void> {
  await apiPut(`/api/v1/system/warehouses/${warehouseId}`, payload);
}

export async function deleteWarehouse(warehouseId: string): Promise<void> {
  await apiDelete(`/api/v1/system/warehouses/${warehouseId}`);
}

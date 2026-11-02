import { useEffect, useState } from 'react';
import { fetchWarehouseRows } from '../../../../co/master/warehouse/services/warehouse.service';
import type { StockAdjustTabKey } from '../types/stockAdjust.types';

// 재고조정 화면의 탭 · 창 여닫기 상태. 탭 안 내용은 탭별 hook 이 맡는다
export function useStockAdjustManagement() {
  const [tab, setTab] = useState<StockAdjustTabKey>('material');
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [materialAllOpen, setMaterialAllOpen] = useState(false);
  const [productAllOpen, setProductAllOpen] = useState(false);
  const [materialRefresh, setMaterialRefresh] = useState(0);

  // 고를 수 있는 창고는 기초정보 > 창고등록에서 가져온다(창고를 방금 등록했을 수도 있어 올리기 창을 열 때마다 다시)
  const loadWarehouses = () => fetchWarehouseRows().then((rows) => setWarehouses(rows.map((w) => w.name).filter(Boolean))).catch(() => undefined);
  useEffect(() => {
    void loadWarehouses();
  }, []);

  const openUpload = () => {
    void loadWarehouses();
    setUploadOpen(true);
  };

  const afterUploaded = () => setMaterialRefresh((v) => v + 1);

  return {
    tab,
    setTab,
    warehouses,
    uploadOpen,
    setUploadOpen,
    openUpload,
    afterUploaded,
    materialAllOpen,
    setMaterialAllOpen,
    productAllOpen,
    setProductAllOpen,
    materialRefresh,
  };
}

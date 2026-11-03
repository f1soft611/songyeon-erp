import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridRef } from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { todayDash } from '../../../../../shared/utils/excelFile';
import { fetchMaterialOptions } from '../../../../co/master/item-master/services/itemMaster.service';
import { materialPickerOptions } from '../../../../co/master/item-master/utils/productBom';
import { vendorPickerOptions } from '../../../../co/master/material-master/hooks/useMaterialMasterManagement';
import { fetchVendors } from '../../../../co/master/material-master/services/materialMaster.service';
import type { VendorOption } from '../../../../co/master/material-master/types/materialMaster.types';
import { registerOrders } from '../services/orderRegister.service';
import type { OrderStagingRow } from '../types/orderRegister.types';
import { errorText, stagingError } from '../utils/orderRegister';

type Message = { text: string; ok: boolean } | null;

// 발주 등록 창 상태 (송연 19-purchase.js po-open-btn~po-confirm-btn). 열 때마다 비우고 후보를 다시 받는다
export function useOrderRegisterDialog(open: boolean, onRegistered: (orderDate: string) => void) {
  const gridRef = useRef<F1GridRef<OrderStagingRow>>(null);
  const keyRef = useRef(0);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [materials, setMaterials] = useState<Awaited<ReturnType<typeof fetchMaterialOptions>>>([]);
  const [client, setClient] = useState<MasterPickerOption | null>(null);
  const [material, setMaterial] = useState<MasterPickerOption | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [qty, setQty] = useState('');
  const [items, setItems] = useState<OrderStagingRow[]>([]);
  const [orderDate, setOrderDate] = useState(() => todayDash());
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setClient(null);
    setMaterial(null);
    setQty('');
    setOrderDate(todayDash());
    setMessage(null);
    // 매입 거래처(분류에 '매입')와 원재료. 2026-11-02 칸에 직접 치지 않고 팝업에서 고른다
    fetchVendors().then(setVendors).catch(() => undefined);
    fetchMaterialOptions().then(setMaterials).catch(() => undefined);
  }, [open]);

  const searchClients = useCallback(async (keyword: string) => vendorPickerOptions(vendors, keyword), [vendors]);
  const searchMaterials = useCallback(async (keyword: string) => materialPickerOptions(materials, keyword), [materials]);
  const allChecked = items.length > 0 && items.every((item) => item.checked);

  const addItem = () => {
    const clientName = client?.name ?? '';
    const error = stagingError(clientName, material?.name ?? '', qty, materials, vendors.map((vendor) => vendor.name));
    if (error) {
      setMessage({ text: error, ok: false });
      return;
    }
    if (!material) return;
    setMessage(null);
    keyRef.current += 1;
    setItems((current) => [...current, {
      key: keyRef.current,
      materialCode: material.code,
      materialName: material.name,
      qty: parseFloat(qty),
      clientName,
      checked: true,
    }]);
    setMaterial(null);
    setQty('');
  };

  const checkItem = useCallback((key: number, checked: boolean) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, checked } : item)));
  }, []);

  const checkAll = (checked: boolean) => setItems((current) => current.map((item) => ({ ...item, checked })));

  const removeItem = useCallback((key: number) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const confirm = async () => {
    const chosen = items.filter((item) => item.checked);
    if (!orderDate) {
      setMessage({ text: '발주일을 선택해주세요', ok: false });
      return;
    }
    if (chosen.length === 0) {
      setMessage({ text: '선택된 품목이 없어요', ok: false });
      return;
    }
    setSaving(true);
    try {
      const registered = await registerOrders(orderDate, chosen);
      setMessage({ text: `${registered}건 등록되었습니다`, ok: true });
      setItems((current) => current.filter((item) => !item.checked));
      onRegistered(orderDate);
    } catch (requestError) {
      setMessage({ text: errorText(requestError, '등록 실패'), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const blockDelete = () => setMessage({ text: '품목은 줄의 X 단추로 빼주세요', ok: false });

  return {
    gridRef,
    client,
    setClient,
    material,
    setMaterial,
    clientPickerOpen,
    setClientPickerOpen,
    materialPickerOpen,
    setMaterialPickerOpen,
    searchClients,
    searchMaterials,
    qty,
    setQty,
    items,
    allChecked,
    orderDate,
    setOrderDate,
    message,
    saving,
    addItem,
    checkItem,
    checkAll,
    removeItem,
    confirm,
    blockDelete,
  };
}

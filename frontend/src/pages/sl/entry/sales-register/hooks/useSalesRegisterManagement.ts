import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { fetchOrderClientOptions, fetchOrderProducts } from '../../../../sales/order/order-register/services/salesOrder.service';
import type { OrderClientOption, OrderProduct } from '../../../../sales/order/order-register/types/salesOrder.types';
import { filterOrderRows } from '../../../../sales/order/order-register/utils/salesOrder';
import { createManualSale, fetchShippable, pullSales } from '../services/salesRegister.service';
import { pullItems, pullMessage, toShippableRow, type SalesRegisterQuery, type ShippableRow } from '../utils/salesRegister';

const errorText = (error: unknown, fallback: string) =>
  (error instanceof Error && error.message ? error.message : fallback);

// 판매등록 조회 · 판매 넣기 · 직접 등록 저장
export function useSalesRegisterManagement(initialQuery: SalesRegisterQuery) {
  const requestIdRef = useRef(0);
  const queryRef = useRef(initialQuery);
  const [rows, setRows] = useState<ShippableRow[]>([]);
  const [clients, setClients] = useState<OrderClientOption[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [alertText, setAlertText] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadRows = useCallback(async (query: SalesRegisterQuery = queryRef.current) => {
    queryRef.current = query;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await fetchShippable(query.start, query.end, query.client);
      if (requestId !== requestIdRef.current) return;
      setRows(filterOrderRows(data.rows.map(toShippableRow), { clientName: '', product: query.product }));
      setHasChanges(false);
      setGridKey((current) => current + 1);
      setLoaded(true);
    } catch (requestError) {
      if (requestId === requestIdRef.current) setAlertText(errorText(requestError, '불러오지 못했어요'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
    fetchOrderClientOptions().then(setClients).catch(() => undefined);
    fetchOrderProducts().then(setProducts).catch(() => undefined);
  }, [loadRows]);

  const pull = async (selected: ShippableRow[]) => {
    const items = pullItems(selected);
    if (items.length === 0) {
      setAlertText('가져올 항목을 체크해주세요');
      return;
    }
    if (hasChanges) {
      setAlertText('저장하지 않은 직접 등록이 있어요. 먼저 [저장]해 주세요.');
      return;
    }
    try {
      const result = await pullSales(items);
      setNotice(pullMessage(result));
    } catch (requestError) {
      setAlertText(errorText(requestError, '등록하지 못했어요'));
      return;
    }
    await loadRows();
  };

  // 새 줄을 하나씩 넣는다. 중간에 실패하면 이미 들어간 줄이 다시 저장되지 않게 목록을 새로 받는다
  const saveManual = async (changes: F1GridChanges<ShippableRow>) => {
    setError('');
    setSaving(true);
    let saved = 0;
    try {
      for (const row of changes.insertedRows) {
        try {
          await createManualSale(row);
          saved += 1;
        } catch (requestError) {
          const reason = `${row.clientName} ${row.productName}: ${errorText(requestError, '등록하지 못했어요')}`;
          if (saved === 0) {
            setError(reason);
            return;
          }
          await loadRows();
          setError(`${saved}건은 넣었고 다음 줄에서 멈췄어요. 나머지는 다시 적어 주세요. ${reason}`);
          return;
        }
      }
      setNotice(`${saved}건을 판매로 넣었어요`);
      await loadRows();
    } finally {
      setSaving(false);
    }
  };

  const handleChangesChange = useCallback((changes: F1GridChanges<ShippableRow>) => {
    setHasChanges(changes.insertedRows.length > 0 || changes.updatedRows.length > 0);
  }, []);

  return {
    rows, clients, products, loaded, loading, saving, hasChanges, gridKey,
    alertText, setAlertText, notice, setNotice, error, setError,
    loadRows, pull, saveManual, handleChangesChange,
  };
}

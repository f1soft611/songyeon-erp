import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNotification } from '../../../../shared/context/NotificationContext';
import { useCommonCodeOptions } from '../../../../shared/components/common-code/useCommonCodeOptions';
import { formatPrice } from '../../../../shared/utils/numberFormat';
import type { BomEditRow, ClientOption, MaterialCheck, MaterialOption } from '../../../co/master/item-master/types/itemMaster.types';
import { checkMaterialNames, fetchClientOptions, fetchMaterialOptions } from '../../../co/master/item-master/services/itemMaster.service';
import { fetchBoxTypeRows } from '../../../co/master/box-type/services/boxType.service';
import { cancelQuoteHandoff, finishQuoteHandoff, useQuoteHandoff } from '../../quote/quoteHandoff';
import { bomRowsFromQuote } from '../../quote/utils/quote';
import { emptyBomEditRows, newBomRowId, type BomEditGridHandle } from '../components/BomEditGrid';
import { registerProduct } from '../services/productRegister.service';
import type { ProductRegisterBody, ProductRegisterForm } from '../types/productRegister.types';
import { buildRegisterBody, EMPTY_PRODUCT_FORM, STORAGE_METHOD_GROUP, storageCodeOf } from '../utils/productRegister';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 제품등록 화면의 입력 · 등록 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할).
// 고를 목록(원재료 · 거래처 · 포장유형 · 보관방법)을 받고, 견적에서 넘어온 내용을 채우고, [등록]을 보낸다
export function useProductRegisterManagement(bomGridRef: RefObject<BomEditGridHandle | null>) {
  const { showSuccess } = useNotification();
  const savingRef = useRef(false);
  const [form, setForm] = useState<ProductRegisterForm>(EMPTY_PRODUCT_FORM);
  const storageOptions = useCommonCodeOptions(STORAGE_METHOD_GROUP); // 보관방법 공통코드(2026-10-23)
  const [bomSource, setBomSource] = useState<{ rows: BomEditRow[]; key: number }>(() => ({ rows: emptyBomEditRows(), key: 0 }));
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]); // 거래처 고르기(코드 · 이름, 2026-10-23)
  const [packagingTypes, setPackagingTypes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ body: ProductRegisterBody; unmatched: MaterialCheck[] } | null>(null);
  const materialsRef = useRef<MaterialOption[]>([]);
  materialsRef.current = materials;

  // 송연 confirmQuote: 견적에서 '확정' 을 누르면 그 가견적 내용이 이 화면으로 넘어온다(견적마다 한 번만 채운다)
  const quote = useQuoteHandoff();
  const filledQuoteRef = useRef<number | null>(null);
  useEffect(() => {
    if (!quote) {
      filledQuoteRef.current = null;
      return;
    }
    if (filledQuoteRef.current === quote.quoteId || !materialsLoaded || (quote.storage && storageOptions.length === 0)) return;
    filledQuoteRef.current = quote.quoteId;
    // 견적의 보관방법은 이름 글자라 코드로 바꿔 채운다(2026-10-23)
    setForm({ name: quote.productName, spec: quote.spec, productType: quote.productType, storage: storageCodeOf(storageOptions, quote.storage), clientCode: quote.clientCode });
    const rows = bomRowsFromQuote(quote.bom, materialsRef.current, newBomRowId);
    setBomSource((current) => ({ rows: rows.length ? rows : emptyBomEditRows(), key: current.key + 1 }));
    setError('');
  }, [quote, materialsLoaded, storageOptions]);

  // 송연 loadMaterialList·loadClients: 화면을 열 때 한 번 받는다. 못 받으면 자동완성·단가 채우기 없이 쓴다
  // (거래처는 저장할 때 서버가 다시 검사한다).
  useEffect(() => {
    fetchMaterialOptions()
      .then(setMaterials)
      .catch(() => undefined)
      .finally(() => setMaterialsLoaded(true)); // 견적에서 넘어온 배합비는 원재료 단가를 받은 뒤 채운다
    fetchClientOptions().then(setClients).catch(() => undefined);
    fetchBoxTypeRows().then((rows) => setPackagingTypes(rows.map((row) => row.boxTypeNm))).catch(() => undefined);
  }, []);

  const setFormValues = useCallback((patch: Partial<ProductRegisterForm>) => setForm((current) => ({ ...current, ...patch })), []);

  const resetForm = useCallback(() => {
    setForm(EMPTY_PRODUCT_FORM);
    setBomSource((current) => ({ rows: emptyBomEditRows(), key: current.key + 1 }));
  }, []);

  // 제목줄 [초기화]: 입력칸 · 배합비를 비우고, 견적에서 넘어온 것도 버린다
  const clearAll = useCallback(() => {
    setError('');
    resetForm();
    cancelQuoteHandoff();
  }, [resetForm]);

  // 레시피 엑셀을 불러오면 그 줄로 배합비를 다시 시작한다
  const loadBomRows = useCallback((rows: BomEditRow[], message: string) => {
    setError('');
    setBomSource((current) => ({ rows, key: current.key + 1 }));
    showSuccess(message);
  }, [showSuccess]);

  // 송연 doRegister: 등록 뒤에는 입력칸과 배합비(빈 줄 3개)를 비운다. 견적 확정이면 다른 문구.
  const register = async (body: ProductRegisterBody) => {
    try {
      const saved = await registerProduct(body);
      resetForm();
      if (body.quoteId != null) {
        finishQuoteHandoff();
        showSuccess(`등록되었습니다 (제품코드 ${saved.productCode}, 견적 확정 완료 — 인건비 등 원가항목도 단가관리에 자동 반영됨)`);
        return;
      }
      showSuccess(
        `등록되었습니다 (제품코드 ${saved.productCode}, 원재료비 ${formatPrice(saved.materialCost)}원 자동 계산됨) — 단가관리에서 인건비 등을 이어서 등록하세요`,
      );
    } catch (requestError) {
      setError(errorText(requestError, '등록에 실패했어요'));
    }
  };

  // 송연 p-save: 제품명 확인 → 배합비가 있으면 원재료명 확인 → 모두 정확하면 바로 등록, 아니면 확인 창
  const save = async () => {
    if (savingRef.current) return;
    setError('');
    const body: ProductRegisterBody = {
      ...buildRegisterBody(form, bomGridRef.current?.getRows() ?? bomSource.rows),
      ...(quote ? { quoteId: quote.quoteId, quoteCosts: quote.costs } : {}),
    };
    if (!body.productName) {
      setError('제품명은 필수예요');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      if (body.bom.length > 0) {
        const unmatched = (await checkMaterialNames(body.bom.map((line) => line.materialName))).filter((check) => !check.exact);
        if (unmatched.length > 0) {
          setPending({ body, unmatched });
          return;
        }
      }
      await register(body);
    } catch (requestError) {
      setError(errorText(requestError, '등록에 실패했어요'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // 송연 match-confirm: 배합비의 이름을 확정한 이름으로 바꿔 등록(코드는 서버가 이름으로 다시 찾는다)
  const confirmMatch = async (resolved: Record<string, string>) => {
    if (!pending) return;
    const body: ProductRegisterBody = {
      ...pending.body,
      bom: pending.body.bom.map((line) => {
        const fixed = resolved[line.materialName];
        if (!fixed) return line;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { materialCode, ...rest } = line;
        return { ...rest, materialName: fixed };
      }),
    };
    setPending(null);
    savingRef.current = true;
    setSaving(true);
    try {
      await register(body);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return {
    form,
    setFormValues,
    storageOptions,
    packagingTypes,
    clients,
    materials,
    bomSource,
    quote,
    error,
    setError,
    saving,
    pending,
    setPending,
    clearAll,
    loadBomRows,
    save,
    confirmMatch,
  };
}

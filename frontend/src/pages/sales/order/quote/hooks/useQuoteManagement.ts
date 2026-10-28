import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import type { BomEditRow, ClientOption, MaterialOption } from '../../../../co/master/item-master/types/itemMaster.types';
import type { BoxTypeRow } from '../../../../co/master/box-type/types/boxType.types';
import { fetchClientOptions, fetchMaterialOptions } from '../../../../co/master/item-master/services/itemMaster.service';
import { fetchBoxTypeRows } from '../../../../co/master/box-type/services/boxType.service';
import { emptyBomEditRows, newBomRowId } from '../../../product/product-register/components/BomEditGrid';
import { createQuote, deleteQuote, fetchQuote, fetchQuotes, updateQuote } from '../services/quote.service';
import type { QuoteFormMode } from '../components/QuoteFormDialog';
import { startQuoteHandoff, useQuoteConfirmed } from '../quoteHandoff';
import {
  bomRowsFromQuote,
  EMPTY_QUOTE_FORM,
  quoteFormFrom,
  type QuoteForm,
  type QuoteRow,
  type toQuoteSaveBody,
} from '../utils/quote';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export type QuoteFormState = { mode: QuoteFormMode; form: QuoteForm; rows: BomEditRow[]; clientName?: string; storageNm?: string };
type QuoteSaveBody = ReturnType<typeof toQuoteSaveBody>;

// [저장]에서 지울 가견적. 확정된 견적이 섞여 있으면 그 이름들(지우지 않고 알린다)
export function quoteDeletePlan(deletedRows: QuoteRow[]): { ids: number[]; confirmedNames: string[] } {
  const confirmed = deletedRows.filter((row) => row.status === 'confirmed');
  return {
    ids: deletedRows.filter((row) => row.status !== 'confirmed').map((row) => row.quoteId),
    confirmedNames: confirmed.map((row) => row.productName || `견적 ${row.quoteId}`),
  };
}

// 견적 화면의 조회 · 저장 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할)
// 가견적 작성 · 수정 · 확정은 [상세] 칸 → 견적 창, 삭제는 오른쪽 클릭 [행 삭제] · 제목줄 [삭제] 뒤 [저장](S_ERP 메뉴관리와 같음)
export function useQuoteManagement() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [packagingTypes, setPackagingTypes] = useState<BoxTypeRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]); // 거래처 고르기(코드 · 이름, 2026-10-23)
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [formState, setFormState] = useState<QuoteFormState | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // 송연 loadQuotes: 화면을 열 때, 저장 · 삭제 뒤, 제품등록에서 확정을 마친 뒤 다시 받는다
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setQuotes(await fetchQuotes());
      setDeletedCount(0);
      setGridKey((current) => current + 1);
    } catch (requestError) {
      setError(errorText(requestError, '견적 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);
  const confirmedCount = useQuoteConfirmed();
  useEffect(() => {
    void reload();
  }, [reload, confirmedCount]);
  useEffect(() => {
    fetchBoxTypeRows().then(setPackagingTypes).catch(() => undefined);
    fetchClientOptions().then(setClients).catch(() => undefined);
    fetchMaterialOptions().then(setMaterials).catch(() => undefined);
  }, []);

  const handleChangesChange = useCallback((changes: F1GridChanges<QuoteRow>) => {
    setDeletedCount(changes.deletedRows.length);
  }, []);

  // 송연 openQuoteForm: 수정 · 상세보기는 상세를 받아 채운 뒤 연다(못 받으면 열지 않는다)
  const openForm = useCallback(async (mode: QuoteFormMode) => {
    setError('');
    if (mode.kind === 'new') {
      setFormState({ mode, form: EMPTY_QUOTE_FORM, rows: emptyBomEditRows() });
      return;
    }
    try {
      const detail = await fetchQuote(mode.quoteId);
      setFormState({
        mode,
        form: quoteFormFrom(detail),
        rows: bomRowsFromQuote(detail.bom, materials, newBomRowId),
        clientName: detail.clientName ?? '',
        storageNm: detail.storageNm ?? '',
      });
    } catch (requestError) {
      setError(errorText(requestError, '견적 정보를 불러오지 못했어요'));
    }
  }, [materials]);

  // [상세] 칸: 확정된 견적은 상세보기(읽기 전용), 가견적은 수정 창
  const openDetail = useCallback((row: QuoteRow) => {
    void openForm(row.status === 'confirmed'
      ? { kind: 'view', quoteId: row.quoteId, productCode: row.confirmedProductCode || '' }
      : { kind: 'edit', quoteId: row.quoteId });
  }, [openForm]);

  // 송연 quote-save-btn 뒤: 목록을 다시 받고 창을 닫는다(실패하면 창에 서버 문구)
  const saveForm = async (body: QuoteSaveBody) => {
    if (!formState) return;
    if (formState.mode.kind === 'edit') await updateQuote(formState.mode.quoteId, body);
    else await createQuote(body);
    setFormState(null);
    setNotice('저장되었습니다');
    await reload();
  };

  // 견적 창 [확정]: 지금 내용을 저장하고, 저장한 상세를 받아 제품등록 화면으로 넘긴다(송연 confirmQuote, 거기서 [등록] 해야 확정된다)
  const confirmForm = async (body: QuoteSaveBody) => {
    if (!formState || formState.mode.kind !== 'edit') return;
    const quoteId = formState.mode.quoteId;
    await updateQuote(quoteId, body);
    const detail = await fetchQuote(quoteId);
    const form = quoteFormFrom(detail);
    startQuoteHandoff({
      quoteId,
      productName: form.productName,
      spec: form.spec,
      productType: form.productType,
      storage: form.storage,
      clientCode: form.clientCode,
      clientName: detail.clientName ?? '',
      bom: detail.bom ?? [],
      costs: {
        markupRate: detail.markupRate ?? null, lossRate: detail.lossRate ?? null,
        laborCost: detail.laborCost ?? null, packagingCost: detail.packagingCost ?? null,
        logisticsCost: detail.logisticsCost ?? null, margin: detail.margin ?? null,
        otherCost1: detail.otherCost1 ?? null, otherCost1Note: detail.otherCost1Note ?? null,
        otherCost2: detail.otherCost2 ?? null, otherCost2Note: detail.otherCost2Note ?? null,
        otherCost3: detail.otherCost3 ?? null, otherCost3Note: detail.otherCost3Note ?? null,
        otherCost4: detail.otherCost4 ?? null, otherCost4Note: detail.otherCost4Note ?? null,
        currentPrice: detail.currentPrice ?? null,
      },
    });
    setFormState(null);
    navigate('/sales/product/PMProductRegisterView');
  };

  // 제목줄 [저장]: 삭제 표시한 가견적을 지운다. 확정된 견적이 섞여 있으면 아무것도 지우지 않고 알린다
  const saveDeletes = async (changes: F1GridChanges<QuoteRow>) => {
    const plan = quoteDeletePlan(changes.deletedRows);
    if (plan.confirmedNames.length) {
      setError(`확정된 견적은 삭제할 수 없어요: ${plan.confirmedNames.join(', ')}\n검색칸 돋보기로 목록을 다시 불러온 뒤 가견적만 삭제해주세요.`);
      return;
    }
    if (!plan.ids.length) return;
    setSaving(true);
    setError('');
    let sent = 0;
    try {
      for (const id of plan.ids) {
        await deleteQuote(id);
        sent += 1;
      }
      setNotice('삭제되었습니다');
      await reload();
    } catch (requestError) {
      if (sent) await reload();
      setError(errorText(requestError, '삭제에 실패했어요'));
    } finally {
      setSaving(false);
    }
  };

  return {
    quotes,
    loading,
    saving,
    gridKey,
    deletedCount,
    packagingTypes,
    clients,
    materials,
    formState,
    setFormState,
    error,
    setError,
    notice,
    setNotice,
    reload,
    handleChangesChange,
    openForm,
    openDetail,
    saveForm,
    confirmForm,
    saveDeletes,
  };
}

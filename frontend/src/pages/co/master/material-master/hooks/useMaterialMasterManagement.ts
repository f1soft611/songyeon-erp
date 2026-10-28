import { useCallback, useEffect, useRef, useState } from 'react';
import type { F1GridChanges } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import {
  createMaterial,
  fetchMaterialRows,
  fetchSameMaterials,
  fetchVendors,
  saveMaterialInfo,
  saveMaterialPrice,
  setMaterialUseYn,
} from '../services/materialMaster.service';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import type { MaterialInfoPayload, MaterialMasterRow, MaterialRow, VendorOption } from '../types/materialMaster.types';
import {
  filterMaterialRows,
  filterMaterialUse,
  needsSameMaterialCheck,
  priceSavedText,
  renameNotice,
  sameMaterialMessage,
  type MaterialUseFilter,
  type StaleUnit,
} from '../utils/materialMaster';

const numText = (value: number | string | null | undefined) => (value == null ? '' : String(value).trim());
const sameCodes = (left: string[], right: string[]) => left.length === right.length && left.every((code, index) => code === right[index]);
const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

// 서버 줄 → 그리드 줄. 납품업체는 거래처코드만 고른다(거래처코드가 없는 옛 업체는 suppliers 에만 남는다)
export const toMaterialMasterRows = (rows: MaterialRow[]): MaterialMasterRow[] =>
  rows.map((row) => ({
    ...row,
    supplierCodes: row.suppliers.flatMap((vendor) => (vendor.code ? [vendor.code] : [])),
    priceDate: '',
  }));

// 검색칸: 원재료코드 · 원재료명(부분 일치, 대소문자 무시)
export const matchMaterialKeyword = (row: Pick<MaterialRow, 'code' | 'name'>, keyword: string): boolean => {
  const query = keyword.trim().toLowerCase();
  return !query || row.code.toLowerCase().includes(query) || row.name.toLowerCase().includes(query);
};

// 상세 조회 납품업체(2026-10-28 글자 칸): 납품업체 이름이나 거래처코드에 들어 있으면(대소문자 무시), 비우면 전체. 원재료 · 부자재 같이 씀
export const matchSupplierKeyword = (row: Pick<MaterialMasterRow, 'supplierCodes' | 'suppliers'>, keyword: string): boolean => {
  const query = keyword.trim().toLowerCase();
  return (
    !query ||
    row.supplierCodes.some((code) => code.toLowerCase().includes(query)) ||
    row.suppliers.some((vendor) => vendor.name.toLowerCase().includes(query))
  );
};

// 납품업체 [선택] 팝업 검색: 매입 거래처 목록에서 거래처코드 · 이름으로 찾는다(거래처코드 없는 업체는 뺀다)
export const vendorPickerOptions = (vendors: VendorOption[], keyword: string): MasterPickerOption[] => {
  const query = keyword.trim().toLowerCase();
  return vendors
    .flatMap((vendor) => (vendor.code ? [{ code: vendor.code, name: vendor.name }] : []))
    .filter((vendor) => !query || vendor.code.toLowerCase().includes(query) || vendor.name.toLowerCase().includes(query))
    .map((vendor, index) => ({ id: index + 1, ...vendor }));
};

// 표에 보일 줄: 부자재 빼기 · 안 쓴 기간 · 사용여부 · 검색어(송연 renderMaterialTab 과 같은 규칙)
// supplierKeyword: 상세 조회 납품업체(matchSupplierKeyword)
export function filterMaterialMasterRows(
  rows: MaterialMasterRow[],
  keyword: string,
  useFilter: MaterialUseFilter,
  stale: { value: number; unit: StaleUnit } | null,
  today = new Date(),
  supplierKeyword = '',
): MaterialMasterRow[] {
  return (filterMaterialUse(filterMaterialRows(rows, stale, today), useFilter) as MaterialMasterRow[]).filter(
    (row) => matchMaterialKeyword(row, keyword) && matchSupplierKeyword(row, supplierKeyword),
  );
}

// [저장] 때 한 줄에서 보낼 것. 서버는 보낸 칸만 고치므로 바뀐 칸만 담는다
export type MaterialSavePlan = {
  row: MaterialMasterRow;
  isNew: boolean;
  info: (Partial<MaterialInfoPayload> & { name: string }) | null; // 기본정보(PUT .../info)
  price: { unitPrice: string; effectiveDate: string | null } | null; // 단가(POST .../price). 새 줄은 적용일자가 있을 때만(없으면 등록할 때 같이 보낸다)
  useYn: 'Y' | 'N' | null; // 사용여부(PUT .../use-yn)
  sameCheck: boolean; // 같은 이름 · 규격 확인이 필요한가(새 줄이거나 이름 · 규격을 바꿈)
};

// 기본정보로 보내는 칸(이름 · 납품업체 빼고). 부자재는 분류를 더 보낸다(원재료는 안 보내서 서버가 그 칸을 건드리지 않는다)
type InfoField = 'spec' | 'unit' | 'safetyStock' | 'baseOrderQty' | 'allergens' | 'unitWeight' | 'boxQty' | 'subCategory';
export const MATERIAL_INFO_FIELDS: readonly InfoField[] = ['spec', 'unit', 'safetyStock', 'baseOrderQty', 'allergens', 'unitWeight', 'boxQty'];
export const SUB_MATERIAL_INFO_FIELDS: readonly InfoField[] = [...MATERIAL_INFO_FIELDS, 'subCategory'];

export function materialSavePlansOf(
  originals: MaterialMasterRow[],
  changes: F1GridChanges<MaterialMasterRow>,
  infoFields: readonly InfoField[] = MATERIAL_INFO_FIELDS,
): MaterialSavePlan[] {
  const before = new Map(originals.map((row) => [row.id, row]));
  const inserted = changes.insertedRows.map<MaterialSavePlan>((row) => {
    const info: Partial<MaterialInfoPayload> = {};
    infoFields.filter((field) => field !== 'spec').forEach((field) => {
      const value = numText(row[field]);
      if (value) info[field] = value;
    });
    if (row.supplierCodes.length) info.supplierCodes = row.supplierCodes;
    // 적용일자를 넣었으면 단가는 등록과 따로 그날로 보낸다(서버가 앞날이면 예약, 오늘 · 지난날이면 바로 넣는다)
    const unitPrice = numText(row.unitPrice);
    return {
      row,
      isNew: true,
      info: Object.keys(info).length ? { ...info, name: row.name.trim() } : null,
      price: row.priceDate && unitPrice ? { unitPrice, effectiveDate: row.priceDate } : null,
      useYn: row.useYn === 'N' ? 'N' : null,
      sameCheck: true,
    };
  });
  const updated = changes.updatedRows.flatMap<MaterialSavePlan>((row) => {
    const original = before.get(row.id);
    if (!original) return [];
    const info: Partial<MaterialInfoPayload> = {};
    infoFields.forEach((field) => {
      if (numText(row[field]) !== numText(original[field])) info[field] = numText(row[field]);
    });
    if (!sameCodes(row.supplierCodes, original.supplierCodes)) info.supplierCodes = row.supplierCodes;
    const renamed = row.name.trim() !== original.name;
    const priceChanged = numText(row.unitPrice) !== numText(original.unitPrice) || Boolean(row.priceDate);
    const plan: MaterialSavePlan = {
      row,
      isNew: false,
      info: renamed || Object.keys(info).length ? { ...info, name: row.name.trim() } : null,
      price: priceChanged ? { unitPrice: numText(row.unitPrice), effectiveDate: row.priceDate || null } : null,
      useYn: row.useYn !== original.useYn ? row.useYn : null,
      sameCheck: needsSameMaterialCheck(false, original, { name: row.name.trim(), spec: numText(row.spec) }),
    };
    return plan.info || plan.price || plan.useYn ? [plan] : [];
  });
  return [...inserted, ...updated];
}

// 원재료마스터 화면의 조회 · 저장 상태(S_ERP 품목관리 useMaterialManagement 와 같은 역할).
// 부자재마스터도 같은 표 · 같은 저장 길을 쓴다(목록 주소 · 분류 칸만 다르다, useSubMaterialMasterManagement)
export type MaterialMasterOptions = {
  fetchRows?: () => Promise<MaterialRow[]>;
  infoFields?: readonly InfoField[];
  what?: string; // 문구에 쓸 이름(원재료 · 부자재)
};

export function useMaterialMasterManagement({
  fetchRows = () => fetchMaterialRows(''),
  infoFields = MATERIAL_INFO_FIELDS,
  what = '원재료',
}: MaterialMasterOptions = {}) {
  const fetchRowsRef = useRef(fetchRows);
  fetchRowsRef.current = fetchRows;
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<MaterialMasterRow[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  // 같은 원재료 확인 창(그래도 저장하면 같은 변경을 다시 보낸다) · 저장 뒤 알림 창(이름 변경 · 단가 예약)
  const [sameConfirm, setSameConfirm] = useState<{ message: string; changes: F1GridChanges<MaterialMasterRow> } | null>(null);
  const [notice, setNotice] = useState('');
  const requestIdRef = useRef(0);

  // 원재료 · 부자재가 같이 오고(부자재는 화면이 뺀다), 사용안함도 늘 받아 두고 조회 조건으로 거른다
  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchRowsRef.current();
      if (requestId !== requestIdRef.current) return;
      setRows(toMaterialMasterRows(result));
      setHasChanges(false);
      setGridKey((current) => current + 1);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setError(errorText(loadError, `${what} 목록을 불러오지 못했습니다.`));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [what]);

  useEffect(() => {
    void loadRows();
    fetchVendors().then(setVendors).catch(() => undefined);
  }, [loadRows]);

  const handleChangesChange = useCallback((changes: F1GridChanges<MaterialMasterRow>) => {
    setHasChanges(Boolean(changes.insertedRows.length || changes.updatedRows.length));
  }, []);

  // 제목줄 [저장]: 새 줄은 등록(코드를 받는다) 뒤 나머지 칸, 고친 줄은 바뀐 칸만 보낸다. 다 보내면 목록을 다시 불러온다
  const saveChanges = useCallback(
    async (changes: F1GridChanges<MaterialMasterRow>, allowDuplicate = false) => {
      if (savingRef.current) return;
      const plans = materialSavePlansOf(rows, changes, infoFields);
      if (!plans.length) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      let sent = 0;
      try {
        // 이름 · 규격이 같은 원재료가 있으면 먼저 묻는다(신규이거나 이름 · 규격을 바꾼 줄만)
        if (!allowDuplicate) {
          const same: { code: string; name: string; spec: string }[] = [];
          for (const plan of plans.filter((item) => item.sameCheck)) {
            same.push(...(await fetchSameMaterials(plan.row.name.trim(), numText(plan.row.spec), plan.isNew ? '' : plan.row.code)));
          }
          if (same.length) {
            setSameConfirm({ message: sameMaterialMessage(same), changes });
            return;
          }
        }
        const duplicate = allowDuplicate ? { allowDuplicate: true } : {};
        const alerts: string[] = [];
        const suffixes: string[] = [];
        for (const plan of plans) {
          let code = plan.row.code;
          if (plan.isNew) {
            code = await createMaterial({
              name: plan.row.name.trim(),
              spec: numText(plan.row.spec) || null,
              unitPrice: plan.price ? null : numText(plan.row.unitPrice) || null, // 적용일자가 있으면 아래 단가로 따로
              allowDuplicate,
            });
            sent += 1;
          }
          if (plan.info) {
            const saved = await saveMaterialInfo(code, { ...plan.info, ...duplicate });
            sent += 1;
            const renamed = renameNotice(saved, plan.info.name);
            if (renamed.alert) alerts.push(renamed.alert);
            if (renamed.suffix) suffixes.push(`${plan.info.name}${renamed.suffix}`);
          }
          if (plan.price) {
            const saved = await saveMaterialPrice(code, plan.price);
            sent += 1;
            if (saved.scheduled) alerts.push(`${plan.row.name}: ${priceSavedText(saved)}`);
          }
          if (plan.useYn) {
            await setMaterialUseYn(code, plan.useYn);
            sent += 1;
          }
        }
        await loadRows();
        showSuccess(['저장되었습니다', ...suffixes].join('\n'));
        if (alerts.length) setNotice(alerts.join('\n\n'));
      } catch (saveError) {
        // 앞에서 보낸 것은 이미 반영됐으니 목록을 다시 맞춘다
        if (sent) await loadRows();
        setError(errorText(saveError, '저장하지 못했어요'));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [infoFields, loadRows, rows, showSuccess],
  );

  return {
    rows,
    vendors,
    error,
    setError,
    loading,
    saving,
    hasChanges,
    gridKey,
    sameConfirm,
    setSameConfirm,
    notice,
    setNotice,
    reload: loadRows,
    handleChangesChange,
    saveChanges,
  };
}

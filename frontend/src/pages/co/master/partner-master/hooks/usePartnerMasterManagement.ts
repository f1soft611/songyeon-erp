import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { F1GridChanges, F1GridOption } from '../../../../../shared/components/f1-grid';
import { useNotification } from '../../../../../shared/context/NotificationContext';
import {
  createClientMaster,
  fetchClientMasterRows,
  updateClientMaster,
} from '../services/partnerMaster.service';
import type { ClientMasterFilters, ClientMasterForm, ClientMasterRow } from '../types/partnerMaster.types';
import { useClientTypes } from './useClientTypes';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 저장할 때 보내는 값(S_ERP useCustomerManagement 의 toPayload 와 같은 역할): 화면용 칸(id · 코드 · 분류 이름 · 등록/수정자)은 빼고,
// 사용여부는 Y/N 으로 맞춘다. 거래처명은 앞뒤 빈칸을 지운다
export function toClientPayload(row: ClientMasterRow): ClientMasterForm {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, clientId, clientCode, clientTypeNm, regUserNm, regDt, updUserNm, updDt, ...form } = row;
  return { ...form, name: form.name.trim(), useYn: form.useYn === 'N' ? 'N' : 'Y' };
}

// 송연 save 앞부분: 화면에서 먼저 막는 것(나머지는 서버가 막는다)
export function validateClientPayload(payload: ClientMasterForm): string | null {
  if (!payload.name.trim()) return '거래처명을 입력해주세요';
  if (!payload.clientType) return '분류를 선택해주세요';
  return null;
}

// ===== 엑셀 올리기(2026-10-27): 바로 저장하지 않고 그리드에 올린 뒤 [저장](거래처 추가와 같은 검사)으로 보낸다 =====
// 엑셀 양식 칸. 칸은 첫 줄 제목으로 찾고, 제목 줄이 없으면 이 순서로 읽는다(예전 양식의 상세주소 칸도 읽는다)
const EXCEL_FIELDS: { header: string; field: keyof ClientMasterRow }[] = [
  { header: '거래처명', field: 'name' },
  { header: '분류', field: 'clientType' },
  { header: '사업자등록번호', field: 'businessNo' },
  { header: '대표자명', field: 'ceoName' },
  { header: '업태', field: 'businessType' },
  { header: '종목', field: 'businessItem' },
  { header: '전화', field: 'phone' },
  { header: '팩스', field: 'fax' },
  { header: '모바일', field: 'mobile' },
  { header: 'Email', field: 'email' },
  { header: '우편번호', field: 'zipcode' },
  { header: '주소', field: 'address' },
  { header: '메모', field: 'memo' },
];

export type ClientExcelStage = {
  inserted: Partial<ClientMasterRow>[]; // 새 거래처(그리드에 새 줄)
  updates: { id: string; patch: Partial<ClientMasterRow> }[]; // 이름이 같은 거래처: 엑셀에 값이 있는 칸만 고친다
  notes: string[]; // 알릴 것(분류를 못 찾음 · 같은 이름 두 번 등)
};

// 분류: 코드 · 이름 · 예전 글자(매입 · 매출 · 매입+매출)를 코드로. 빈칸 · '거래처' 는 빼고 견준다(서버 findClientType 과 같은 규칙)
const typeKey = (value: string) => value.replace(/\s+/g, '').replace('거래처', '');
export function clientTypeCodeOf(text: string, options: F1GridOption[]): string {
  const value = text.trim();
  if (!value) return '';
  const byCode = options.find((option) => String(option.value) === value);
  if (byCode) return String(byCode.value);
  const byName = options.find((option) => typeKey(option.label) === typeKey(value));
  return byName ? String(byName.value) : '';
}

// 엑셀 줄 → 그리드에 올릴 것. 필수값 · 자릿수는 여기서 거르지 않는다([저장] 때 그리드가 거래처 추가와 같은 규칙으로 막는다)
// existing: 전체 거래처, shown: 지금 조회 조건으로 표에 보이는 거래처(조회 조건은 바꾸지 않는다 — 표에 없는 거래처는 고칠 수 없어 알린다)
export function stageClientExcel(
  excelRows: string[][],
  existing: ClientMasterRow[],
  typeOptions: F1GridOption[],
  shown: ClientMasterRow[] = existing,
): ClientExcelStage {
  const shownIds = new Set(shown.map((row) => row.id));
  const first = excelRows[0];
  const hasHeader = Boolean(first && (first[0] ?? '').trim() === '거래처명');
  // 제목 줄이 있으면 제목으로만 칸을 찾는다(없는 칸은 비움). 제목 줄이 없을 때만 양식 순서로 읽는다
  const columns = new Map<string, number>(hasHeader ? [] : EXCEL_FIELDS.map((item, index) => [item.header, index]));
  if (hasHeader) first.forEach((header, index) => header.trim() && columns.set(header.trim(), index));
  const cellOf = (row: string[], header: string) => {
    const index = columns.get(header);
    return index === undefined ? '' : (row[index] ?? '').trim();
  };
  const byName = new Map(existing.map((row) => [row.name.trim(), row]));
  const seen = new Set<string>();
  const stage: ClientExcelStage = { inserted: [], updates: [], notes: [] };
  excelRows.forEach((row, index) => {
    const lineno = index + 1;
    if ((hasHeader && index === 0) || row.every((value) => !(value ?? '').trim())) return;
    const values: Partial<ClientMasterRow> = {};
    EXCEL_FIELDS.forEach(({ header, field }) => {
      const value = cellOf(row, header);
      if (value) (values as Record<string, string>)[field] = value;
    });
    const detail = cellOf(row, '상세주소');
    if (detail) values.addressDetail = detail;
    const name = values.name ?? '';
    if (name && seen.has(name)) {
      stage.notes.push(`${lineno}줄 '${name}' - 엑셀 안에 같은 이름이 두 번 있어 뒤엣것은 올리지 않았어요`);
      return;
    }
    if (name) seen.add(name);
    if (values.clientType) {
      const code = clientTypeCodeOf(values.clientType, typeOptions);
      if (!code) stage.notes.push(`${lineno}줄 '${name}' - 분류 '${values.clientType}' 을 찾지 못해 비워 두었어요`);
      values.clientType = code;
    }
    const found = name ? byName.get(name) : undefined;
    if (found && !shownIds.has(found.id)) {
      stage.notes.push(`${lineno}줄 '${name}' - 지금 조회 조건으로 표에 없는 거래처라 올리지 않았어요(조회 조건을 바꿔 표에 보이게 한 뒤 다시 올려 주세요)`);
      return;
    }
    if (found) {
      // 있는 거래처: 엑셀에 값이 있는 칸만(빈 칸은 지우지 않는다)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name: _name, ...patch } = values;
      if (patch.clientType === '') delete patch.clientType;
      if (Object.keys(patch).length) stage.updates.push({ id: found.id, patch });
      return;
    }
    stage.inserted.push({ useYn: 'Y', ...values });
  });
  return stage;
}

export function stageResultText(stage: ClientExcelStage): string {
  return `엑셀에서 새 거래처 ${stage.inserted.length}곳 · 고친 거래처 ${stage.updates.length}곳을 표에 올렸어요. 확인하고 [저장]을 눌러 주세요.`
    + (stage.notes.length ? `\n\n${stage.notes.join('\n')}` : '');
}

// 조회 조건: 검색어는 거래처코드 또는 거래처명(2026-10-27). 대표자 · 업태 · 종목(포함, 대소문자 무시) · 사업자번호(숫자만 견줘 포함) · 분류(같은 코드, 비우면 전체)
// · 사용여부(ALL 이면 전체). 받은 목록을 화면에서 거른다
const includesText = (value: string | undefined, query?: string) => {
  const q = (query ?? '').trim().toLowerCase();
  return !q || (value ?? '').toLowerCase().includes(q);
};
const digitsOf = (value: string) => value.replace(/\D/g, '');

export function filterClientRows(rows: ClientMasterRow[], filters: ClientMasterFilters): ClientMasterRow[] {
  const clientType = filters.clientType ?? '';
  const useFilter = filters.useYn ?? 'ALL';
  const businessNo = digitsOf(filters.businessNo ?? '');
  return rows.filter(
    (row) =>
      (includesText(row.name, filters.keyword) || includesText(row.clientCode, filters.keyword)) &&
      includesText(row.ceoName, filters.ceoName) &&
      includesText(row.businessType, filters.businessType) &&
      includesText(row.businessItem, filters.businessItem) &&
      (!businessNo || digitsOf(row.businessNo).includes(businessNo)) &&
      (!clientType || row.clientType === clientType) &&
      (useFilter === 'ALL' || row.useYn === useFilter),
  );
}

// 거래처마스터 화면의 조회 · 저장 · 엑셀 올리기 상태(S_ERP 거래처관리 useCustomerManagement 와 같은 역할)
export function usePartnerMasterManagement() {
  const { showSuccess } = useNotification();
  const [rows, setRows] = useState<ClientMasterRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  // 엑셀 올리기에서 건너뛴 줄 안내(빈 값이면 창을 닫는다)
  const [skippedAlert, setSkippedAlert] = useState('');
  const requestIdRef = useRef(0);
  // 조회 조건(처음은 사용여부 '사용', 2026-10-23 부터 기본은 사용중). 받은 목록을 화면에서 거른다
  const [appliedFilters, setAppliedFilters] = useState<ClientMasterFilters>({ useYn: 'Y' });
  const visibleRows = useMemo(() => filterClientRows(rows, appliedFilters), [rows, appliedFilters]);
  // 분류 고르기: 공통코드 CUSTOMER_CATEGORY 의 사용 중 항목(2026-10-23)
  const clientTypes = useClientTypes();
  // 줄의 분류가 목록에 없으면(사용안함이 된 코드) 그 이름으로 남긴다
  const clientTypeOptions = useMemo<F1GridOption[]>(() => {
    const options: F1GridOption[] = clientTypes.map((option) => ({ value: option.code, label: option.name }));
    const known = new Set(options.map((option) => String(option.value)));
    for (const row of rows) {
      if (row.clientType && !known.has(row.clientType)) {
        options.push({ value: row.clientType, label: row.clientTypeNm || row.clientType });
        known.add(row.clientType);
      }
    }
    return options;
  }, [clientTypes, rows]);


  const loadRows = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchClientMasterRows();
      if (requestId !== requestIdRef.current) return;
      setRows(result);
      setHasChanges(false);
      setGridKey((current) => current + 1);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setRows([]);
      setError(errorText(loadError, '거래처 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleChangesChange = useCallback((changes: F1GridChanges<ClientMasterRow>) => {
    setHasChanges(
      changes.insertedRows.length > 0 ||
        changes.updatedRows.length > 0 ||
        changes.deletedRows.length > 0,
    );
  }, []);

  // 제목줄 [저장]: 새 줄은 등록, 고친 줄은 수정(바뀐 칸이 있을 때)을 보낸다. 사용여부도 같이 보낸다(2026-10-27, S_ERP 거래처관리와 같음).
  // 서버에는 한꺼번에 저장하는 API 가 없어 줄마다 보내고, 다 보낸 뒤 목록을 다시 불러온다
  const saveChanges = useCallback(
    async (changes: F1GridChanges<ClientMasterRow>) => {
      if (savingRef.current) return;
      if (!changes.insertedRows.length && !changes.updatedRows.length && !changes.deletedRows.length) return;
      savingRef.current = true;
      setSaving(true);
      setError('');
      const originals = new Map(rows.map((row) => [row.id, row]));
      let sent = 0;
      try {
        // S_ERP 거래처관리와 같음: 지운 줄이 있으면 저장하지 않고 안내한다
        if (changes.deletedRows.length) {
          throw new Error('거래처는 삭제할 수 없습니다. 사용 여부를 변경해 주세요.');
        }
        for (const row of [...changes.insertedRows, ...changes.updatedRows]) {
          const invalid = validateClientPayload(toClientPayload(row));
          if (invalid) throw new Error(invalid);
        }
        for (const row of changes.insertedRows) {
          await createClientMaster(toClientPayload(row));
          sent += 1;
        }
        for (const row of changes.updatedRows) {
          const original = originals.get(row.id);
          if (!original) continue; // 새 줄(저장 전)은 위에서 등록했다
          const payload = toClientPayload(row);
          if (JSON.stringify(payload) === JSON.stringify(toClientPayload(original))) continue;
          await updateClientMaster(row.clientId, payload);
          sent += 1;
        }
        await loadRows();
        if (sent) showSuccess('저장되었습니다');
      } catch (saveError) {
        // 앞에서 보낸 줄은 이미 반영됐으니 목록을 다시 맞춘다(보내기 전에 막힌 것이면 고치던 내용을 그대로 둔다)
        if (sent) await loadRows();
        setError(errorText(saveError, '저장하지 못했어요'));
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [loadRows, rows, showSuccess],
  );


  return {
    rows,
    visibleRows,
    appliedFilters,
    applyFilters: setAppliedFilters,
    clientTypeOptions,
    error,
    setError,
    loading,
    saving,
    hasChanges,
    gridKey,
    skippedAlert,
    setSkippedAlert,
    reload: loadRows,
    handleChangesChange,
    saveChanges,
  };
}

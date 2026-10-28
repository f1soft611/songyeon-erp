import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  F1Grid,
  type F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { BomEditRow, BomLine, ClientOption, MaterialCheck, MaterialOption, ProductBomRow, SubMaterials } from '../types/itemMaster.types';
import { checkMaterialNames, fetchBom, fetchClientOptions, fetchMaterialOptions, fetchSubMaterials, saveBom, saveProductInfo, saveSubMaterials } from '../services/itemMaster.service';
import { formatPrice, formatQty, percentText, ratioToPercent } from '../../../../../shared/utils/numberFormat';
import { MaterialMatchDialog } from '../../../../sales/product/product-register/components/MaterialMatchDialog';
import { BomEditGrid, emptyBomEditRows, newBomRowId, type BomEditGridHandle } from '../../../../sales/product/product-register/components/BomEditGrid';
import { useCommonCodeOptions } from '../../../../../shared/components/common-code/useCommonCodeOptions';
import { MasterPickerDialog } from '../../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { clientPickerOptions, clientPickerValueOf } from '../utils/itemMaster';

// 2026-10-27 변경로그 탭은 표의 [이력] 칸(ProductBomHistoryDialog)으로 옮겼다(원재료마스터와 같음)
export type ProductBomDialogTab = 'view' | 'edit';
const DIALOG_TABS: { id: ProductBomDialogTab; label: string }[] = [
  { id: 'view', label: '상세보기' },
  { id: 'edit', label: '수정' },
];

type Message = { text: string; error: boolean };
const NO_MESSAGE: Message = { text: '', error: false };
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const toNumberOrNull = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const numberText = (value: number | null) => (value === null ? '' : String(value));

function SaveMessage({ message }: { message: Message }) {
  if (!message.text) return null;
  return (
    <Typography
      role="status"
      variant="body2"
      sx={{ whiteSpace: 'pre-line', color: message.error ? 'error.main' : 'primary.main' }}
    >
      {message.text}
    </Typography>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
      {children}
    </Typography>
  );
}

type ViewRow = { id: string; materialName: string; ratio: number | null; weight: number | null };

// 공통관리 > 기초정보 > 제품BOM 창 (송연 CM0001Tab05Modal)
// 한 제품의 배합비를 보고(총량을 넣으면 중량 환산), 고친다(기본정보·부자재·배합비 따로 저장). 변경 이력은 표의 [이력] 칸
export function ProductBomDialog({
  product,
  initialTab,
  onSaved,
  onClose,
  canWrite = true,
}: {
  product: ProductBomRow;
  initialTab: ProductBomDialogTab;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
  canWrite?: boolean; // 메뉴 권한 쓰기가 없으면 '수정' 탭을 숨긴다(상세보기만)
}) {
  const [tab, setTab] = useState<ProductBomDialogTab>(!canWrite && initialTab === 'edit' ? 'view' : initialTab);
  const [bom, setBom] = useState<BomLine[]>([]);
  const [totalInput, setTotalInput] = useState('');
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]); // 거래처 고르기(코드 · 이름, 2026-10-23)
  const [loadError, setLoadError] = useState('');

  const [info, setInfo] = useState({
    name: product.name,
    clientCode: product.clientCode, // 거래처코드(2026-10-23, 목록에서 고른다)
    storage: product.storage, // 보관방법 코드(공통코드 STORAGE_METHOD, 2026-10-23)
  });
  const storageOptions = useCommonCodeOptions('STORAGE_METHOD');
  const [infoMessage, setInfoMessage] = useState<Message>(NO_MESSAGE);
  const [sub, setSub] = useState({ net: '', filmLength: '', pouchPer: '', film: '', pouch: '', box: '' });
  const [subMessage, setSubMessage] = useState<Message>(NO_MESSAGE);
  const [bomMessage, setBomMessage] = useState<Message>(NO_MESSAGE);
  const [pending, setPending] = useState<{ rows: BomEditRow[]; unmatched: MaterialCheck[] } | null>(null);

  // 배합비 편집 그리드(공용 BomEditGrid). editSource 를 새로 주면 그 줄로 다시 시작한다
  const bomGridRef = useRef<BomEditGridHandle>(null);
  const [editSource, setEditSource] = useState<{ rows: BomEditRow[]; key: number }>({ rows: [], key: 0 });
  const resetEditRows = useCallback((rows: BomEditRow[]) => {
    setEditSource((current) => ({ rows, key: current.key + 1 }));
  }, []);

  const loadBom = useCallback(async () => {
    const list = await fetchBom(product.code);
    setBom(list);
    resetEditRows(
      list.length
        ? list.map((line) => ({
          id: newBomRowId(),
          materialName: line.materialName,
          ratioPercent: ratioToPercent(line.ratio),
          unitPrice: line.unitPricePerKg,
          autoPrice: false,
          materialCode: line.materialCode,
        }))
        : emptyBomEditRows(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.code, resetEditRows]);

  useEffect(() => {
    loadBom().catch((error) => setLoadError(errorText(error, '배합비를 불러오지 못했습니다.')));
    fetchMaterialOptions().then(setMaterials).catch(() => undefined);
    fetchClientOptions().then(setClients).catch(() => undefined);
    fetchSubMaterials(product.code)
      .then((value: SubMaterials) =>
        setSub({
          net: numberText(value.pouchNetWeightKg),
          filmLength: numberText(value.pouchLengthM),
          pouchPer: numberText(value.pouchPerUnit),
          film: value.filmMaterialName,
          pouch: value.pouchMaterialName,
          box: value.boxMaterialName,
        }),
      )
      .catch(() => undefined);
  }, [loadBom, product.code]);

  // ===== 상세보기 =====
  const total = parseFloat(totalInput);
  const viewRows = useMemo<ViewRow[]>(
    () =>
      bom.map((line, index) => ({
        id: String(index),
        materialName: line.materialName,
        ratio: line.ratio,
        weight: !Number.isNaN(total) && total > 0 && line.ratio != null ? total * line.ratio : null,
      })),
    [bom, total],
  );
  const viewColumns = useMemo<F1GridColumn<ViewRow>[]>(
    () => [
      { field: 'id', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
      { field: 'materialName', headerName: '원재료', flex: 1.6, headerAlign: 'center', align: 'left' },
      {
        field: 'ratio',
        headerName: '배합비율',
        flex: 0.8,
        headerAlign: 'center',
        align: 'right',
        renderCell: ({ row }) => percentText(row.ratio),
      },
      {
        field: 'weight',
        headerName: '중량',
        flex: 0.8,
        headerAlign: 'center',
        align: 'right',
        renderCell: ({ row }) => formatQty(row.weight),
      },
    ],
    [],
  );
  const viewSum = bom.reduce((sum, line) => sum + (line.ratio ?? 0), 0);

  // ===== 수정: 기본정보 =====
  // 업체명 팝업: 사용 중 거래처 목록에서 코드 · 이름으로 찾는다. 지금 값이 목록에 없으면(사용안함) 그 이름으로 보여 준다
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const clientPickerValue = useMemo(
    () => clientPickerValueOf(clients, info.clientCode, info.clientCode === product.clientCode ? product.clientName : ''),
    [clients, info.clientCode, product.clientCode, product.clientName],
  );
  const searchClients = useCallback(async (keyword: string): Promise<MasterPickerOption[]> => clientPickerOptions(clients, keyword), [clients]);
  const saveInfo = async () => {
    const name = info.name.trim();
    if (!name) {
      setInfoMessage({ text: '제품명은 필수예요', error: true });
      return;
    }

    if (!info.clientCode) {
      setInfoMessage({ text: '거래처를 골라주세요(거래처마스터에 등록된 거래처만 저장할 수 있어요)', error: true });
      return;
    }
    try {
      await saveProductInfo(product.code, { name, storage: info.storage, clientCode: info.clientCode });
      setInfoMessage({ text: '저장되었습니다', error: false });
      await onSaved();
    } catch (error) {
      setInfoMessage({ text: errorText(error, '저장에 실패했어요'), error: true });
    }
  };

  // ===== 수정: 부자재 =====
  const saveSub = async () => {
    try {
      await saveSubMaterials(product.code, {
        pouchNetWeightKg: toNumberOrNull(sub.net),
        pouchLengthM: toNumberOrNull(sub.filmLength),
        pouchPerUnit: toNumberOrNull(sub.pouchPer),
        filmMaterialName: sub.film,
        pouchMaterialName: sub.pouch,
        boxMaterialName: sub.box,
      });
      setSubMessage({ text: '저장되었습니다', error: false });
    } catch (error) {
      setSubMessage({ text: errorText(error, '저장에 실패했어요'), error: true });
    }
  };
  const subOptions = (category: string) =>
    // 2026-10-23 분류는 공통코드 코드라 이름(필름 · 파우치 · 박스)으로 견준다
    materials.filter((material) => material.subCategoryNm === category).map((material) => material.name);

  // ===== 수정: 배합비 =====

  const doSaveBom = async (rows: BomEditRow[]) => {
    try {
      const materialCost = await saveBom(product.code, rows);
      await loadBom();
      setBomMessage({ text: `저장되었습니다 (원재료비 ${formatPrice(materialCost)}원)`, error: false });
      await onSaved();
    } catch (error) {
      setBomMessage({ text: errorText(error, '저장에 실패했어요'), error: true });
    }
  };

  // 송연 pbom-save-btn: 원재료명이 목록과 다르면 확인 창을 먼저 띄운다
  const saveBomRows = async () => {
    const rows = bomGridRef.current?.getRows() ?? editSource.rows;
    setBomMessage(NO_MESSAGE);
    const names = rows.filter((row) => row.materialName.trim() && row.ratioPercent !== null).map((row) => row.materialName.trim());
    if (names.length === 0) return doSaveBom(rows);
    try {
      const unmatched = (await checkMaterialNames(names)).filter((check) => !check.exact);
      if (unmatched.length === 0) return doSaveBom(rows);
      setPending({ rows, unmatched });
    } catch (error) {
      setBomMessage({ text: errorText(error, '저장에 실패했어요'), error: true });
    }
  };

  const confirmMatch = (resolved: Record<string, string>) => {
    if (!pending) return;
    const next = pending.rows.map((row) => {
      const fixed = resolved[row.materialName.trim()];
      return fixed ? { ...row, materialName: fixed, materialCode: null } : row;
    });
    setPending(null);
    void doSaveBom(next);
  };

  const title = `제품마스터 — ${product.name} (${product.code})`;
  const dialogGridHeight = 260;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="product-bom-title">
      <DialogTitle id="product-bom-title" sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Tabs value={tab} onChange={(_, value: ProductBomDialogTab) => setTab(value)} aria-label="제품마스터 탭" sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        {DIALOG_TABS.filter((item) => canWrite || item.id !== 'edit').map((item) => (
          <Tab key={item.id} value={item.id} label={item.label} sx={{ fontWeight: 700 }} />
        ))}
      </Tabs>
      <DialogContent sx={{ pt: 2 }}>
        {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

        {tab === 'view' && (
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
              <TextField
                size="small"
                label="총량 입력"
                placeholder="예: 1000"
                value={totalInput}
                onChange={(event) => setTotalInput(event.target.value.replace(/[^0-9.]/g, ''))}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                sx={{ width: 180 }}
              />
              <Typography variant="body2" color="text.secondary">
                입력하면 배합비율 기준으로 각 원재료의 중량이 자동으로 계산돼요
              </Typography>
            </Stack>
            <Box sx={{ height: dialogGridHeight }}>
              <F1Grid
                rows={viewRows}
                columns={viewColumns}
                rowKey="id"
                storageKey="cm-basic-info-product-bom-view-grid"
                ariaLabel="F1-GRID 배합비"
                height="100%"
                maxHeight="100%"
                rowHeight={32}
                showCheckbox={false}
                allowAddRowInContextMenu={false}
                allowDuplicateRowInContextMenu={false}
                allowDeleteRowInContextMenu={false}
              />
            </Box>
            <Typography variant="body2" sx={{ textAlign: 'right' }}>
              배합비율 합계: <b>{(viewSum * 100).toFixed(2)}%</b>
            </Typography>
          </Stack>
        )}

        {tab === 'edit' && canWrite && (
          <Stack spacing={2.5}>
            <Box>
              <SectionTitle>기본정보</SectionTitle>
              <Stack spacing={1.5}>
                <TextField size="small" label="제품명" value={info.name} onChange={(event) => setInfo({ ...info, name: event.target.value })} />
                {/* 거래처: 칸 안 🔍 → 거래처 팝업에서 고른다(2026-10-28). 원재료 · 부자재 상세 창의 납품업체 칸(F1-Grid code 칸)과 같은 모양 · 같은 팝업. 저장은 거래처코드 */}
                <TextField
                  size="small"
                  margin="none"
                  label="거래처"
                  required
                  value={clientPickerValue ? `${clientPickerValue.code} · ${clientPickerValue.name}` : ''}
                  slotProps={{
                    htmlInput: { readOnly: true },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="거래처 선택">
                            <IconButton aria-label="거래처 선택" edge="end" size="small" sx={{ p: 0.75 }} onClick={() => setClientPickerOpen(true)}>
                              <SearchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <MasterPickerDialog
                  label="거래처"
                  open={clientPickerOpen}
                  search={searchClients}
                  onClose={() => setClientPickerOpen(false)}
                  onChange={(option) => {
                    setInfo((current) => ({ ...current, clientCode: option.code }));
                    setClientPickerOpen(false);
                  }}
                />
                {/* 보관방법: 공통코드 STORAGE_METHOD 에서 고른다(2026-10-23, 저장은 코드) */}
                <TextField
                  select
                  size="small"
                  label="보관방법"
                  value={info.storage}
                  onChange={(event) => setInfo({ ...info, storage: event.target.value })}
                  slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                >
                  <MenuItem value="">선택 안 함</MenuItem>
                  {storageOptions.map((option) => (
                    <MenuItem key={option.code} value={option.code}>{option.name}</MenuItem>
                  ))}
                  {info.storage && storageOptions.length > 0 && !storageOptions.some((option) => option.code === info.storage) ? (
                    <MenuItem value={info.storage}>{product.storageNm || info.storage} (다시 골라주세요)</MenuItem>
                  ) : null}
                </TextField>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Button variant="contained" onClick={() => void saveInfo()}>기본정보 저장</Button>
                  <SaveMessage message={infoMessage} />
                </Stack>
              </Stack>
            </Box>

            <Divider />
            <Box>
              <SectionTitle>부자재 (필름 · 파우치 · 박스)</SectionTitle>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.7 }}>
                원재료BOM에서 <b>부자재 분류</b>를 정해둔 것만 고를 수 있어요.<br />
                생산입고를 넣으면 <b>필름·파우치</b>가, 출하확정에서 박스수량을 적으면 <b>박스</b>가 재고에서 빠집니다.<br />
                봉지 수 = 생산량(kg) ÷ 한 봉 내용량(kg) · 필름 M = 봉지 수 × 한 봉당 필름길이
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <TextField size="small" margin="none" type="number" label="한 봉 내용량 (kg)" placeholder="예: 1" value={sub.net} onChange={(event) => setSub({ ...sub, net: event.target.value })} slotProps={{ htmlInput: { step: '0.001' } }} sx={{ gridColumn: { sm: '1 / -1' } }} />
                <Autocomplete freeSolo options={subOptions('필름')} inputValue={sub.film} onInputChange={(_, value) => setSub((current) => ({ ...current, film: value }))} renderInput={(params) => <TextField {...params} size="small" margin="none" label="필름" placeholder="필름으로 등록된 원재료명" />} />
                <TextField size="small" margin="none" type="number" label="한 봉당 필름길이 (M)" placeholder="예: 0.35" value={sub.filmLength} onChange={(event) => setSub({ ...sub, filmLength: event.target.value })} slotProps={{ htmlInput: { step: '0.001' } }} />
                <Autocomplete freeSolo options={subOptions('파우치')} inputValue={sub.pouch} onInputChange={(_, value) => setSub((current) => ({ ...current, pouch: value }))} renderInput={(params) => <TextField {...params} size="small" margin="none" label="파우치" placeholder="파우치로 등록된 원재료명" />} />
                <TextField size="small" margin="none" type="number" label="한 봉당 파우치 수" placeholder="보통 1" value={sub.pouchPer} onChange={(event) => setSub({ ...sub, pouchPer: event.target.value })} slotProps={{ htmlInput: { step: '1' } }} />
                <Autocomplete freeSolo options={subOptions('박스')} inputValue={sub.box} onInputChange={(_, value) => setSub((current) => ({ ...current, box: value }))} renderInput={(params) => <TextField {...params} size="small" margin="none" label="박스" placeholder="박스로 등록된 원재료명" />} sx={{ gridColumn: { sm: '1 / -1' } }} />
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 1.5 }}>
                <Button variant="contained" onClick={() => void saveSub()}>부자재 저장</Button>
                <SaveMessage message={subMessage} />
              </Stack>
            </Box>

            <Divider />
            <Box>
              <SectionTitle>배합비</SectionTitle>
              <BomEditGrid
                ref={bomGridRef}
                materials={materials}
                sourceRows={editSource.rows}
                sourceKey={editSource.key}
                storageKey="cm-basic-info-product-bom-edit-grid"
                height={dialogGridHeight}
              />
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 1.5 }}>
                <Button variant="contained" onClick={() => void saveBomRows()}>배합비 저장</Button>
                <SaveMessage message={bomMessage} />
              </Stack>
            </Box>
          </Stack>
        )}

      </DialogContent>
      {pending && (
        <MaterialMatchDialog unmatched={pending.unmatched} onConfirm={confirmMatch} onClose={() => setPending(null)} />
      )}
    </Dialog>
  );
}

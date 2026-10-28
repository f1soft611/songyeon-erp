import { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import type { BomEditRow, ClientOption, MaterialOption } from '../../../co/master/item-master/types/itemMaster.types';
import type { BoxTypeRow } from '../../../co/master/box-type/types/boxType.types';
import { BomEditGrid, emptyBomEditRows, type BomEditGridHandle } from '../../product/components/BomEditGrid';
import { appliedPrice } from '../../../co/master/item-master/utils/productBom';
import { formatPrice } from '../../../../shared/utils/numberFormat';
import { ClientSelect } from '../../product/components/ClientSelect';
import { rateText } from '../../pricing/utils/pricing';
import { RecipeDropzone } from '../../product/components/RecipeDropzone';
import { STORAGE_METHOD_GROUP } from '../../product/utils/productRegister';
import { useCommonCodeOptions } from '../../../../shared/components/common-code/useCommonCodeOptions';
import { computeQuote, toQuoteSaveBody, type QuoteForm, type QuoteFormField } from '../utils/quote';

export type QuoteFormMode = { kind: 'new' } | { kind: 'edit'; quoteId: number } | { kind: 'view'; quoteId: number; productCode: string };

type Message = { text: string; error: boolean };
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 가견적 작성·수정·상세 창(송연 SA0003QuoteFormModal, 업체 양식은 파이썬 05-quote.js)
// 제품 정보 → 원재료 배합비(레시피 엑셀 불러오기) → 단가 계산(고정마진·로스·인건비…) → 견적단가/확정단가.
// 확정된 견적은 상세보기(읽기 전용)로만 연다.
export function QuoteFormDialog({
  mode,
  initialForm,
  initialRows,
  initialClientName = '',
  initialStorageNm = '',
  packagingTypes,
  clients,
  materials,
  onSave,
  onClose,
}: {
  mode: QuoteFormMode;
  initialForm: QuoteForm;
  initialRows: BomEditRow[];
  initialClientName?: string; // 지금 견적의 거래처 이름(사용안함이 된 거래처를 보여 주려고, 2026-10-23)
  initialStorageNm?: string; // 지금 견적의 보관방법 이름
  packagingTypes: BoxTypeRow[];
  clients: ClientOption[];
  materials: MaterialOption[];
  onSave: (body: ReturnType<typeof toQuoteSaveBody>) => Promise<void>;
  onClose: () => void;
}) {
  const readOnly = mode.kind === 'view';
  const title = mode.kind === 'view' ? `가견적 상세 (확정됨 — 제품코드 ${mode.productCode})` : mode.kind === 'edit' ? '가견적 수정' : '가견적 작성';
  const gridRef = useRef<BomEditGridHandle>(null);
  const savingRef = useRef(false);
  const [form, setForm] = useState<QuoteForm>(initialForm);
  const storageOptions = useCommonCodeOptions(STORAGE_METHOD_GROUP); // 보관방법 공통코드(2026-10-23, 견적에도 코드로 저장)
  const [bomSource, setBomSource] = useState(() => ({ rows: initialRows.length ? initialRows : emptyBomEditRows(), key: 0 }));
  const [liveRows, setLiveRows] = useState<BomEditRow[]>(bomSource.rows);
  const [message, setMessage] = useState<Message | null>(null);
  const set = (patch: Partial<QuoteForm>) => setForm((current) => ({ ...current, ...patch }));
  const computed = computeQuote(form, liveRows);

  // 송연 q-type-select: 포장유형을 고르면 고정마진율·로스율·인건비·포장비·물류비·마진을 채운다
  const chooseType = (name: string) => {
    const type = packagingTypes.find((item) => item.boxTypeNm === name);
    if (!type) {
      set({ productType: name });
      return;
    }
    set({
      productType: name,
      markupRate: rateText(type.fixedMarginRate),
      lossRate: rateText(type.lossRate),
      laborCost: type.laborCost == null ? '' : String(type.laborCost),
      packagingCost: type.packingCost == null ? '' : String(type.packingCost),
      logisticsCost: type.logisticsCost == null ? '' : String(type.logisticsCost),
      margin: type.marginAmt == null ? '' : String(type.marginAmt),
    });
  };


  // 송연 quote-save-btn: 제품명 필수 → 저장(새로 작성이면 등록, 고치는 중이면 수정). 거절되면 서버 문구.
  const save = async () => {
    if (savingRef.current) return;
    if (!form.productName.trim()) {
      setMessage({ text: '제품명은 필수예요', error: true });
      return;
    }
    savingRef.current = true;
    setMessage(null);
    try {
      await onSave(toQuoteSaveBody(form, gridRef.current?.getRows() ?? liveRows));
    } catch (saveError) {
      setMessage({ text: errorText(saveError, '저장에 실패했어요'), error: true });
    } finally {
      savingRef.current = false;
    }
  };

  const shrink = { inputLabel: { shrink: true } };
  const field = (key: QuoteFormField, label: string, extra: { type?: string; placeholder?: string; helperText?: string } = {}) => (
    <TextField
      size="small"
      margin="none"
      fullWidth
      type={extra.type ?? 'number'}
      label={label}
      placeholder={extra.placeholder}
      helperText={extra.helperText}
      value={form[key]}
      onChange={(event) => set({ [key]: event.target.value } as Partial<QuoteForm>)}
      slotProps={{ ...shrink, htmlInput: { readOnly } }}
    />
  );
  const two = { display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, columnGap: 2, rowGap: 2 };
  const other = (n: 1 | 2 | 3 | 4, notePlaceholder: string) => (
    <Box key={n} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 1.5 }}>
      {field(`otherCost${n}` as QuoteFormField, `기타단가${n}`, { placeholder: '금액' })}
      {field(`otherCost${n}Note` as QuoteFormField, `기타단가${n} 비고`, { type: 'text', placeholder: notePlaceholder })}
    </Box>
  );

  // 상세보기(확정됨)는 고칠 수 없어 읽기 표로 보여준다
  const viewColumns = useMemo<F1GridColumn<BomEditRow>[]>(() => [
    { field: 'id', type: 'rownumber', width: 56, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    { field: 'materialName', headerName: '원재료명', flex: 1.6, width: 180, headerAlign: 'center', align: 'left' },
    { field: 'ratioPercent', headerName: '배합비율 (%)', width: 110, headerAlign: 'center', align: 'right', getValue: (row) => (row.ratioPercent == null ? '' : formatPrice(Number(row.ratioPercent))) },
    { field: 'unitPrice', headerName: '원재료단가', width: 110, headerAlign: 'center', align: 'right', getValue: (row) => (row.unitPrice == null ? '' : formatPrice(Number(row.unitPrice))) },
    { field: 'autoPrice', headerName: '적용단가', width: 110, headerAlign: 'center', align: 'right', renderCell: ({ row }) => appliedPrice(row.ratioPercent, row.unitPrice) },
  ], []);

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth aria-labelledby="quote-form-title">
      <DialogTitle id="quote-form-title" sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={two}>
          {field('productName', '제품명 *', { type: 'text', placeholder: '예: 떡볶이소스 2kg' })}
          {field('spec', '규격/단위', { type: 'text', placeholder: '예: 2kg*6ea' })}
          <TextField
            select
            size="small"
            margin="none"
            label="포장유형 — 고르면 아래 값이 자동으로 채워져요"
            value={form.productType}
            disabled={readOnly}
            onChange={(event) => chooseType(event.target.value)}
            slotProps={{ ...shrink, select: { displayEmpty: true } }}
          >
            <MenuItem value="">선택 안 함</MenuItem>
            {packagingTypes.map((type) => <MenuItem key={type.id} value={type.boxTypeNm}>{type.boxTypeNm}</MenuItem>)}
            {form.productType && !packagingTypes.some((type) => type.boxTypeNm === form.productType) && (
              <MenuItem value={form.productType}>{form.productType}</MenuItem>
            )}
          </TextField>
          <TextField
            select
            size="small"
            margin="none"
            label="보관방법"
            value={form.storage}
            disabled={readOnly}
            onChange={(event) => set({ storage: event.target.value })}
            slotProps={{ ...shrink, select: { displayEmpty: true } }}
          >
            <MenuItem value="">선택 안 함</MenuItem>
            {/* 2026-10-23 공통코드 STORAGE_METHOD, 견적에도 코드로 저장한다 */}
            {storageOptions.map((option) => <MenuItem key={option.code} value={option.code}>{option.name}</MenuItem>)}
            {form.storage && storageOptions.length > 0 && !storageOptions.some((option) => option.code === form.storage) ? (
              <MenuItem value={form.storage}>{initialStorageNm || form.storage}</MenuItem>
            ) : null}
          </TextField>
          {/* 거래처명: 거래처마스터 목록에서 고른다(이름 표시, 저장은 거래처코드, 2026-10-23) */}
          <ClientSelect
            shrinkLabel
            disabled={readOnly}
            options={clients}
            value={form.clientCode}
            currentName={initialClientName}
            onChange={(clientCode) => set({ clientCode })}
          />
          {field('note', '비고 — 견적서 비고란에 그대로 들어가요', { type: 'text', placeholder: '예: 초도 물량 협의중' })}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mt: 3, mb: 1.5 }}>원재료 배합비 (BOM)</Typography>
        {readOnly ? (
          <Box sx={{ height: 240 }}>
            <F1Grid
              rows={bomSource.rows}
              columns={viewColumns}
              rowKey="id"
              storageKey="sa-quote-view-bom-grid"
              ariaLabel="F1-GRID 견적 원재료 구성"
              height="100%"
              maxHeight="100%"
              rowHeight={32}
              showCheckbox={false}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        ) : (
          <>
            <RecipeDropzone
              materials={materials}
              onLoaded={(rows, loaded) => {
                setBomSource((current) => ({ rows, key: current.key + 1 }));
                setMessage({ text: loaded, error: false });
              }}
              onError={(text) => setMessage({ text, error: true })}
            />
            <BomEditGrid
              ref={gridRef}
              materials={materials}
              sourceRows={bomSource.rows}
              sourceKey={bomSource.key}
              storageKey="sa-quote-bom-grid"
              height={240}
              onRowsChange={setLiveRows}
            />
          </>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mt: 3, mb: 1.5 }}>단가 계산</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={two}>
            {field('markupRate', '고정마진율 (%)', { helperText: `${formatPrice(computed.afterMarkup)}원(${formatPrice(computed.markupAmount)}원)` })}
            {field('lossRate', '로스율 (%)', { helperText: `${formatPrice(computed.afterLoss)}원(${formatPrice(computed.lossAmount)}원)` })}
          </Box>
          <Box sx={two}>
            {field('laborCost', '인건비 (원)')}
            {field('packagingCost', '포장비 (원)')}
          </Box>
          <Box sx={two}>
            {field('logisticsCost', '물류비 (원)')}
            {field('margin', '마진 (원)')}
          </Box>
          <Box sx={two}>
            {other(1, '비고 (예: 특별포장비)')}
            {other(2, '비고')}
            {other(3, '비고')}
            {other(4, '비고')}
          </Box>
          <Box sx={two}>
            <TextField
              size="small"
              margin="none"
              label="견적단가"
              value={`${formatPrice(computed.total)}원`}
              slotProps={{ ...shrink, htmlInput: { readOnly: true, 'aria-label': '견적단가' } }}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover', fontWeight: 800 } }}
            />
            {field('currentPrice', '확정단가', { placeholder: '비워두면 견적단가 사용' })}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {message && (
          <Typography role="status" variant="body2" sx={{ mr: 'auto', whiteSpace: 'pre-line', color: message.error ? 'error.main' : 'primary.main' }}>
            {message.text}
          </Typography>
        )}
        <Button onClick={onClose}>{readOnly ? '닫기' : '취소'}</Button>
        {!readOnly && <Button variant="contained" onClick={() => void save()}>가견적 저장</Button>}
      </DialogActions>
    </Dialog>
  );
}

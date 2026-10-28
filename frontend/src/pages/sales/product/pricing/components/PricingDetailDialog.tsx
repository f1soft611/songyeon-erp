import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
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
import type { BoxTypeRow } from '../../../../co/master/box-type/types/boxType.types';
import { fetchClientOptions } from '../../../../co/master/item-master/services/itemMaster.service';
import type { ClientOption } from '../../../../co/master/item-master/types/itemMaster.types';
import { clientPickerOptions, clientPickerValueOf } from '../../../../co/master/item-master/utils/itemMaster';
import { MasterPickerDialog } from '../../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { formatPrice, percentText } from '../../../../../shared/utils/numberFormat';
import type { PricingBomLine, PricingDetail } from '../types/pricing.types';
import {
  computedHints,
  pricingFormFrom,
  pricingSaveBody,
  rateText,
  topAmountNames,
  type PricingForm,
} from '../utils/pricing';

type Message = { text: string; error: boolean };

// 단가상세 창(송연 SA0002PricingDetailModal): 왼쪽 단가 입력, 오른쪽 원재료 구성(적용단가 큰 5개 강조)
export function PricingDetailDialog({
  detail,
  bom,
  packagingTypes,
  onSave,
  onClose,
}: {
  detail: PricingDetail;
  bom: PricingBomLine[];
  packagingTypes: BoxTypeRow[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PricingForm>(() => pricingFormFrom(detail));
  const [message, setMessage] = useState<Message>({ text: '', error: false });
  // 저장 뒤 서버에서 다시 받은 상세로 입력칸을 채운다(송연 reg-save 뒤 selectProduct)
  useEffect(() => {
    setForm(pricingFormFrom(detail));
  }, [detail]);
  const set = (patch: Partial<PricingForm>) => setForm((current) => ({ ...current, ...patch }));

  // 거래처 팝업(2026-10-28, 제품마스터 거래처 칸과 같은 모양 · 같은 팝업): 사용 중 거래처에서 고른다
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  useEffect(() => {
    fetchClientOptions().then(setClients).catch(() => undefined);
  }, []);
  const clientPickerValue = clientPickerValueOf(clients, form.clientCode, form.clientCode === detail.clientCode ? detail.clientName : '');
  const searchClients = useCallback(async (keyword: string): Promise<MasterPickerOption[]> => clientPickerOptions(clients, keyword), [clients]);

  const hints = computedHints(detail.materialCost, form.markupRate, form.lossRate);

  // 포장유형을 고르면 그 유형의 기본값(고정마진율·로스율·인건비·포장비·물류비·마진)으로 채운다
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

  const save = async () => {
    setMessage({ text: '', error: false });
    try {
      await onSave(pricingSaveBody(form));
      setMessage({ text: '저장되었습니다', error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error && error.message ? error.message : '저장에 실패했어요', error: true });
    }
  };

  const top5 = useMemo(() => topAmountNames(bom), [bom]);
  const bomColumns = useMemo<F1GridColumn<PricingBomLine>[]>(
    () => [
      {
        field: 'id',
        headerName: 'No',
        type: 'rownumber',
        width: 56,
        align: 'center',
        pinned: 'left',
        form: { hidden: true },
        search: { hidden: true },
      },
      {
        field: 'materialName',
        headerName: '원재료',
        width: 305,
        headerAlign: 'center',
        align: 'left',
        getCellStyle: ({ row }) => (top5.has(row.materialName) ? { fontWeight: 700, color: '#1d4ed8' } : undefined),
      },
      {
        field: 'ratio',
        headerName: '배합비율',
        type: 'decimal',
        decimalPlaces: 4,
        width: 90,
        align: 'right',
        renderCell: ({ row }) => percentText(row.ratio)
      },
      {
        field: 'amountPerKg',
        headerName: '적용단가(원)',
        type: 'currency',
        decimalPlaces: 4,
        width: 110,
        align: 'right',
        renderCell: ({ row }) => formatPrice(row.amountPerKg)
      },
    ],
    [top5],
  );

  const shrink = { inputLabel: { shrink: true } };
  const amount = (key: keyof PricingForm, label: string, extra: object = {}) => (
    <TextField
      size="small"
      margin="none"
      fullWidth
      type="number"
      label={label}
      value={form[key]}
      onChange={(event) => set({ [key]: event.target.value } as Partial<PricingForm>)}
      slotProps={shrink}
      {...extra}
    />
  );
  const pair = { display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 };
  const other = (n: 1 | 2 | 3 | 4, notePlaceholder: string) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 1.5 }}>
      {amount(`otherCost${n}` as keyof PricingForm, `기타단가${n}`, { placeholder: '금액' })}
      <TextField
        size="small"
        margin="none"
        label={`기타단가${n} 비고`}
        placeholder={notePlaceholder}
        value={form[`otherCost${n}Note` as keyof PricingForm]}
        onChange={(event) => set({ [`otherCost${n}Note`]: event.target.value } as Partial<PricingForm>)}
        slotProps={shrink}
      />
    </Box>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth aria-labelledby="pricing-detail-title">
      <DialogTitle id="pricing-detail-title" sx={{ pr: 6 }}>
        단가상세 : {detail.productName}{' '}
        {detail.clientName && <Typography component="span" color="text.secondary">({detail.clientName} 납품)</Typography>}
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 800 }}>
          최종계산단가 <Box component="span" sx={{ color: 'primary.main' }}>{formatPrice(detail.totalPrice)}원</Box>
        </Typography>
        {/* 표의 최소 폭이 왼쪽 입력칸을 밀어내지 않게 두 단 모두 minmax(0, …) 로 나눈다 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 3 }}>
          <Stack spacing={1.75}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>단가 입력</Typography>
            <TextField
              select
              size="small"
              margin="none"
              label="포장유형"
              value={form.productType}
              onChange={(event) => chooseType(event.target.value)}
              slotProps={{ ...shrink, select: { displayEmpty: true } }}
            >
              <MenuItem value="">선택 안 함 / 직접 입력</MenuItem>
              {packagingTypes.map((type) => (
                <MenuItem key={type.id} value={type.boxTypeNm}>{type.boxTypeNm}</MenuItem>
              ))}
              {form.productType && !packagingTypes.some((type) => type.boxTypeNm === form.productType) && (
                <MenuItem value={form.productType}>{form.productType}</MenuItem>
              )}
            </TextField>
            <Box sx={pair}>
              {amount('markupRate', '고정마진율 (%)', {
                slotProps: { ...shrink, htmlInput: { step: '0.01' } },
                helperText: `${formatPrice(hints.afterMarkup)}원(${formatPrice(hints.markupAmount)}원)`,
              })}
              {amount('lossRate', '로스율 (%)', {
                slotProps: { ...shrink, htmlInput: { step: '0.01' } },
                helperText: `${formatPrice(hints.afterLoss)}원(${formatPrice(hints.lossAmount)}원)`,
              })}
            </Box>
            <Box sx={pair}>
              {amount('laborCost', '인건비 (원)')}
              {amount('packagingCost', '포장비 (원)')}
            </Box>
            <Box sx={pair}>
              {amount('logisticsCost', '물류비 (원)')}
              {amount('margin', '마진 (원)')}
            </Box>
            {other(1, '비고 (예: 특별포장비)')}
            {other(2, '비고')}
            {other(3, '비고')}
            {other(4, '비고')}
            {amount('currentPrice', '현재 판매단가 (원)', {
              placeholder: '비우면 최종계산단가로 판다',
              helperText: '실제로 받는 값입니다. 적으면 매출·거래명세표·채권관리대장이 이 값으로 계산합니다.',
            })}
            {/* 거래처명: 칸 안 🔍 → 거래처 팝업에서 고른다(2026-10-28). 저장은 거래처코드 */}
            <TextField
              size="small"
              margin="none"
              fullWidth
              label="거래처명"
              value={clientPickerValue ? `${clientPickerValue.code} · ${clientPickerValue.name}` : ''}
              slotProps={{
                ...shrink,
                htmlInput: { readOnly: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="거래처명 선택">
                        <IconButton aria-label="거래처명 선택" edge="end" size="small" sx={{ p: 0.75 }} onClick={() => setClientPickerOpen(true)}>
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <MasterPickerDialog
              label="거래처명"
              open={clientPickerOpen}
              search={searchClients}
              onClose={() => setClientPickerOpen(false)}
              onChange={(option) => {
                set({ clientCode: option.code });
                setClientPickerOpen(false);
              }}
            />
          </Stack>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1.5 }}>원재료 구성</Typography>
            {bom.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>등록된 원재료가 없습니다</Typography>
            )}
            <Box sx={{ height: { xs: 360, md: 520 } }}>
              <F1Grid
                rows={bom}
                columns={bomColumns}
                rowKey="id"
                storageKey="sa-pricing-detail-bom-grid"
                ariaLabel="F1-GRID 원재료 구성"
                height="100%"
                maxHeight="100%"
                rowHeight={32}
                showCheckbox={false}
                allowAddRowInContextMenu={false}
                allowDuplicateRowInContextMenu={false}
                allowDeleteRowInContextMenu={false}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      {/* 저장은 스크롤하지 않아도 보이게 아래에 고정한다 */}
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {message.text && (
          <Typography role="status" variant="body2" sx={{ mr: 'auto', color: message.error ? 'error.main' : 'primary.main' }}>
            {message.text}
          </Typography>
        )}
        <Button variant="contained" onClick={() => void save()}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}

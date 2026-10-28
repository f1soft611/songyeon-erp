import { useCallback } from 'react';
import { Box, MenuItem, TextField } from '@mui/material';
import type { CommonCodeOption } from '../../../../../shared/components/common-code/useCommonCodeOptions';
import type { ClientOption } from '../../../../co/master/item-master/types/itemMaster.types';
import type { ProductRegisterForm } from '../types/productRegister.types';
import { MasterPicker } from '../../../../../shared/components/master-picker/MasterPicker';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { clientPickerOptions, clientPickerValueOf } from '../../../../co/master/item-master/utils/itemMaster';

type ProductInfoFormProps = {
  form: ProductRegisterForm;
  onChange: (patch: Partial<ProductRegisterForm>) => void;
  packagingTypes: string[];
  storageOptions: CommonCodeOption[];
  clients: ClientOption[];
  quoteClientName: string; // 견적에서 넘어온 거래처 이름(목록에 없을 때 보여 준다)
  productCode?: string; // [저장]한 제품의 코드(2026-10-28)
  readOnly?: boolean; // [저장] 뒤 보기 전용
};

const shrink = { inputLabel: { shrink: true } };
// 업체 양식과 같이 두 칸씩: 제품코드|제품명, 규격/단위|포장유형, 보관방법|거래처명
const gridSx = { display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, columnGap: 2, rowGap: 2.5 };

// 제품등록의 제품 정보 칸
export function ProductInfoForm({ form, onChange, packagingTypes, storageOptions, clients, quoteClientName, productCode = '', readOnly = false }: ProductInfoFormProps) {
  const searchClients = useCallback(async (keyword: string): Promise<MasterPickerOption[]> => clientPickerOptions(clients, keyword), [clients]);
  return (
    <Box sx={gridSx}>
      {/* 제품코드는 등록할 때 서버가 발번한다(미리 보여주지 않는다). [저장] 뒤에는 발번한 코드 */}
      <TextField
        size="small"
        margin="none"
        label="제품코드"
        value={productCode}
        placeholder="(자동 생성)"
        slotProps={{ ...shrink, htmlInput: { readOnly: true } }}
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
      />
      <TextField size="small" margin="none" required disabled={readOnly} label="제품명" placeholder="예: 떡볶이소스 2kg" value={form.name} onChange={(event) => onChange({ name: event.target.value })} slotProps={shrink} />
      <TextField size="small" margin="none" disabled={readOnly} label="규격/단위" placeholder="예: 2kg*6ea" value={form.spec} onChange={(event) => onChange({ spec: event.target.value })} slotProps={shrink} />
      <TextField
        select
        size="small"
        margin="none"
        label="포장유형"
        disabled={readOnly}
        value={form.productType}
        onChange={(event) => onChange({ productType: event.target.value })}
        slotProps={{ ...shrink, select: { displayEmpty: true } }}
      >
        <MenuItem value="">선택 안 함</MenuItem>
        {packagingTypes.map((name) => (
          <MenuItem key={name} value={name}>{name}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        margin="none"
        label="보관방법"
        disabled={readOnly}
        value={form.storage}
        onChange={(event) => onChange({ storage: event.target.value })}
        slotProps={{ ...shrink, select: { displayEmpty: true } }}
      >
        <MenuItem value="">선택 안 함</MenuItem>
        {/* 보관방법: 공통코드 STORAGE_METHOD(2026-10-23), 값은 코드 */}
        {storageOptions.map((option) => (
          <MenuItem key={option.code} value={option.code}>{option.name}</MenuItem>
        ))}
      </TextField>
      {/* 거래처명: [선택] → 거래처 팝업에서 고른다(2026-10-28, S_ERP 수주등록 거래처 칸과 같은 칸 + 선택 단추). 저장은 거래처코드 */}
      {/* MasterPicker 는 S_ERP 화면(입력칸 위 여백 있음)에 맞춰 위 여백(mt: 2)이 있다. 이 화면 칸들은 여백이 없어 줄을 맞춘다 */}
      <Box sx={{ '& > .MuiStack-root': { mt: 0 } }}>
        <MasterPicker
          label="거래처명"
          value={clientPickerValueOf(clients, form.clientCode, quoteClientName)}
          search={searchClients}
          disabled={readOnly}
          onChange={(option) => onChange({ clientCode: option.code })}
        />
      </Box>
    </Box>
  );
}

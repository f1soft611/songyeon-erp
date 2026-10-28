import { Box, MenuItem, TextField } from '@mui/material';
import type { CommonCodeOption } from '../../../../shared/components/common-code/useCommonCodeOptions';
import type { ClientOption } from '../../../co/master/item-master/types/itemMaster.types';
import type { ProductRegisterForm } from '../types/productRegister.types';
import { ClientSelect } from './ClientSelect';

type ProductInfoFormProps = {
  form: ProductRegisterForm;
  onChange: (patch: Partial<ProductRegisterForm>) => void;
  packagingTypes: string[];
  storageOptions: CommonCodeOption[];
  clients: ClientOption[];
  quoteClientName: string; // 견적에서 넘어온 거래처 이름(목록에 없을 때 보여 준다)
};

const shrink = { inputLabel: { shrink: true } };
// 업체 양식과 같이 두 칸씩: 제품코드|제품명, 규격/단위|포장유형, 보관방법|거래처명
const gridSx = { display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, columnGap: 2, rowGap: 2.5 };

// 제품등록의 제품 정보 칸
export function ProductInfoForm({ form, onChange, packagingTypes, storageOptions, clients, quoteClientName }: ProductInfoFormProps) {
  return (
    <Box sx={gridSx}>
      {/* 제품코드는 등록할 때 서버가 발번한다(미리 보여주지 않는다) */}
      <TextField
        size="small"
        margin="none"
        label="제품코드"
        value=""
        placeholder="(자동 생성)"
        slotProps={{ ...shrink, htmlInput: { readOnly: true } }}
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'action.hover' } }}
      />
      <TextField size="small" margin="none" required label="제품명" placeholder="예: 떡볶이소스 2kg" value={form.name} onChange={(event) => onChange({ name: event.target.value })} slotProps={shrink} />
      <TextField size="small" margin="none" label="규격/단위" placeholder="예: 2kg*6ea" value={form.spec} onChange={(event) => onChange({ spec: event.target.value })} slotProps={shrink} />
      <TextField
        select
        size="small"
        margin="none"
        label="포장유형"
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
      {/* 거래처명: 거래처마스터 목록에서 고른다(이름 표시, 저장은 거래처코드, 2026-10-23) */}
      <ClientSelect
        shrinkLabel
        options={clients}
        value={form.clientCode}
        currentName={quoteClientName}
        onChange={(clientCode) => onChange({ clientCode })}
      />
    </Box>
  );
}

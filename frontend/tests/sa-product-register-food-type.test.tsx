import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ProductInfoForm } from '../src/pages/sales/product/product-register/components/ProductInfoForm';
import { EMPTY_PRODUCT_FORM, FOOD_TYPE_GROUP } from '../src/pages/sales/product/product-register/utils/productRegister';

// 영업관리 > 제품등록 식품유형(2026-11-05): 공통코드 FOOD_TYPE 에서 고르고, 값은 코드. 포장유형 다음 칸
const foodTypes = [
  { code: '001', name: '복합조미식품' },
  { code: '002', name: '소스(살균제품)' },
];

function renderForm(onChange = vi.fn(), foodType = '') {
  render(
    <ProductInfoForm
      form={{ ...EMPTY_PRODUCT_FORM, foodType }}
      onChange={onChange}
      packagingTypes={[]}
      storageOptions={[]}
      foodTypeOptions={foodTypes}
      clients={[]}
      quoteClientName=""
    />,
  );
  return onChange;
}

describe('제품등록 식품유형', () => {
  it('공통코드 그룹은 FOOD_TYPE 이다', () => {
    expect(FOOD_TYPE_GROUP).toBe('FOOD_TYPE');
  });

  it('포장유형과 보관방법 사이에 있고, 고르면 코드로 바꾼다', () => {
    const onChange = renderForm();
    // 화면 순서: 포장유형 → 식품유형 → 보관방법
    const [packaging, foodType, storage] = ['포장유형', '식품유형', '보관방법'].map((name) => screen.getByRole('combobox', { name }));
    expect(packaging.compareDocumentPosition(foodType) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(foodType.compareDocumentPosition(storage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '식품유형' }));
    const list = within(screen.getByRole('listbox'));
    expect(list.getAllByRole('option').map((el) => el.textContent)).toEqual(['선택 안 함', '복합조미식품', '소스(살균제품)']);
    fireEvent.click(list.getByRole('option', { name: '소스(살균제품)' }));
    expect(onChange).toHaveBeenCalledWith({ foodType: '002' });
  });

  it('고른 코드는 이름으로 보인다', () => {
    renderForm(vi.fn(), '001');
    expect(screen.getByRole('combobox', { name: '식품유형' })).toHaveTextContent('복합조미식품');
  });
});

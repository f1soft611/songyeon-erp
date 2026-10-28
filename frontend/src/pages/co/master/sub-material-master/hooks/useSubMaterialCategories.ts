import { useMemo } from 'react';
import { useCommonCodeOptions } from '../../../../../shared/components/common-code/useCommonCodeOptions';

// 부자재 분류 항목(2026-10-23): 공통코드 SUB_MATERIAL_CATEGORY 의 사용 중 항목. 저장은 코드(예: 001)
// name = 공통코드 이름 전체(예: '필름 — M로 입고 · 생산입고 때 빠짐'), shortName = ' — ' 앞부분(예: 필름, 서버 sub_category_nm 과 같은 규칙)
export type SubMaterialCategoryOption = { code: string; name: string; shortName: string };

export const SUB_MATERIAL_CATEGORY_GROUP = 'SUB_MATERIAL_CATEGORY';

export const subCategoryShortName = (name: string): string => name.split(' — ')[0].trim();

export function useSubMaterialCategories(): SubMaterialCategoryOption[] {
  const options = useCommonCodeOptions(SUB_MATERIAL_CATEGORY_GROUP);
  return useMemo(
    () => options.map((option) => ({ ...option, shortName: subCategoryShortName(option.name) })),
    [options],
  );
}

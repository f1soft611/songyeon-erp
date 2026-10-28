import { useEffect, useState } from 'react';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../pages/co/master/common-code/services/commonCodeManagement.service';

// 공통코드 한 묶음의 사용 중 항목 {코드, 이름}(2026-10-23). 원재료 · 부자재의 단위(UNIT) · 부자재 분류(SUB_MATERIAL_CATEGORY)가 같이 쓴다
export type CommonCodeOption = { code: string; name: string };

export function useCommonCodeOptions(groupCode: string): CommonCodeOption[] {
  const [options, setOptions] = useState<CommonCodeOption[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const groups = await fetchCommonCodeGroups();
        const group = groups.find((item) => item.groupCode === groupCode);
        if (!group) return;
        const items = await fetchCommonCodeItems(group.id);
        if (!active) return;
        setOptions(
          items
            .filter((item) => item.useAt === 'Y')
            .map((item) => ({ code: item.itemCode, name: item.itemNm })),
        );
      } catch {
        if (active) setOptions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [groupCode]);

  return options;
}

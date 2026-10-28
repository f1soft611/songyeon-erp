import { useEffect, useState } from 'react';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';

export type NoticeCategoryOption = {
  code: string;
  name: string;
};

export function useNoticeCategories() {
  const [noticeGubunOptions, setNoticeGubunOptions] = useState<
    NoticeCategoryOption[]
  >([]);
  const [selectedNoticeFilter, setSelectedNoticeFilter] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const groups = await fetchCommonCodeGroups();
        const group = groups.find((item) => item.groupCode === 'NOTICE_GUBUN');
        if (!group) return;
        const items = await fetchCommonCodeItems(group.id);
        setNoticeGubunOptions(
          items
            .filter((item) => item.useAt === 'Y')
            .map((item) => ({ code: item.itemCode, name: item.itemNm })),
        );
      } catch {
        setNoticeGubunOptions([]);
      }
    })();
  }, []);

  return {
    noticeGubunOptions,
    selectedNoticeFilter,
    setSelectedNoticeFilter,
  };
}

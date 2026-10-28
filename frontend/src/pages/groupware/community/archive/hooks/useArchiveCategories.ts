import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
} from '../../../../co/master/common-code/services/commonCodeManagement.service';
import type { CommonCodeItemRow } from '../../../../co/master/common-code/types/commonCodeManagement.types';
import type { ArchiveCategory } from '../types/archive.types';

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function useArchiveCategories() {
  const [categories, setCategories] = useState<ArchiveCategory[]>([]);
  const [groupId, setGroupId] = useState('');
  const [items, setItems] = useState<CommonCodeItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestSequence = useRef(0);

  const loadCategories = useCallback(async () => {
    const currentRequest = ++requestSequence.current;
    setIsLoading(true);
    setError(null);
    try {
      const groups = await fetchCommonCodeGroups({
        groupCode: 'WF_ARCHIVE_CATEGORY',
      });
      if (currentRequest !== requestSequence.current) {
        return;
      }
      const group = groups.find(
        (candidate) => candidate.groupCode === 'WF_ARCHIVE_CATEGORY',
      );
      if (!group || group.useAt !== 'Y') {
        throw new Error(
          'The active WF_ARCHIVE_CATEGORY common-code group is unavailable.',
        );
      }

      const groupItems = await fetchCommonCodeItems(group.id);
      if (currentRequest === requestSequence.current) {
        setGroupId(group.id);
        setItems(groupItems);
        setCategories(groupItems.map((item) => ({
          code: item.itemCode,
          name: item.itemNm,
          active: item.useAt === 'Y',
        })));
      }
    } catch (cause) {
      if (currentRequest === requestSequence.current) {
        setError(asError(cause));
      }
    } finally {
      if (currentRequest === requestSequence.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    return () => {
      requestSequence.current += 1;
    };
  }, [loadCategories]);

  return { categories, groupId, items, isLoading, error, loadCategories };
}

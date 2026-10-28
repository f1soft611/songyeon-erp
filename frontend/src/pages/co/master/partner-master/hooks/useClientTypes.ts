import { useEffect, useState } from 'react';
import { fetchClientTypes } from '../services/partnerMaster.service';
import type { ClientTypeOption } from '../types/partnerMaster.types';

// 거래처 분류 고르기 항목: 공통코드 CUSTOMER_CATEGORY 의 사용 중 항목(2026-10-23). 조회 조건 · 등록/수정 창이 같이 쓴다
export function useClientTypes(): ClientTypeOption[] {
  const [options, setOptions] = useState<ClientTypeOption[]>([]);

  useEffect(() => {
    let active = true;
    fetchClientTypes()
      .then((list) => {
        if (active) setOptions(list);
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return options;
}

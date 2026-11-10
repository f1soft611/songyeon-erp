import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLabelTemplate, listLabelTemplates } from '../../../../../shared/components/LabelPrintDialog/label.service';
import type { LabelFormatRow } from '../components/LabelFormatGrid';

// 라벨양식 화면: 양식 목록. 열면 바로 부른다. 검색줄 양식 이름은 받은 목록 안에서 거른다
export function useLabelFormats() {
  const [keyword, setKeyword] = useState('');
  const [templates, setTemplates] = useState<LabelFormatRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  // 칸 · 줄 수를 보여주려면 내용을 읽어야 해서 하나씩 더 부른다(양식은 몇 개 안 된다)
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listLabelTemplates().catch(() => []);
      const detail = await Promise.all(list.map((t) => getLabelTemplate(t.id).catch(() => null)));
      setTemplates(list.map((t, i) => ({
        id: t.id, name: t.name, size: t.size, createdAt: (t as { createdAt?: string | null }).createdAt,
        colCount: detail[i]?.layout?.cols?.length ?? 0, rowCount: detail[i]?.layout?.rows?.length ?? 0,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    const all = templates ?? [];
    return text ? all.filter((row) => (row.name ?? '').toLowerCase().includes(text)) : all;
  }, [templates, keyword]);

  return { keyword, setKeyword, rows, loading, loaded: templates != null, reload: () => void load() };
}

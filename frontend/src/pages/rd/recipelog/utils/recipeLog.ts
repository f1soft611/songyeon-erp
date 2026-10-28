// 상품개발 > 레시피 공유 로그 (송연 09-recipe.js 644~711)
// 언제 · 누가 · 어느 처리구분으로 넘겼는지를 모아 본다. '그 레시피 누구한테 넘겼더라' 를 찾으러 다니지 않게.

export type RecipeHandoff = {
  id: number;
  draftId?: number | null;
  versionId?: number | null;
  versionLabel?: string | null;
  kind?: string | null;
  quoteId?: number | null;
  requestedByName?: string | null;
  requestedByUsername?: string | null;
  createdAt?: string | null;
  draftName?: string | null;
  clientName?: string | null;
  labelRequestId?: number | null;
  labelStatus?: string | null;
  quoteStatus?: string | null;
};

export const LOG_KINDS = [
  { value: '', label: '전체' },
  { value: '확정', label: '확정' },
  { value: '견적', label: '견적' },
  { value: '기타', label: '기타' },
];

// 기간을 걸어놓고 '기록이 없다' 만 보면 정말 없는 것인지 기간 밖이라 안 보이는 것인지 모른다. 그래서 같이 알려준다
export const periodText = (start: string, end: string) => (start || end ? `${start || '처음'} ~ ${end || '오늘'}` : '전체 기간');
export const summaryText = (start: string, end: string, count: number) => (count ? `${periodText(start, end)} · ${count}건` : periodText(start, end));
export const emptyText = (start: string, end: string) => `${periodText(start, end)} 에 넘긴 기록이 없습니다`;

// 'YYYY-MM-DD HH:MM'
export const handoffTime = (createdAt: string | null | undefined) => (createdAt || '').replace('T', ' ').slice(0, 16);

// 넘긴 뒤에 그 견적이 지워졌으면 알린다. 안 그러면 로그에는 넘겼다고 남아 있는데 견적에는 없어서 넘어가다 만 것으로 보인다
export const quoteGone = (h: RecipeHandoff) => h.kind !== '기타' && h.quoteId != null && !h.quoteStatus;

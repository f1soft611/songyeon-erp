// 인사·회계 > 기초회계정보 (송연 31-acc-basic.js) — 계정과목 · 계좌 · 카드

export type AccKind = 'subject' | 'bank' | 'card';
export type AccSubject = { id: number; code: string | null; name: string | null; category?: string | null; direction?: string | null; note?: string | null; active: number; sortOrder?: number | null };
export type AccBank = { id: number; bankName: string | null; accountNo: string | null; holder?: string | null; purpose?: string | null; note?: string | null; active: number; sortOrder?: number | null };
export type AccCard = {
  id: number; issuer: string | null; last4: string | null; nickname?: string | null; holder?: string | null; bankAccountId?: number | null;
  note?: string | null; active: number; sortOrder?: number | null; payBank?: string | null; payAccountNo?: string | null;
};
export type AccRow = AccSubject | AccBank | AccCard;

export const SUBJECT_CATEGORIES = ['자산', '부채', '자본', '수익', '비용'];
export const KIND_LABEL: Record<AccKind, string> = { subject: '계정과목', bank: '계좌', card: '카드' };

// 계정과목 찾기(이름 · 코드), 사용안함 숨기기
export function filterSubjects(rows: AccSubject[], q: string, hideOff: boolean): AccSubject[] {
  const k = q.trim().toLowerCase();
  return rows.filter((r) => !(hideOff && !r.active))
    .filter((r) => !k || (r.name || '').toLowerCase().includes(k) || (r.code || '').includes(q.trim()));
}

// 늘어날 때 차변인지 대변인지는 구분에서 따라 나온다(서버와 같은 규칙. 창에서 미리 보여준다)
export const directionOf = (category: string) => (category === '자산' || category === '비용' ? '차변' : '대변');

export const cardNumberText = (last4: string | null | undefined) => `**** **** **** ${last4 || ''}`;
export const payAccountText = (c: AccCard) => (c.payBank ? `${c.payBank} ${c.payAccountNo || ''}` : '');

// 지우기 확인에 쓸 이름
export function rowName(kind: AccKind, r: AccRow): string {
  if (kind === 'subject') return `${(r as AccSubject).code} ${(r as AccSubject).name}`;
  if (kind === 'bank') return `${(r as AccBank).bankName} ${(r as AccBank).accountNo}`;
  return `${(r as AccCard).issuer} ****${(r as AccCard).last4}`;
}
export const deleteConfirmText = (name: string) =>
  `"${name}" 을(를) 지울까요?\n\n이미 쓴 적이 있다면 지우지 말고 '사용안함' 으로 내려주세요.\n지우면 이것으로 적어둔 지난 자료가 무엇이었는지 알 수 없게 됩니다.`;

// 카드 결제계좌 고르기: 사용 중인 계좌만. 사용안함으로 내린 계좌는 새로 고를 수 없되, 이미 물려 있던 것은 그대로 보이게 남긴다
export function payAccountOptions(banks: AccBank[], current: number | null | undefined) {
  return banks
    .filter((b) => b.active || (current != null && b.id === current))
    .map((b) => ({ value: b.id, label: `${b.bankName} ${b.accountNo}${b.active ? '' : ' (사용안함)'}` }));
}

// 창 입력값
export type AccForm = {
  code: string; name: string; category: string; note: string;
  bankName: string; accountNo: string; holder: string; purpose: string;
  issuer: string; last4: string; nickname: string; bankAccountId: string;
  active: boolean;
};
export const emptyAccForm = (): AccForm => ({
  code: '', name: '', category: '비용', note: '', bankName: '', accountNo: '', holder: '', purpose: '',
  issuer: '', last4: '', nickname: '', bankAccountId: '', active: true,
});
export function accFormOf(kind: AccKind, r: AccRow | null): AccForm {
  const f = emptyAccForm();
  if (!r) return f;
  f.active = Boolean(r.active);
  f.note = r.note || '';
  if (kind === 'subject') {
    const s = r as AccSubject;
    return { ...f, code: s.code || '', name: s.name || '', category: s.category || '비용' };
  }
  if (kind === 'bank') {
    const b = r as AccBank;
    return { ...f, bankName: b.bankName || '', accountNo: b.accountNo || '', holder: b.holder || '', purpose: b.purpose || '' };
  }
  const c = r as AccCard;
  return { ...f, issuer: c.issuer || '', last4: c.last4 || '', nickname: c.nickname || '', holder: c.holder || '', bankAccountId: c.bankAccountId != null ? String(c.bankAccountId) : '' };
}

// 저장할 몸통(그 탭 칸만, 앞뒤 공백 떼고)
export function accBody(kind: AccKind, f: AccForm): Record<string, unknown> {
  const active = f.active ? 1 : 0;
  if (kind === 'subject') return { code: f.code.trim(), name: f.name.trim(), category: f.category, note: f.note.trim(), active };
  if (kind === 'bank') return { bankName: f.bankName.trim(), accountNo: f.accountNo.trim(), holder: f.holder.trim(), purpose: f.purpose.trim(), note: f.note.trim(), active };
  return { issuer: f.issuer.trim(), last4: f.last4.trim(), nickname: f.nickname.trim(), holder: f.holder.trim(), bankAccountId: f.bankAccountId ? Number(f.bankAccountId) : null, note: f.note.trim(), active };
}

// 사용 켜고 끄기: 지금 값을 그대로 다시 보내면서 active 만 뒤집는다(켜고 끄는 전용 주소를 따로 두면 저장 규칙이 두 곳으로 갈라진다)
export const toggledBody = (kind: AccKind, r: AccRow) => {
  const body = accBody(kind, accFormOf(kind, r));
  return { ...body, active: r.active ? 0 : 1 };
};

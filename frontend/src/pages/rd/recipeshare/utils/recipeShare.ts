// 상품개발 > 레시피 검색·공유 (송연 09-recipe.js 523~642 · 713~812)
import { versionTag, type RecipeVersion } from '../../recipe/utils/recipe';

export type HandoffKind = '확정' | '견적' | '기타';
export const HANDOFF_KINDS: HandoffKind[] = ['확정', '견적', '기타'];

// 넘기면 어디로 가는지(송연 RECIPE_HANDOFF_WHERE)
export const HANDOFF_WHERE: Record<HandoffKind, string> = {
  확정: '영업관리 > 견적 에 가견적으로 올라갑니다. (가격은 영업이 넣습니다)',
  견적: '영업관리 > 견적 에 가견적으로 올라갑니다. (가격은 영업이 넣습니다)',
  기타: '품질관리 > 라벨등록 > 표시사항 요청 으로 올라갑니다. 확정 전에 표기사항만 먼저 만들 때 씁니다.',
};

export type RecipeShare = {
  id: number;
  draftId?: number | null;
  draftName?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  employeeDepartment?: string | null;
  expiresAt?: string | null;
  versionId?: number | null;
  versionLabel?: string | null;
  expired: boolean;
};

// '처리구분' 은 실제로 넘어간 것만(옛 분류 stages 는 이름표일 뿐이라 견적이 생기지 않았다)
export const handoffKindList = (handoffKinds: string | null | undefined) => (handoffKinds ? handoffKinds.split(',') : []);

// 버전이 하나도 없으면 넘길 것도 없다. 누르기 전에 보이게 한다
export const versionCountText = (count: number | null | undefined) => (Number(count || 0) ? `${Number(count)}개` : '없음');

// 넘기기 창의 레시피 이름
export const handoffRecipeName = (clientName: string | null | undefined, name: string | null | undefined) => `[${clientName || '미분류'}] ${name || ''}`;

// 넘기기 창 버전 고르기: 대개 가장 최근 버전을 넘기므로 최신이 맨 위, 그것을 골라둔다
export const handoffVersionOptions = (versions: RecipeVersion[]) =>
  versions.slice().reverse().map((v) => ({ value: v.id, label: `${v.versionLabel}${versionTag(v) ? ` 🔒${versionTag(v)}` : ''}` }));

// 공유 창 버전 고르기: 'test2 — 견적 (최신)'
export const shareVersionOptions = (versions: RecipeVersion[]) =>
  versions.slice().reverse().map((v, i) => ({
    value: v.id,
    label: `${v.versionLabel || `v${v.id}`}${versionTag(v) ? ` — ${versionTag(v)}` : ''}${i === 0 ? ' (최신)' : ''}`,
  }));

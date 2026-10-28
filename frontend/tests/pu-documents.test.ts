import { describe, expect, it } from 'vitest';

import {
  childFolders, deptTag, docHint, docPath, emptyText, folderCounts, folderDialogHint, folderDialogTitle, isLockedMessage, isPeeking,
  ownerOptions, shareResultText, sizeText, uploadResultText,
  type DocFolder, type DocPlace, type DocUser,
} from '../src/pages/pu/documents/utils/documentBox';

const f = (id: number, parentId: number | null, name: string, extra: Partial<DocFolder> = {}): DocFolder => ({ id, parentId, name, ...extra });
const me: DocUser = { id: '0001', name: '사원1', department: '생산부', admin: false };
const admin: DocUser = { id: '0009', name: '관리자', department: '관리', admin: true };
const place = (extra: Partial<DocPlace> = {}): DocPlace => ({ kind: '공용', currentId: null, ownerFilter: null, sharedRootId: null, ...extra });

const folders: DocFolder[] = [
  f(1, null, '생산', { rootKind: '공용', department: '생산부' }),
  f(2, 1, '위생', { rootKind: '공용' }),
  f(3, 2, '2026', { rootKind: '공용' }),
  f(4, null, '내것', { rootKind: '개인', rootOwnerId: '0001' }),
  f(5, null, '남의것', { rootKind: '개인', rootOwnerId: '0002', rootOwnerName: '사원2' }),
  f(6, 5, '보낸폴더', { rootKind: '개인', rootOwnerId: '0002', rootOwnerName: '사원2', sharedRootId: 6 }),
  f(7, 6, '안쪽', { rootKind: '개인', rootOwnerId: '0002', rootOwnerName: '사원2', sharedRootId: 6 }),
];

describe('문서함 utils(송연 28-documents.js)', () => {
  it('폴더 안: 탭(최상위 갈래) · 지금 폴더 · 개인함 주인으로 가른다. 공유받은 폴더 안은 갈래를 안 따진다', () => {
    expect(childFolders(folders, place()).map((x) => x.name)).toEqual(['생산']);
    expect(childFolders(folders, place({ currentId: 1 })).map((x) => x.name)).toEqual(['위생']);
    expect(childFolders(folders, place({ kind: '개인', ownerFilter: '0001' })).map((x) => x.name)).toEqual(['내것']);
    expect(childFolders(folders, place({ kind: '개인', ownerFilter: '0002' })).map((x) => x.name)).toEqual(['남의것']);
    expect(childFolders(folders, place({ kind: '공유', currentId: 6, sharedRootId: 6 })).map((x) => x.name)).toEqual(['안쪽']);
  });

  it('위치: 최상위부터 지금까지, 공유받은 폴더에서는 받은 폴더에서 멈춘다', () => {
    expect(docPath(folders, place({ currentId: 3 })).map((x) => x.name)).toEqual(['생산', '위생', '2026']);
    expect(docPath(folders, place({ currentId: 7, sharedRootId: 6 })).map((x) => x.name)).toEqual(['보낸폴더', '안쪽']);
    expect(docPath(folders, place())).toEqual([]);
    // 부모가 고리를 이뤄도 멈춘다
    expect(docPath([f(1, 2, 'a'), f(2, 1, 'b')], place({ currentId: 1 })).map((x) => x.name)).toEqual(['b', 'a']);
  });

  it('들여다보는 중(남의 개인함·공유받은 폴더)이면 안내가 바뀌고 손대지 못한다', () => {
    expect(isPeeking(place({ kind: '개인', ownerFilter: '0002' }), admin)).toBe(true);
    expect(isPeeking(place({ kind: '개인', ownerFilter: '0009' }), admin)).toBe(false);
    expect(isPeeking(place({ kind: '개인', ownerFilter: '0001' }), me)).toBe(false);
    expect(isPeeking(place({ sharedRootId: 6, currentId: 6 }), me)).toBe(true);
    expect(docHint(place(), me)).toBe('부서 폴더를 먼저 만들어주세요. 파일은 폴더 안에만 올릴 수 있어요.');
    expect(docHint(place({ kind: '개인' }), me)).toBe('나만 보는 문서함이에요. 폴더를 먼저 만들고 그 안에 올려주세요.');
    expect(docHint(place({ currentId: 1 }), me)).toBe('이 폴더 안에 하위폴더를 더 만들거나, 파일을 올릴 수 있어요.');
    expect(docHint(place({ kind: '개인', ownerFilter: '0002' }), admin)).toBe('남의 개인문서함을 보는 중이에요. 내려받기만 할 수 있어요.');
    expect(docHint(place({ sharedRootId: 6, currentId: 6 }), me)).toBe('공유받은 폴더예요. 내려받기만 할 수 있어요.');
    expect(emptyText(place())).toBe('만들어진 부서 폴더가 없습니다');
    expect(emptyText(place({ kind: '개인' }))).toBe('만들어둔 폴더가 없습니다');
    expect(emptyText(place({ currentId: 1 }))).toBe('이 폴더는 비어있습니다');
  });

  it('관리자의 개인함 주인 고르기: 개인함을 가진 사람 + 내 문서함', () => {
    expect(ownerOptions(folders, admin)).toEqual([{ id: '0001', name: '사원 0001' }, { id: '0002', name: '사원2' }, { id: '0009', name: '내 문서함' }]);
  });

  it('폴더 줄 표시: 최상위 공용만 부서 꼬리표(없으면 전사 공용), 잠긴 채로는 개수를 숨긴다', () => {
    expect(deptTag(folders[0])).toBe('생산부');
    expect(deptTag(f(8, null, '전사', { rootKind: '공용' }))).toBe('전사 공용');
    expect(deptTag(folders[1])).toBe('');
    expect(deptTag(folders[3])).toBe('');
    expect(folderCounts(f(1, null, 'a', { childCount: 2, fileCount: 3 }))).toBe('폴더 2 파일 3');
    expect(folderCounts(f(1, null, 'a', { childCount: 0, fileCount: 1 }))).toBe('파일 1');
    expect(folderCounts(f(1, null, 'a', { locked: true, unlocked: false, childCount: 2 }))).toBe('');
  });

  it('크기 · 창 제목 · 안내 · 결과 문구(송연 문구)', () => {
    expect(sizeText(null)).toBe('');
    expect(sizeText(512)).toBe('512 B');
    expect(sizeText(2048)).toBe('2.0 KB');
    expect(sizeText(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(folderDialogTitle([], '공용')).toBe('새 부서 폴더');
    expect(folderDialogTitle([], '개인')).toBe('새 폴더 (나만 봄)');
    expect(folderDialogTitle([folders[0], folders[1]], '공용')).toBe('새 폴더 — 위생 안에');
    expect(folderDialogHint(true, '공용', me)).toBe('생산부 사람만 볼 수 있어요.');
    expect(folderDialogHint(true, '개인', me)).toBe('나와 관리자만 볼 수 있어요.');
    expect(folderDialogHint(false, '공용', me)).toBe('');
    expect(shareResultText({ sent: 2, already: 1, noChat: [] })).toBe('2명에게 보냈어요 (이미 보낸 사람 1명은 건너뜀)');
    expect(shareResultText({ sent: 1, already: 0, noChat: ['홍길동'] })).toBe('1명에게 보냈어요 — 홍길동님은 메신저를 안 쓰셔서 알림이 안 갔어요. 따로 알려주세요');
    expect(uploadResultText(2, ['a: 빈 파일입니다'])).toBe('2개 올렸어요 (1개 실패)');
    expect(uploadResultText(1, [])).toBe('1개 올렸어요');
    expect(isLockedMessage("'생산' 폴더는 비밀번호가 걸려 있어요")).toBe(true);
    expect(isLockedMessage('이 폴더에 대한 권한이 없습니다. 관리자에게 문의해주세요.')).toBe(false);
  });
});

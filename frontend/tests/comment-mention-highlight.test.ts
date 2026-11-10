// 2026-11-04 S_ERP comment-mention-highlight 테스트. 송연은 사람 ID 가 사번 문자열이다
import { describe, expect, it } from 'vitest';
import { filterMentionCandidates, highlightMentionsInHtml, resolveSubmittedMentions } from '../src/shared/components/feed/commentMentions';

describe('highlightMentionsInHtml', () => {
  it('wraps user and @ALL mentions in a styled mention span', () => {
    const container = document.createElement('div');
    container.innerHTML = highlightMentionsInHtml('<p>@홍길동, 확인 부탁 @ALL</p>');

    const mentions = Array.from(container.querySelectorAll('span.comment-mention'))
      .map((element) => element.textContent);
    expect(mentions).toEqual(['@홍길동', '@ALL']);
    expect(container.textContent).toBe('@홍길동, 확인 부탁 @ALL');
  });

  it('does not treat e-mail addresses or link text as mentions', () => {
    const container = document.createElement('div');
    container.innerHTML = highlightMentionsInHtml(
      '<p>user@example.com <a href="https://example.com">@링크</a></p>',
    );

    expect(container.querySelectorAll('span.comment-mention')).toHaveLength(0);
  });

  it('keeps mention text as text so injected markup is not executed', () => {
    const container = document.createElement('div');
    container.innerHTML = highlightMentionsInHtml('<p>@&lt;img src=x onerror=alert(1)&gt;</p>');

    expect(container.querySelector('img')).toBeNull();
  });
});

describe('filterMentionCandidates', () => {
  const options = [
    { userId: '1', name: '홍길동', departmentName: '영업' },
    { userId: '2', name: '시스템관리자', departmentName: '전산' },
    { userId: '3', name: '관리자', departmentName: '경영지원' },
  ];

  it('narrows candidates by typed text and ranks prefix matches first', () => {
    expect(filterMentionCandidates(options, '관리').map((item) => item.kind === 'user' ? item.name : 'ALL'))
      .toEqual(['관리자', '시스템관리자']);
  });

  it('offers @ALL only for an empty query or an ALL keyword', () => {
    expect(filterMentionCandidates(options, '')[0]).toEqual({ kind: 'all' });
    expect(filterMentionCandidates(options, 'al')[0]).toEqual({ kind: 'all' });
    expect(filterMentionCandidates(options, '전')[0]).toEqual({ kind: 'all' });
    expect(filterMentionCandidates(options, '홍').some((item) => item.kind === 'all')).toBe(false);
  });

  it('matches department names too', () => {
    expect(filterMentionCandidates(options, '영업').map((item) => item.kind === 'user' && item.userId)).toEqual(['1']);
  });
});

describe('resolveSubmittedMentions', () => {
  const options = [
    { userId: '1', name: '문서작성 테스트 사용자 01' },
    { userId: '3', name: '문서작성 테스트 사용자 03' },
    { userId: '7', name: '관리자' },
  ];

  it('drops selected users whose mention text was removed before submit', () => {
    expect(resolveSubmittedMentions('@문서작성 테스트 사용자 01 확인 부탁', ['3', '1'], options, false))
      .toEqual({ mentionedUserIds: ['1'], mentionAll: false });
  });

  it('keeps @ALL only while the text still contains it', () => {
    expect(resolveSubmittedMentions('모두 확인', [], options, true))
      .toEqual({ mentionedUserIds: [], mentionAll: false });
    expect(resolveSubmittedMentions('@ALL 확인', [], options, true))
      .toEqual({ mentionedUserIds: [], mentionAll: true });
  });
});

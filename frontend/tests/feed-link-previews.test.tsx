import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { FeedLinkPreviews } from '../src/shared/components/feed/FeedLinkPreviews';
import { ContentDetailContext } from '../src/shared/components/feed/ContentDetailContext';

vi.mock('../src/pages/groupware/shared/components/SharedContentDetailPanel', () => ({
  default: ({ target, onClose }: {
    target: { kind: string; id: number };
    onClose: () => void;
  }) => (
    <section aria-label="공유 콘텐츠 상세">
      {target.kind}:{target.id}
      <button onClick={onClose}>상세 닫기</button>
    </section>
  ),
}));

const token = (letter: string) => `v1.${letter.repeat(59)}`;
const docUrl = `${window.location.origin}/groupware/doc/write?share=${token('A')}`;
const noticeUrl = `${window.location.origin}/groupware/community/notice?share=${token('B')}`;

describe('shared feed link previews', () => {
  it('renders distinct document, notice, and external cards and opens each target', async () => {
    const onOpenDocument = vi.fn();
    const onOpenNotice = vi.fn();
    const documentResolver = vi.fn().mockResolvedValue({
      id: 21, title: '공유 문서', description: '문서 설명', subtitle: '업무연락',
    });
    const noticeResolver = vi.fn().mockResolvedValue({
      id: 34, title: '공유 공지', description: '공지 설명', subtitle: '운영',
    });
    const externalResolver = vi.fn().mockResolvedValue({
      siteName: 'Example', title: '웹 OG', description: '웹 설명',
      imageUrl: null,
    });

    render(
      <FeedLinkPreviews
        html={`<a href="${docUrl}">doc</a><a href="${noticeUrl}">notice</a>
          <a href="https://example.com/post">web</a>`}
        resolveDocument={documentResolver}
        resolveNotice={noticeResolver}
        resolveExternal={externalResolver}
        onOpenDocument={onOpenDocument}
        onOpenNotice={onOpenNotice}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '문서 상세 열기: 공유 문서' }));
    fireEvent.click(screen.getByRole('button', { name: '공지 상세 열기: 공유 공지' }));
    expect(screen.getByRole('link', { name: '외부 링크 열기: 웹 OG' })).toHaveAttribute(
      'target', '_blank',
    );
    expect(screen.getByText('시스템 문서')).toBeInTheDocument();
    expect(screen.getByText('공지사항')).toBeInTheDocument();
    expect(screen.queryByText('웹 링크', { exact: true })).not.toBeInTheDocument();
    expect(onOpenDocument).toHaveBeenCalledWith(21);
    expect(onOpenNotice).toHaveBeenCalledWith(34);
    expect(documentResolver).toHaveBeenCalledWith(token('A'));
    expect(noticeResolver).toHaveBeenCalledWith(token('B'));
    expect(externalResolver).toHaveBeenCalledWith('https://example.com/post');
  });

  it.each(['document', 'notice'] as const)(
    'opens a %s preview without a callback in the common panel and preserves the source URL',
    async (kind) => {
      const sourceUrl = window.location.href;
      render(
        <FeedLinkPreviews
          html={kind === 'notice' ? noticeUrl : docUrl}
          resolveDocument={vi.fn().mockResolvedValue({
            id: 21, title: '공유 문서', description: '', subtitle: '',
          })}
          resolveNotice={vi.fn().mockResolvedValue({
            id: 34, title: '공유 공지', description: '', subtitle: '',
          })}
          resolveExternal={vi.fn()}
        />,
      );

      const name = kind === 'notice' ? '공지 상세 열기: 공유 공지' : '문서 상세 열기: 공유 문서';
      const card = await screen.findByRole('button', { name });
      expect(card).not.toHaveAttribute('href');
      fireEvent.click(card);
      expect(await screen.findByRole('region', { name: '공유 콘텐츠 상세' })).toHaveTextContent(
        `${kind}:${kind === 'notice' ? 34 : 21}`,
      );
      expect(window.location.href).toBe(sourceUrl);
      fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
      expect(screen.queryByRole('region', { name: '공유 콘텐츠 상세' })).not.toBeInTheDocument();
    },
  );

  it('replaces the enclosing panel target rather than opening another panel or calling the source page', async () => {
    const openContent = vi.fn();
    const onOpenNotice = vi.fn();
    render(
      <ContentDetailContext.Provider value={openContent}>
        <FeedLinkPreviews
          html={noticeUrl}
          resolveDocument={vi.fn()}
          resolveNotice={vi.fn().mockResolvedValue({
            id: 34, title: '공유 공지', description: '', subtitle: '',
          })}
          onOpenNotice={onOpenNotice}
        />
      </ContentDetailContext.Provider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: '공지 상세 열기: 공유 공지' }));
    expect(openContent).toHaveBeenCalledWith({ kind: 'notice', id: 34 });
    expect(onOpenNotice).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: '공유 콘텐츠 상세' })).not.toBeInTheDocument();
  });
});

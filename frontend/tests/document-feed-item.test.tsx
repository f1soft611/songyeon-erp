import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { DocumentFeedItem } from '../src/pages/groupware/documents/write/components/DocumentFeedItem';
import type {
  DocumentApprovalDetail,
  DocumentFeedWriteItem,
} from '../src/pages/groupware/documents/write/types/documentWrite.types';

vi.mock('../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed', () => ({
  DocumentApprovalDetailFeed: ({
    feedItem,
  }: {
    feedItem: DocumentFeedWriteItem;
  }) => (
    <div data-testid="mock-document-detail">
      {feedItem.title}:{feedItem.feedData.contentsHtml}
    </div>
  ),
}));

const item: DocumentFeedWriteItem = {
  id: 1,
  title: '문서 제목',
  kind: '기안서',
  status: '임시저장',
  author: '관리자',
  date: '2026.10.12',
  summary: '문서 요약',
  feedData: {
    electronicApprovalId: 1,
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'DRAFT',
    title: '문서 제목',
    drafterName: '관리자',
    summary: '문서 요약',
    viewCount: 0,
    isDrafter: true,
    draftingWorkCategoryId: null,
    contentsJson: '{"type":"doc","content":[]}',
    contentsHtml: '<p>선조회 본문</p>',
    contentsText: '선조회 본문',
    approvalLines: [],
    attachments: [],
    systemEvents: [],
    comments: [],
    commentCount: 0,
    hasPreviousComments: false,
    nextBeforeCommentId: null,
  },
};

describe('DocumentFeedItem', () => {
  it('mounts its complete detail card immediately from the preloaded list record', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <DocumentFeedItem
          item={item}
          detailRefreshToken={0}
          onActionComplete={() => undefined}
          onEditDocument={(_detail: DocumentApprovalDetail) => undefined}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('mock-document-detail')).toHaveTextContent(
      '문서 제목:<p>선조회 본문</p>',
    );
  });
});

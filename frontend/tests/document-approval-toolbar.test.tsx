import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { DocumentApprovalToolbar } from '../src/pages/groupware/documents/write/components/DocumentApprovalToolbar';

describe('DocumentApprovalToolbar', () => {
  it('renders available slots in the approved order with a 4px column gap', () => {
    render(
      <DocumentApprovalToolbar
        approvalActions={<button type="button">승인 액션</button>}
        status={<span style={{ marginRight: 4 }}>결재상태</span>}
        pinControl={
          <button type="button" style={{ marginLeft: 4 }}>
            상단고정
          </button>
        }
        moreMenu={<button type="button">더보기</button>}
        documentKind={<span>문서구분</span>}
      />,
    );

    const toolbar = screen.getByTestId('document-approval-toolbar');
    const status = within(toolbar).getByText('결재상태');
    const divider = within(toolbar).getByRole('separator');
    const pin = within(toolbar).getByRole('button', { name: '상단고정' });
    const more = within(toolbar).getByRole('button', { name: '더보기' });
    const orderedElements = [
      within(toolbar).getByRole('button', { name: '승인 액션' }),
      status,
      within(toolbar).getByText('문서구분'),
      divider,
      pin,
      more,
    ];

    expect(getComputedStyle(toolbar).columnGap).toBe('4px');
    expect(getComputedStyle(divider).height).toBe('20px');
    expect(getComputedStyle(divider).alignSelf).toBe('center');
    expect(getComputedStyle(status).marginRight).toBe('4px');
    expect(getComputedStyle(pin).marginLeft).toBe('4px');
    expect(pin.nextElementSibling).toBe(more);
    for (let index = 0; index < orderedElements.length - 1; index += 1) {
      const current = orderedElements[index];
      const next = orderedElements[index + 1];
      if (!current || !next) throw new Error('Missing toolbar slot.');
      expect(
        current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0);
    }
  });

  it('keeps the divider after the document kind and before pin when optional slots are empty', () => {
    render(
      <DocumentApprovalToolbar
        status={<span>결재상태</span>}
        pinControl={<button type="button">상단고정</button>}
        documentKind={<span>문서구분</span>}
      />,
    );

    const toolbar = screen.getByTestId('document-approval-toolbar');
    const status = within(toolbar).getByText('결재상태');
    const documentKind = within(toolbar).getByText('문서구분');
    const divider = within(toolbar).getByRole('separator');
    const pin = within(toolbar).getByRole('button', { name: '상단고정' });

    expect(within(toolbar).queryByRole('button', { name: '승인 액션' })).toBeNull();
    expect(within(toolbar).queryByRole('button', { name: '더보기' })).toBeNull();
    expect(
      status.compareDocumentPosition(documentKind) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      documentKind.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      divider.compareDocumentPosition(pin) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
  });
});

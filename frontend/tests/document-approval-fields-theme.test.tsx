import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { DocumentApprovalFields } from '../src/pages/groupware/documents/write/components/DocumentApprovalFields';
import type { DocumentApprovalStage } from '../src/pages/groupware/documents/write/types/documentWrite.types';
import { createAppTheme } from '../src/theme/theme';

const agreementUser = {
  value: 'agreement-user',
  label: '합의 사용자',
  positionName: '대리',
};

const approvalStages: DocumentApprovalStage[] = [
  { id: 1, kind: 'agreement', users: [agreementUser] },
];

function renderAgreementChip(mode: 'light' | 'dark') {
  return render(
    <ThemeProvider theme={createAppTheme(mode)}>
      <DocumentApprovalFields
        userOptions={[agreementUser]}
        selectedApprovalUserIds={[]}
        referenceUserIds={[]}
        approvalStages={approvalStages}
        onApprovalUserChange={vi.fn()}
        onReferenceUserChange={vi.fn()}
        onAddApproval={vi.fn()}
        onAddAgreement={vi.fn()}
        onRemoveApprovalUser={vi.fn()}
      />
    </ThemeProvider>,
  );
}

describe('DocumentApprovalFields theme', () => {
  it('keeps the agreement chip background transparent in light mode', () => {
    renderAgreementChip('light');

    const chip = screen.getByTestId('document-agreement-chip');

    expect(getComputedStyle(chip).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(chip).borderColor).toBe('rgb(224, 224, 224)');
  });

  it('keeps the agreement chip background transparent in dark mode', () => {
    renderAgreementChip('dark');

    const chip = screen.getByTestId('document-agreement-chip');

    expect(getComputedStyle(chip).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(chip).borderColor).toBe('rgba(255, 255, 255, 0.12)');
    expect(getComputedStyle(screen.getByText('합의 사용자')).color).toBe(
      'rgb(226, 232, 240)',
    );
  });

  it('centers the agreement row label and removes the label top padding', () => {
    renderAgreementChip('light');

    expect(
      getComputedStyle(screen.getByTestId('document-agreement-display-row'))
        .alignItems,
    ).toBe('center');
    expect(getComputedStyle(screen.getByText('합의')).paddingTop).toBe('0');
  });
});

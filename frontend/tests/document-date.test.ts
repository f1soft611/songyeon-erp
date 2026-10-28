import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { ApprovalNoticePanel } from '../src/pages/groupware/documents/write/components/ApprovalNoticePanel';
import { getDocumentDisplayDate } from '../src/pages/groupware/documents/write/data/documentDate';
import type { DocumentWriteItem } from '../src/pages/groupware/documents/write/types/documentWrite.types';

describe('getDocumentDisplayDate', () => {
  it.each([
    {
      fields: {
        submittedAt: '2026-10-14',
        updatedAt: '2026-10-15',
        createdAt: '2026-10-12',
      },
      expected: { value: '2026-10-14', sourceLabel: '상신일' },
    },
    {
      fields: {
        submittedAt: null,
        updatedAt: '2026-10-15',
        createdAt: '2026-10-12',
      },
      expected: { value: '2026-10-15', sourceLabel: '수정일' },
    },
    {
      fields: {
        submittedAt: '',
        updatedAt: null,
        createdAt: '2026-10-12',
      },
      expected: { value: '2026-10-12', sourceLabel: '작성일' },
    },
    {
      fields: {
        submittedAt: '',
        updatedAt: '',
        createdAt: null,
      },
      expected: { value: '' },
    },
  ])('selects the first available date from $fields', ({ fields, expected }) => {
    expect(getDocumentDisplayDate(fields)).toEqual(expected);
  });

  it.each([
    { date: '2026.10.15', dateSourceLabel: '수정일', submittedDate: '' },
    { date: '', dateSourceLabel: undefined, submittedDate: '' },
  ])('shows the selected source and date in the notice panel', ({
    date,
    dateSourceLabel,
    submittedDate,
  }) => {
    const item: DocumentWriteItem = {
      id: 1,
      title: '알림 문서',
      kind: '기안서',
      status: '결재진행중',
      author: '기안자',
      date,
      dateSourceLabel,
      submittedDate,
      summary: '',
    };

    render(
      createElement(
        ThemeProvider,
        { theme: createTheme() },
        createElement(ApprovalNoticePanel, {
          items: [item],
          onSelect: () => undefined,
        }),
      ),
    );

    expect(screen.getByText(dateSourceLabel ?? '일자')).toBeInTheDocument();
    expect(screen.getByText(date || '—')).toBeInTheDocument();
  });
});

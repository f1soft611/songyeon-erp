import { describe, expect, it } from 'vitest';
import { getNoticeCategoryPresentation } from '../src/pages/groupware/community/notice/data/noticeCategoryPresentation';

describe('getNoticeCategoryPresentation', () => {
  it('returns stable theme colors for a trimmed category code', () => {
    const first = getNoticeCategoryPresentation('  NOTICE_A  ', false);
    const repeated = getNoticeCategoryPresentation('NOTICE_A', false);

    expect(first).toEqual(repeated);
    expect(first.backgroundColor).toMatch(/^hsl\(\d+, 75%, 42%\)$/);
  });

  it('assigns different colors to representative category codes', () => {
    const first = getNoticeCategoryPresentation('NOTICE_A', false);
    const second = getNoticeCategoryPresentation('HR', false);

    expect(first).not.toEqual(second);
  });

  it('generates colors for an unregistered category code in dark mode', () => {
    const presentation = getNoticeCategoryPresentation(
      'TENANT_SPECIFIC_CATEGORY',
      true,
    );

    expect(presentation.backgroundColor).toMatch(/^hsl\(\d+, 65%, 55%\)$/);
    expect(presentation).toEqual(
      getNoticeCategoryPresentation(' TENANT_SPECIFIC_CATEGORY ', true),
    );
  });

  it.each([undefined, null, '', '   '])(
    'uses the filled primary fallback for a missing category code (%s)',
    (code) => {
      expect(getNoticeCategoryPresentation(code, false)).toEqual({
        backgroundColor: '#1d4ed8',
      });
    },
  );

  it('uses the filled dark primary fallback for a missing category code', () => {
    expect(getNoticeCategoryPresentation('   ', true)).toEqual({
      backgroundColor: '#60a5fa',
    });
  });
});

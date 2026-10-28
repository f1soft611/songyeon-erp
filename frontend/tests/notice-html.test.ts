import { describe, expect, it } from 'vitest';
import {
  prepareNoticeFeedHtml,
  sanitizeNoticeBodyHtml,
} from '../src/pages/groupware/community/notice/utils/noticeHtml';

describe('notice HTML rendering', () => {
  it('preserves safe typography when sanitizing a notice body without adding a wrapper', () => {
    const result = sanitizeNoticeBodyHtml(
      '<p><span style="font-family:Arial;font-size:10pt;color:#123456">공지</span></p><table><tbody><tr><td>셀</td></tr></tbody></table>',
    );

    expect(result).toContain(
      '<span style="font-family:Arial;font-size:10pt;color:#123456">공지</span>',
    );
    expect(result).toContain('<table>');
    expect(result).not.toContain('tableWrapper');
  });

  it('wraps feed tables once and retains safe typography', () => {
    const result = prepareNoticeFeedHtml(
      '<p><span style="font-family:Arial;font-size:10pt">공지</span></p><table><tbody><tr><td>셀</td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(result, 'text/html');

    expect(document.querySelectorAll('.tableWrapper')).toHaveLength(1);
    expect(document.querySelector('.tableWrapper > table')).not.toBeNull();
    expect(document.querySelector('span')?.getAttribute('style')).toBe(
      'font-family:Arial;font-size:10pt',
    );
  });

  it('keeps the Excel font family and point size through save and feed rendering', () => {
    const savedHtml = sanitizeNoticeBodyHtml(
      '<table><tbody><tr><td style="font-family:&quot;맑은 고딕&quot;, monospace;font-size:22pt;font-weight:700;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere">헤더</td></tr></tbody></table>',
    );
    const feedDocument = new DOMParser().parseFromString(
      prepareNoticeFeedHtml(savedHtml),
      'text/html',
    );
    const cell = feedDocument.querySelector('td');

    expect(cell?.style.getPropertyValue('font-family')).toBe(
      '"맑은 고딕", monospace',
    );
    expect(cell?.style.getPropertyValue('font-size')).toBe('22pt');
    expect(cell?.style.getPropertyValue('font-weight')).toBe('700');
    expect(cell?.style.getPropertyValue('white-space')).toBe('pre-wrap');
    expect(cell?.style.getPropertyValue('word-break')).toBe('break-all');
    expect(cell?.style.getPropertyValue('overflow-wrap')).toBe('anywhere');
  });

  it('removes server pretty-print whitespace after table line breaks in feed rendering', () => {
    const result = prepareNoticeFeedHtml(
      '<table><tbody><tr><td><p><strong>중요관리점모니터링 일지<br>\n       [X-ray 금속검출공정]</strong></p>' +
        '<p>* 기기 감도<br>\n      - 표준시편을 통과시킨다.<br>\n      이어지는 설명</p></td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(result, 'text/html');
    const paragraphs = Array.from(document.querySelectorAll('td p'));

    expect(paragraphs[0].innerHTML).toContain(
      '중요관리점모니터링 일지<br>[X-ray 금속검출공정]',
    );
    expect(paragraphs[1].innerHTML).toContain(
      '* 기기 감도<br>- 표준시편을 통과시킨다.<br>이어지는 설명',
    );
  });

  it('preserves inline Excel font color through notice save and feed rendering', () => {
    const savedHtml = sanitizeNoticeBodyHtml(
      '<table><tbody><tr><td><p><span style="color:#ff0000;font-family:Arial;font-size:10pt">색상 문구</span></p></td></tr></tbody></table>',
    );
    const feedDocument = new DOMParser().parseFromString(
      prepareNoticeFeedHtml(savedHtml),
      'text/html',
    );
    const styledText = feedDocument.querySelector('td span');

    expect(styledText?.textContent).toBe('색상 문구');
    expect(styledText?.style.color).toBe('rgb(255, 0, 0)');
    expect(styledText?.style.fontFamily).toBe('Arial');
    expect(styledText?.style.fontSize).toBe('10pt');
  });

  it('removes unsafe markup and does not duplicate wrappers for nested tables', () => {
    const result = prepareNoticeFeedHtml(
      '<script>alert(1)</script><table><tbody><tr><td>바깥<table><tbody><tr><td>안쪽</td></tr></tbody></table></td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(result, 'text/html');

    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
    expect(document.querySelectorAll('.tableWrapper')).toHaveLength(1);
    expect(
      document.querySelectorAll('.tableWrapper .tableWrapper'),
    ).toHaveLength(0);
  });
});

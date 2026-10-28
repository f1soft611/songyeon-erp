import { describe, expect, it } from 'vitest';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../src/shared/components/rich-text-editor/clipboard';

describe('notice clipboard normalization', () => {
  it('normalizes embedded cell styles without mutating the global document head', () => {
    const initialHeadStyles = Array.from(
      document.head.querySelectorAll('style'),
    );
    const headObserver = new MutationObserver(() => undefined);
    headObserver.observe(document.head, { childList: true });

    try {
      const normalized = normalizeClipboardHtmlForEditor(
        '<style>td { color: red; }</style><table><tbody><tr><td>업무</td></tr></tbody></table>',
      );
      const headMutations = headObserver
        .takeRecords()
        .flatMap((record) => [
          ...Array.from(record.addedNodes),
          ...Array.from(record.removedNodes),
        ])
        .filter((node) => node instanceof HTMLStyleElement);

      expect(normalized).toContain('<td style="color:red">업무</td>');
      expect(Array.from(document.head.querySelectorAll('style'))).toEqual(
        initialHeadStyles,
      );
      expect(headMutations).toHaveLength(0);
    } finally {
      headObserver.disconnect();
    }
  });

  it('preserves spreadsheet table rows while removing unsafe markup', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<script>alert(1)</script><table><tbody><tr><td>업무</td><td>담당</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<table>');
    expect(normalized).toContain('<tr><td>업무</td><td>담당</td></tr>');
    expect(normalized).not.toContain('<script');
    expect(normalized).not.toContain('alert(1)');
  });

  it('preserves single line breaks within spreadsheet cells', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td>첫 줄<br>둘째 줄</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td>첫 줄<br>둘째 줄</td>');
  });

  it('preserves Excel line breaks and indentation without interpreting markers', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td><p>중요관리점(CCP-2P)모니터링<br>일지<br>[X-ray 금속검출공정]</p><p>* 기기 감도<br>   - 표준시편을 통과시킨다.<br>검출 여부를 기록한다.<br>* 제품 감도</p></td></tr></tbody></table>',
    );

    expect(normalized).toBe(
      '<table><tbody><tr><td><p>중요관리점(CCP-2P)모니터링<br>일지<br>[X-ray 금속검출공정]</p>' +
        '<p>* 기기 감도<br>   - 표준시편을 통과시킨다.<br>검출 여부를 기록한다.<br>* 제품 감도</p></td></tr></tbody></table>',
    );
  });

  it('preserves line breaks carried by whitespace-only text nodes inside a cell', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td>첫 줄<span></span>\n둘째 줄</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td>첫 줄<br>둘째 줄</td>');
  });

  it('preserves paragraph boundaries within spreadsheet cells', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td><p>첫 문단</p><p>둘째 문단</p></td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td><p>첫 문단</p><p>둘째 문단</p></td>');
  });

  it('preserves safe Excel font styles and emphasis markup', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      `<style>.excel-cell { font-family: Arial; font-size: 10pt; }</style><table><tbody><tr><td class="excel-cell"><span style="font-family: 'Malgun Gothic'; font-size: 8pt; color: #ff0000;"><strong>굵게</strong> <em>기울임</em></span></td></tr></tbody></table>`,
    );

    expect(normalized).toContain('font-family:Arial');
    expect(normalized).toContain('font-size:10pt');
    expect(normalized).toContain('<span');
    expect(normalized).toContain('font-family:');
    expect(normalized).toContain('font-size:8pt');
    expect(normalized).toContain('<strong>굵게</strong>');
    expect(normalized).toContain('<em>기울임</em>');
  });

  it('preserves Excel cell font and line-wrapping styles', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td style="font-family:Arial;font-size:10pt;white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere">긴 문장</td></tr></tbody></table>',
    );
    const cell = new DOMParser()
      .parseFromString(normalized, 'text/html')
      .querySelector('td');

    expect(cell?.style.fontFamily).toBe('Arial');
    expect(cell?.style.fontSize).toBe('10pt');
    expect(cell?.style.whiteSpace).toBe('pre-wrap');
    expect(cell?.style.wordBreak).toBe('break-all');
    expect(cell?.style.overflowWrap).toBe('anywhere');
  });

  it('preserves safe font family and size in non-table rich HTML', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<p>본문 <span style="font-family:Arial;font-size:14pt;color:#123456">강조</span></p>',
    );
    const editorDocument = new DOMParser().parseFromString(
      normalized,
      'text/html',
    );
    const styledText = editorDocument.querySelector('span');

    expect(styledText).not.toBeNull();
    expect(styledText?.style.fontFamily).toBe('Arial');
    expect(styledText?.style.fontSize).toBe('14pt');
    expect(styledText?.style.color).toBe('rgb(18, 52, 86)');
  });

  it('converts legacy font face and size attributes when pasting non-table HTML', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<p><font face="Arial" size="5">큰 글자</font></p>',
    );
    const editorDocument = new DOMParser().parseFromString(
      normalized,
      'text/html',
    );
    const styledText = editorDocument.querySelector('span');

    expect(styledText?.textContent).toBe('큰 글자');
    expect(styledText?.style.fontFamily).toBe('Arial');
    expect(styledText?.style.fontSize).toBe('18pt');
  });

  it('moves block-level font family and size onto inline text during paste', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<p style="font-family:Arial;font-size:14pt;color:#123456">블록 서식</p>',
    );
    const editorDocument = new DOMParser().parseFromString(
      normalized,
      'text/html',
    );
    const styledText = editorDocument.querySelector('p > span');

    expect(styledText?.textContent).toBe('블록 서식');
    expect(styledText?.style.fontFamily).toBe('Arial');
    expect(styledText?.style.fontSize).toBe('14pt');
    expect(styledText?.style.color).toBe('rgb(18, 52, 86)');
  });

  it('maps Excel column widths onto Tiptap table cell column widths', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><colgroup><col style="width:15pt"><col style="width:30px"><col width="40"></colgroup><tbody><tr><td rowspan="2">A</td><td colspan="2">B</td></tr><tr><td>C</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td rowspan="2" colwidth="20">A</td>');
    expect(normalized).toContain('<td colspan="2" colwidth="30,40">B</td>');
    expect(normalized).toContain('<td colwidth="30">C</td>');
  });

  it('places a colspan after the full range is checked against rowspans', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><colgroup><col width="10"><col width="20"><col width="30"><col width="40"></colgroup><tbody><tr><td>A</td><td rowspan="2">B</td><td>C</td></tr><tr><td colspan="2">D</td></tr></tbody></table>',
    );

    expect(normalized).toContain('<td rowspan="2" colwidth="20">B</td>');
    expect(normalized).toContain('<td colspan="2" colwidth="30,40">D</td>');
  });

  it('synchronizes quoted plain-text cell lines with the matching merged HTML cells', () => {
    const html =
      '<table><colgroup><col width="10"><col width="20"><col width="30"><col width="40"></colgroup><tbody>' +
      '<tr><td colspan="2"><p>제목 첫 줄<br>전체<br><br>X-ray 줄</p></td><td>1호기</td><td>2호기</td></tr>' +
      '<tr><td>방법</td><td colspan="3"><p>* 기기 감도<br> - 표준시편을 통과시킨다. 이어지는 문장<br>* 제품 감도</p></td></tr></tbody></table>';
    const plainText =
      '"제목 첫 줄 전체\nX-ray 줄"\t\t1호기\t2호기\r\n방법\t"* 기기 감도\n - 표준시편을 통과시킨다. 이어지는 문장\n* 제품 감도"\t\t';

    const normalized = normalizeClipboardHtmlForEditor(html, plainText);
    const document = new DOMParser().parseFromString(normalized, 'text/html');
    const rows = Array.from(document.querySelectorAll('table tr'));

    expect(rows[0].querySelector('td')?.getAttribute('colspan')).toBe('2');
    expect(rows[0].querySelector('td')?.getAttribute('colwidth')).toBe('10,20');
    expect(rows[0].querySelector('td p')?.innerHTML).toBe(
      '제목 첫 줄 전체<br>X-ray 줄',
    );
    expect(rows[1].querySelectorAll('td')[1]?.getAttribute('colspan')).toBe(
      '3',
    );
    expect(rows[1].querySelectorAll('td')[1]?.getAttribute('colwidth')).toBe(
      '20,30,40',
    );
    expect(
      rows[1].querySelectorAll('td')[1]?.querySelector('p')?.innerHTML,
    ).toBe(
      '* 기기 감도<br> - 표준시편을 통과시킨다. 이어지는 문장<br>* 제품 감도',
    );
  });

  it('keeps HTML cell text when the plain-text grid has different characters', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td>HTML 원문</td></tr></tbody></table>',
      'plain text\t',
    );

    expect(normalized).toContain('<td>HTML 원문</td>');
  });

  it('preserves inline Excel font colors when synchronizing plain-text breaks', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td><p><span style="color:#ff0000">색상 표기</span><br>다음 줄</p></td></tr></tbody></table>',
      '"색상 표기\n다음 줄"',
    );

    expect(normalized).toContain(
      '<span style="color:rgb(255, 0, 0)">색상 표기</span><br>다음 줄',
    );
  });

  it('does not count nested table cells as cells in the outer row', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td>외부 A<table><tbody><tr><td>내부 A</td><td>내부 B</td></tr></tbody></table></td><td>외부 B</td></tr><tr><td>다음</td><td>행</td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(normalized, 'text/html');
    const outerTable = document.querySelector('table');
    const outerRows = Array.from(
      outerTable?.querySelectorAll('tr') ?? [],
    ).filter((row) => row.closest('table') === outerTable);
    const firstRowCells = Array.from(
      outerRows[0]?.querySelectorAll('td, th') ?? [],
    ).filter((cell) => cell.parentElement === outerRows[0]);

    expect(outerRows).toHaveLength(2);
    expect(firstRowCells).toHaveLength(2);
    expect(firstRowCells.map((cell) => cell.textContent)).toEqual([
      '외부 A내부 A내부 B',
      '외부 B',
    ]);
  });

  it('preserves plain clipboard tabs and normalizes only line endings', () => {
    expect(normalizeClipboardTextForEditor('첫째\t둘째\r\n셋째\t넷째')).toBe(
      '첫째\t둘째\n셋째\t넷째',
    );
  });

  it('detects spreadsheet HTML and tabular plain text', () => {
    expect(
      hasSpreadsheetClipboardContent({
        getData: (type) => (type === 'text/html' ? '<table></table>' : ''),
      } as DataTransfer),
    ).toBe(true);
    expect(
      hasSpreadsheetClipboardContent({
        getData: (type) =>
          type === 'text/plain' ? '첫째\t둘째\n셋째\t넷째' : '',
      } as DataTransfer),
    ).toBe(true);
    expect(
      hasSpreadsheetClipboardContent({
        getData: (type) => (type === 'text/plain' ? '일반 문장' : ''),
      } as DataTransfer),
    ).toBe(false);
    expect(hasSpreadsheetClipboardContent(null)).toBe(false);
  });

  it('preserves empty rows before footer cells covered by a rowspan', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><tbody><tr><td rowspan="3">개선조치 방법</td><td rowspan="3">조치 내용</td></tr><tr></tr><tr></tr><tr><td>이탈일자</td><td>이탈사항</td></tr></tbody></table>',
    );
    const document = new DOMParser().parseFromString(normalized, 'text/html');
    const rows = Array.from(document.querySelectorAll('table tr'));

    expect(rows).toHaveLength(4);
    expect(rows[1].querySelector('td')).toBeNull();
    expect(rows[2].querySelector('td')).toBeNull();
    expect(rows[3].textContent).toContain('이탈일자');
  });
});

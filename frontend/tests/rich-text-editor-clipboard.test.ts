import { describe, expect, it } from 'vitest';
import {
  hasSpreadsheetClipboardContent,
  normalizeClipboardHtmlForEditor,
  normalizeClipboardTextForEditor,
} from '../src/shared/components/rich-text-editor/clipboard';

describe('shared rich text editor clipboard normalization', () => {
  it('preserves spreadsheet rows, spans, cell line breaks, and safe styles', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<script>alert(1)</script><table><tbody><tr><td rowspan="2" style="color:red"><strong>첫 줄<br>둘째 줄</strong></td><td colspan="2">표</td></tr><tr><td>끝</td></tr></tbody></table>',
    );

    expect(normalized).toContain(
      '<tr><td rowspan="2" style="color:red"><strong>첫 줄<br>둘째 줄</strong></td><td colspan="2">표</td></tr>',
    );
    expect(normalized).toContain('<tr><td>끝</td></tr>');
    expect(normalized).not.toContain('<script');
    expect(normalized).not.toContain('alert(1)');
  });

  it('keeps Excel column widths and nested table cell boundaries', () => {
    const normalized = normalizeClipboardHtmlForEditor(
      '<table><colgroup><col style="width:15pt"><col style="width:30px"></colgroup><tbody><tr><td>외부<table><tbody><tr><td>내부</td></tr></tbody></table></td><td>바깥</td></tr></tbody></table>',
    );

    expect(normalized).toContain('colwidth="20"');
    expect(normalized).toContain('colwidth="30"');
    expect(normalized).toContain(
      '<table><tbody><tr><td>내부</td></tr></tbody></table>',
    );
  });

  it('normalizes plain text and detects tabular clipboard content', () => {
    expect(normalizeClipboardTextForEditor('가\t나\r\n다\t라')).toBe(
      '가 | 나\n다 | 라',
    );
    expect(
      hasSpreadsheetClipboardContent({
        getData: (type) => (type === 'text/plain' ? '가\t나\n다\t라' : ''),
      } as DataTransfer),
    ).toBe(true);
  });
});

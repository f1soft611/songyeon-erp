import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../src/shared/utils/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes event handlers, unsafe URLs and executable elements', () => {
    const result = sanitizeHtml(
      '<p onclick="alert(1)">안전<a href="javascript:alert(1)">링크</a><a href="data:text/html,evil">데이터</a></p><svg><script>alert(1)</script></svg>',
    );

    expect(result).toContain(
      '<p>안전<a rel="noopener noreferrer" target="_blank">링크</a><a rel="noopener noreferrer" target="_blank">데이터</a></p>',
    );
    expect(result).not.toMatch(/onclick|javascript:|data:|<svg|<script/i);
  });

  it('keeps safe HTTP links and strips unapproved markup', () => {
    const result = sanitizeHtml(
      '<div><a href="https://example.com" style="color:red">외부 링크</a></div>',
    );

    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).not.toContain('<div');
    expect(result).not.toContain('style=');
  });

  it('rejects protocol-relative and unsupported URL schemes', () => {
    const result = sanitizeHtml(
      '<p><a href="//evil.example/path">host</a><a href="ftp://evil.example/file">ftp</a><a href="vbscript:msgbox(1)">script</a><a href="/local/path">local</a></p>',
    );

    expect(result).not.toContain('href="//evil.example/path"');
    expect(result).not.toContain('href="ftp://evil.example/file"');
    expect(result).not.toContain('href="vbscript:msgbox(1)"');
    expect(result).toContain('href="/local/path"');
  });
  it('preserves embedded image metadata needed for later edits', () => {
    const result = sanitizeHtml(
      '<p><img src="https://cdn.example.com/document-attachments/tenant/1/notice-temp/token-123/image.png" alt="업로드 이미지" data-upload-token="token-123" data-object-key="tenant/1/notice-temp/token-123/image.png" data-file-size="128" data-mime-type="image/png" /></p>',
    );

    expect(result).toContain('data-upload-token="token-123"');
    expect(result).toContain(
      'data-object-key="tenant/1/notice-temp/token-123/image.png"',
    );
    expect(result).toContain('data-file-size="128"');
    expect(result).toContain('data-mime-type="image/png"');
  });

  it('preserves sanitized table cells and resize attributes', () => {
    const result = sanitizeHtml(
      '<table><tbody><tr><td colspan="2" colwidth="120,180" style="width:120px;height:28px;background-color:#fff2cc;border:1px solid #1f2937">셀</td></tr></tbody></table>',
    );

    expect(result).toContain('<table>');
    expect(result).toContain('colspan="2"');
    expect(result).toContain('colwidth="120,180"');
    expect(result).toContain('width:120px');
    expect(result).toContain('height:28px');
    expect(result).toContain('background-color:#fff2cc');
    expect(result).toContain('border:1px solid #1f2937');
  });

  it('converts saved colwidth values for feed rendering', () => {
    const result = sanitizeHtml(
      '<table><colgroup><col style="min-width:120px"><col style="min-width:180px"></colgroup><tbody><tr><td colwidth="120,180">셀</td></tr></tbody></table>',
    );

    expect(result).toContain('<colgroup>');
    expect(result).toContain('<col style="min-width:120px">');
    expect(result).toContain('colwidth="120,180"');
    expect(result).toContain('style="width:300px"');
  });
});

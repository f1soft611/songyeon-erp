import { describe, expect, it } from 'vitest';
import {
  extractContentShareLinks,
  parseContentShareLink,
  parseExternalLinkUrl,
} from '../src/shared/components/feed/contentShareLinks';

const documentUrl = (token = `v1.${'A'.repeat(59)}`) =>
  `${window.location.origin}/groupware/doc/write?share=${token}`;
const noticeUrl = (token = `v1.${'B'.repeat(59)}`) =>
  `${window.location.origin}/groupware/community/notice?share=${token}`;

describe('content share link classification', () => {
  it('classifies document and notice share URLs by their canonical route', () => {
    expect(parseContentShareLink(documentUrl())).toMatchObject({
      kind: 'document',
      reference: `v1.${'A'.repeat(59)}`,
    });
    expect(parseContentShareLink(noticeUrl())).toMatchObject({
      kind: 'notice',
      token: `v1.${'B'.repeat(59)}`,
    });
  });

  it('preserves legacy document IDs and rejects ambiguous or cross-origin internal links', () => {
    expect(parseContentShareLink(
      `${window.location.origin}/groupware/doc/write?documentId=42`,
    )).toMatchObject({ kind: 'document', reference: 42 });
    for (const value of [
      `https://other.invalid/groupware/doc/write?share=v1.${'A'.repeat(59)}`,
      `${noticeUrl()}&share=v1.${'A'.repeat(59)}`,
      `${window.location.origin}/groupware/community/notice?documentId=42`,
    ]) expect(parseContentShareLink(value)).toBeNull();
  });

  it('extracts internal and external references from anchors and body text once each', () => {
    const external = 'https://example.com/article';
    const links = extractContentShareLinks(`
      <a href="${noticeUrl()}">notice</a>
      <a href="${documentUrl()}">document</a>
      <a href="${external}">https://ignored-label.invalid</a>
      <p>${external}</p><p>${documentUrl()}</p>
    `);

    expect(links.map((link) => link.kind)).toEqual([
      'notice', 'document', 'external',
    ]);
  });

  it('rejects unsafe, local, malformed, and same-origin external destinations', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,test',
      'http://localhost/private',
      'http://127.0.0.1/private',
      `${window.location.origin}/ordinary/path`,
      'https://example.com:8443/path',
    ]) expect(parseExternalLinkUrl(value)).toBeNull();
  });
});

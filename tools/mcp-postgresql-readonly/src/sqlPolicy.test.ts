import { describe, expect, it } from 'vitest';

import { validateIdentifier, validateReadOnlySql } from './sqlPolicy';

describe('validateReadOnlySql', () => {
  it('accepts a SELECT statement', () => {
    expect(validateReadOnlySql('SELECT 1')).toBe('SELECT 1');
  });

  it('accepts a CTE ending in SELECT', () => {
    const sql = 'WITH recent AS (SELECT 1 AS value) SELECT value FROM recent';

    expect(validateReadOnlySql(sql)).toBe(sql);
  });

  it.each([
    "INSERT INTO audit_log (message) VALUES ('write')",
    'DELETE FROM audit_log',
    'DROP TABLE audit_log',
    'SELECT 1;',
    'SELECT 1 -- comment',
  ])('rejects unsafe SQL: %s', (sql) => {
    expect(() => validateReadOnlySql(sql)).toThrow(/read-only SQL policy/i);
  });

  it('rejects a malformed CTE', () => {
    expect(() => validateReadOnlySql('WITH recent AS SELECT 1')).toThrow(
      /read-only SQL policy/i,
    );
  });

  it('rejects a data-changing CTE', () => {
    expect(() =>
      validateReadOnlySql(
        'WITH changed AS (DELETE FROM audit_log RETURNING id) SELECT id FROM changed',
      ),
    ).toThrow(/read-only SQL policy/i);
  });
});

describe('validateIdentifier', () => {
  it('accepts letters, digits, and underscores', () => {
    expect(validateIdentifier('audit_log_2026')).toBe('audit_log_2026');
  });

  it.each(['', 'audit-log', 'audit log', 'audit;drop'])(
    'rejects invalid identifier: %s',
    (value) => {
      expect(() => validateIdentifier(value)).toThrow(/invalid identifier/i);
    },
  );
});

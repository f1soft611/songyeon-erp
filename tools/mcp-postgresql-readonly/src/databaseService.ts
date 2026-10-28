import { validateIdentifier, validateReadOnlySql } from './sqlPolicy.js';

export interface Queryable {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface QueryConnection extends Queryable {
  release(): void;
}

export interface ConnectionAcquirer {
  connect(): Promise<QueryConnection>;
}

export function clampMaxRows(maxRows: number | undefined): number {
  if (!Number.isFinite(maxRows)) {
    return 100;
  }

  return Math.min(Math.max(Math.floor(maxRows!), 1), 1_000);
}

export class ReadonlyDatabaseService {
  constructor(
    private readonly client: Queryable & ConnectionAcquirer,
    private readonly statementTimeoutMs = 5_000,
  ) {
    if (
      !Number.isFinite(statementTimeoutMs) ||
      !Number.isInteger(statementTimeoutMs) ||
      statementTimeoutMs <= 0
    ) {
      throw new Error('statementTimeoutMs must be a finite positive integer');
    }
  }

  async listTables(schema = 'public'): Promise<Record<string, unknown>[]> {
    validateIdentifier(schema);
    const result = await this.client.query(
      `SELECT t.table_name,
              obj_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass, 'pg_class') AS table_comment
       FROM information_schema.tables t
       WHERE t.table_schema = $1
         AND t.table_type = 'BASE TABLE'
         AND t.table_schema NOT IN ('information_schema', 'pg_catalog')
         AND t.table_schema NOT LIKE 'pg_%'
       ORDER BY t.table_name`,
      [schema],
    );

    return result.rows;
  }

  async describeTable(
    tableName: string,
    schema = 'public',
  ): Promise<Record<string, unknown>[]> {
    validateIdentifier(schema);
    validateIdentifier(tableName);
    const result = await this.client.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [schema, tableName],
    );

    return result.rows;
  }

  async queryReadonly(
    sql: string,
    maxRows: number | undefined,
  ): Promise<Record<string, unknown>[]> {
    const validatedSql = validateReadOnlySql(sql);
    const rowLimit = clampMaxRows(maxRows);
    const connection = await this.client.connect();

    try {
      await connection.query('SET default_transaction_read_only = on');
      await connection.query(
        `SET statement_timeout = '${this.statementTimeoutMs}ms'`,
      );
      const result = await connection.query(validatedSql);

      return result.rows.slice(0, rowLimit);
    } finally {
      connection.release();
    }
  }
}

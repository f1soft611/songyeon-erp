import { describe, expect, it } from 'vitest';

import { loadDatabaseConfig } from './config';
import {
  clampMaxRows,
  type ConnectionAcquirer,
  ReadonlyDatabaseService,
  type Queryable,
} from './databaseService';

class FakeClient implements Queryable, ConnectionAcquirer {
  readonly calls: Array<{ text: string; values?: readonly unknown[] }> = [];

  constructor(
    private readonly results: Array<{ rows: Record<string, unknown>[] }> = [],
  ) {}

  async query(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }> {
    this.calls.push({ text, values });
    return this.results.shift() ?? { rows: [] };
  }

  async connect(): Promise<FakeClient> {
    return this;
  }

  release(): void {}
}

class FakePooledConnection {
  readonly calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  releaseCalls = 0;

  constructor(
    private readonly results: Array<{ rows: Record<string, unknown>[] }> = [],
    private readonly queryError?: Error,
  ) {}

  async query(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }> {
    this.calls.push({ text, values });
    if (this.queryError && this.calls.length === 3) {
      throw this.queryError;
    }

    return this.results.shift() ?? { rows: [] };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

class FakePoolClient extends FakeClient {
  connectCalls = 0;

  constructor(readonly connection: FakePooledConnection) {
    super();
  }

  async connect(): Promise<FakePooledConnection> {
    this.connectCalls += 1;
    return this.connection;
  }
}

const validEnvironment = {
  S_ERP_DB_HOST: 'db.example.test',
  S_ERP_DB_PORT: '5433',
  S_ERP_DB_NAME: 's-erp',
  S_ERP_DB_USER: 'reader',
  S_ERP_DB_PASSWORD: 'not-a-real-password',
};

describe('loadDatabaseConfig', () => {
  it('loads required settings and optional SSL', () => {
    expect(
      loadDatabaseConfig({ ...validEnvironment, S_ERP_DB_SSL: 'true' }),
    ).toMatchObject({
      host: 'db.example.test',
      port: 5433,
      database: 's-erp',
      user: 'reader',
      password: 'not-a-real-password',
      ssl: true,
    });
  });

  it('reports only names for missing environment variables', () => {
    expect(() =>
      loadDatabaseConfig({ S_ERP_DB_HOST: 'db.example.test' }),
    ).toThrow('S_ERP_DB_PORT, S_ERP_DB_NAME, S_ERP_DB_USER, S_ERP_DB_PASSWORD');
  });
});

describe('clampMaxRows', () => {
  it.each([
    [undefined, 100],
    [12.9, 12],
    [1_001, 1_000],
    [0, 1],
  ])('bounds %s to %s', (input, expected) => {
    expect(clampMaxRows(input)).toBe(expected);
  });
});

describe('ReadonlyDatabaseService', () => {
  it('lists regular tables from the requested schema', async () => {
    const client = new FakeClient([
      { rows: [{ table_name: 'tb_user', table_comment: null }] },
    ]);
    const service = new ReadonlyDatabaseService(client);

    await expect(service.listTables('public')).resolves.toEqual([
      { table_name: 'tb_user', table_comment: null },
    ]);
    expect(client.calls).toEqual([
      expect.objectContaining({
        text: expect.stringContaining('information_schema.tables'),
        values: ['public'],
      }),
    ]);
  });

  it('does not query when describe_table receives an invalid identifier', async () => {
    const client = new FakeClient();
    const service = new ReadonlyDatabaseService(client);

    await expect(service.describeTable('user;drop', 'public')).rejects.toThrow(
      /invalid identifier/i,
    );
    expect(client.calls).toHaveLength(0);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid statement timeout %s',
    (statementTimeoutMs) => {
      expect(
        () => new ReadonlyDatabaseService(new FakeClient(), statementTimeoutMs),
      ).toThrow(/statementTimeoutMs/i);
    },
  );

  it('sets read-only mode and timeout before returning only the requested rows', async () => {
    const client = new FakeClient([
      { rows: [] },
      { rows: [] },
      { rows: [{ id: 1 }, { id: 2 }] },
    ]);
    const service = new ReadonlyDatabaseService(client, 5_000);

    await expect(
      service.queryReadonly('SELECT id FROM tb_user', 1),
    ).resolves.toEqual([{ id: 1 }]);
    expect(client.calls.map((call) => call.text)).toEqual([
      'SET default_transaction_read_only = on',
      "SET statement_timeout = '5000ms'",
      'SELECT id FROM tb_user',
    ]);
  });

  it('runs readonly query setup and SQL through one acquired connection', async () => {
    const connection = new FakePooledConnection([
      { rows: [] },
      { rows: [] },
      { rows: [{ id: 1 }, { id: 2 }] },
    ]);
    const pool = new FakePoolClient(connection);
    const service = new ReadonlyDatabaseService(pool, 5_000);

    await expect(
      service.queryReadonly('SELECT id FROM tb_user', 1),
    ).resolves.toEqual([{ id: 1 }]);
    expect(pool.connectCalls).toBe(1);
    expect(connection.calls.map((call) => call.text)).toEqual([
      'SET default_transaction_read_only = on',
      "SET statement_timeout = '5000ms'",
      'SELECT id FROM tb_user',
    ]);
    expect(connection.releaseCalls).toBe(1);
  });

  it('releases the acquired connection when readonly SQL fails', async () => {
    const queryError = new Error('query failed');
    const connection = new FakePooledConnection([], queryError);
    const pool = new FakePoolClient(connection);
    const service = new ReadonlyDatabaseService(pool, 5_000);

    await expect(
      service.queryReadonly('SELECT id FROM tb_user', 1),
    ).rejects.toThrow(queryError);
    expect(pool.connectCalls).toBe(1);
    expect(connection.releaseCalls).toBe(1);
  });
});

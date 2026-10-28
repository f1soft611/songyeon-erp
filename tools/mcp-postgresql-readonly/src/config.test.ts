import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { loadEnvironmentFile } from './config.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('loadEnvironmentFile', () => {
  test('loads missing values from a local env file without overwriting existing values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mcp-postgresql-'));
    temporaryDirectories.push(directory);
    const environment: Record<string, string | undefined> = {
      S_ERP_DB_HOST: 'existing-host',
    };
    const envFilePath = join(directory, '.env');

    await writeFile(
      envFilePath,
      'S_ERP_DB_HOST=file-host\nS_ERP_DB_PORT=5433\nS_ERP_DB_PASSWORD=local-password\n',
    );

    loadEnvironmentFile(environment, envFilePath);

    expect(environment).toMatchObject({
      S_ERP_DB_HOST: 'existing-host',
      S_ERP_DB_PORT: '5433',
      S_ERP_DB_PASSWORD: 'local-password',
    });
  });

  test('fills blank values from the local env file without overwriting non-empty existing values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mcp-postgresql-'));
    temporaryDirectories.push(directory);
    const environment: Record<string, string | undefined> = {
      S_ERP_DB_HOST: '',
      S_ERP_DB_PORT: ' ',
      S_ERP_DB_NAME: undefined,
    };
    const envFilePath = join(directory, '.env');

    await writeFile(
      envFilePath,
      'S_ERP_DB_HOST=file-host\nS_ERP_DB_PORT=5433\nS_ERP_DB_NAME=s-erp_test\nS_ERP_DB_USER=db-user\nS_ERP_DB_PASSWORD=secret\n',
    );

    loadEnvironmentFile(environment, envFilePath);

    expect(environment).toMatchObject({
      S_ERP_DB_HOST: 'file-host',
      S_ERP_DB_PORT: '5433',
      S_ERP_DB_NAME: 's-erp_test',
      S_ERP_DB_USER: 'db-user',
      S_ERP_DB_PASSWORD: 'secret',
    });
  });

  test('loads the default env file from the package directory even when cwd is elsewhere', async () => {
    const previousCwd = process.cwd();
    const directory = await mkdtemp(join(tmpdir(), 'mcp-postgresql-'));
    temporaryDirectories.push(directory);

    process.chdir(directory);
    const environment: Record<string, string | undefined> = {};

    try {
      loadEnvironmentFile(environment);
    } finally {
      process.chdir(previousCwd);
    }

    expect(environment.S_ERP_DB_HOST).toBe('218.155.74.34');
    expect(environment.S_ERP_DB_PORT).toBe('5433');
    expect(environment.S_ERP_DB_NAME).toBe('songyeon');
    expect(environment.S_ERP_DB_USER).toBe('postgres');
    expect(environment.S_ERP_DB_PASSWORD).toBe('f1soft@96');
  });
});

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Pool } from 'pg';
import { z } from 'zod';

import { loadDatabaseConfig, loadEnvironmentFile } from './config.js';
import { ReadonlyDatabaseService } from './databaseService.js';

function textResult(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

function databaseErrorResult() {
  return textResult({ error: 'Database request failed' });
}

export async function startServer(): Promise<void> {
  loadEnvironmentFile();
  const config = loadDatabaseConfig();
  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: true } : false,
  });
  const database = new ReadonlyDatabaseService(pool);
  const server = new McpServer({
    name: 'songyeon-erp-postgresql-readonly',
    version: '0.1.0',
  });

  server.registerTool(
    'list_tables',
    {
      description: 'List regular tables in a PostgreSQL schema.',
      inputSchema: z.object({
        schema: z.string().optional().default('public'),
      }),
    },
    async ({ schema }) => {
      try {
        return textResult(await database.listTables(schema));
      } catch {
        return databaseErrorResult();
      }
    },
  );

  server.registerTool(
    'describe_table',
    {
      description: 'Describe columns for a PostgreSQL table.',
      inputSchema: z.object({
        tableName: z.string().min(1),
        schema: z.string().optional().default('public'),
      }),
    },
    async ({ tableName, schema }) => {
      try {
        return textResult(await database.describeTable(tableName, schema));
      } catch {
        return databaseErrorResult();
      }
    },
  );

  server.registerTool(
    'query_readonly',
    {
      description:
        'Run one read-only SELECT or WITH ... SELECT PostgreSQL statement.',
      inputSchema: z.object({
        sql: z.string().min(1),
        maxRows: z.number().int().optional().default(100),
      }),
    },
    async ({ sql, maxRows }) => {
      try {
        return textResult(await database.queryReadonly(sql, maxRows));
      } catch {
        return databaseErrorResult();
      }
    },
  );

  await server.connect(new StdioServerTransport());
}

startServer().catch((error: unknown) => {
  const message =
    error instanceof Error &&
    error.message.startsWith('Missing required environment variables:')
      ? error.message
      : 'MCP server startup failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});

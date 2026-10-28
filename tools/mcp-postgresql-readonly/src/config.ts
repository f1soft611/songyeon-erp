import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

type Environment = Record<string, string | undefined>;

const REQUIRED_VARIABLES = [
  'S_ERP_DB_HOST',
  'S_ERP_DB_PORT',
  'S_ERP_DB_NAME',
  'S_ERP_DB_USER',
  'S_ERP_DB_PASSWORD',
] as const;

export function loadEnvironmentFile(
  environment: Environment = process.env,
  envFilePath = resolve(fileURLToPath(new URL('../.env', import.meta.url))),
): void {
  const result = loadDotenv({
    path: envFilePath,
    processEnv: environment as Record<string, string>,
    override: false,
    quiet: true,
  });
  const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;

  if (result.error && errorCode !== 'ENOENT') {
    throw new Error('Unable to load local environment file');
  }

  const parsed =
    loadDotenv({
      path: envFilePath,
      processEnv: {} as Record<string, string>,
      quiet: true,
    }).parsed ?? {};

  for (const name of REQUIRED_VARIABLES) {
    const value = parsed[name]?.trim();
    if (!environment[name]?.trim() && value) {
      environment[name] = value;
    }
  }
}

export function loadDatabaseConfig(
  environment: Environment = process.env,
): DatabaseConfig {
  const missing = REQUIRED_VARIABLES.filter(
    (name) => !environment[name]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const port = Number(environment.S_ERP_DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid S_ERP_DB_PORT');
  }

  return {
    host: environment.S_ERP_DB_HOST!.trim(),
    port,
    database: environment.S_ERP_DB_NAME!.trim(),
    user: environment.S_ERP_DB_USER!.trim(),
    password: environment.S_ERP_DB_PASSWORD!,
    ssl: environment.S_ERP_DB_SSL?.trim().toLowerCase() === 'true',
  };
}

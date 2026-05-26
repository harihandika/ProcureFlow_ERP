import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  const value = rawValue.replace(/^['"]|['"]$/g, '');

  return key ? [key, value] : null;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const parsed = parseEnvLine(line);

    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;
    process.env[key] ??= value;
  }
}

process.env.NODE_ENV = 'test';
loadEnvFile(resolve(__dirname, '../.env.test'));

process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.JWT_EXPIRES_IN ??= '15m';
process.env.PORT ??= '4001';
process.env.BCRYPT_SALT_ROUNDS ??= '4';

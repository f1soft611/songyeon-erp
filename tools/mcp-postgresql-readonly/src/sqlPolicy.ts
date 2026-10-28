const POLICY_ERROR = 'Read-only SQL policy violation';
const IDENTIFIER_ERROR = 'Invalid identifier';
const FORBIDDEN_KEYWORDS = new Set([
  'alter',
  'call',
  'copy',
  'create',
  'delete',
  'do',
  'drop',
  'grant',
  'insert',
  'merge',
  'revoke',
  'truncate',
  'update',
]);

function tokenize(sql: string): string[] {
  const tokens: string[] = [];
  let index = 0;

  while (index < sql.length) {
    const character = sql[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === "'" || character === '"') {
      const quote = character;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === quote) {
          index += sql[index + 1] === quote ? 2 : 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      const start = index;
      index += 1;
      while (index < sql.length && /[A-Za-z0-9_$]/.test(sql[index])) {
        index += 1;
      }
      tokens.push(sql.slice(start, index).toLowerCase());
      continue;
    }

    if ('(),'.includes(character)) {
      tokens.push(character);
    }
    index += 1;
  }

  return tokens;
}

function hasValidCteShape(tokens: string[]): boolean {
  let index = 1;
  if (tokens[index] === 'recursive') {
    index += 1;
  }

  while (index < tokens.length) {
    if (!/^[a-z_][a-z0-9_$]*$/.test(tokens[index] ?? '')) {
      return false;
    }
    index += 1;

    if (tokens[index] === '(') {
      let depth = 1;
      index += 1;
      while (index < tokens.length && depth > 0) {
        if (tokens[index] === '(') depth += 1;
        if (tokens[index] === ')') depth -= 1;
        index += 1;
      }
      if (depth !== 0) return false;
    }

    if (tokens[index] !== 'as' || tokens[index + 1] !== '(') {
      return false;
    }
    index += 2;

    let depth = 1;
    while (index < tokens.length && depth > 0) {
      if (tokens[index] === '(') depth += 1;
      if (tokens[index] === ')') depth -= 1;
      index += 1;
    }
    if (depth !== 0) return false;

    if (tokens[index] !== ',') break;
    index += 1;
  }

  return tokens[index] === 'select';
}

export function validateReadOnlySql(sql: string): string {
  const statement = sql.trim();

  if (
    !statement ||
    statement.includes(';') ||
    statement.includes('--') ||
    statement.includes('/*') ||
    statement.includes('*/') ||
    !/^(select|with)\b/i.test(statement)
  ) {
    throw new Error(POLICY_ERROR);
  }

  const tokens = tokenize(statement);
  if (
    tokens.some((token) => FORBIDDEN_KEYWORDS.has(token)) ||
    (tokens[0] === 'with' && !hasValidCteShape(tokens))
  ) {
    throw new Error(POLICY_ERROR);
  }

  return sql;
}

export function validateIdentifier(value: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(IDENTIFIER_ERROR);
  }

  return value;
}

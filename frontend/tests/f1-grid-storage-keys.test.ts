import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceRoot = join(process.cwd(), 'src');
const gridImplementationRoot = join(
  sourceRoot,
  'shared',
  'components',
  'f1-grid',
);

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [entryPath] : [];
  });
}

function collectGridUsages() {
  const files = [
    ...collectTsxFiles(join(sourceRoot, 'pages')),
    ...collectTsxFiles(join(sourceRoot, 'shared', 'components')).filter(
      (filePath) => !filePath.startsWith(`${gridImplementationRoot}${sep}`),
    ),
  ];

  return files.flatMap((filePath) => {
    const sourceText = readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const usages: Array<{
      file: string;
      line: number;
      storageKey?: string;
    }> = [];

    function visit(node: ts.Node) {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        ts.isIdentifier(node.tagName) &&
        (node.tagName.text === 'F1Grid' || node.tagName.text === 'F1Tree')
      ) {
        const storageKeyAttribute = node.attributes.properties.find(
          (attribute) =>
            ts.isJsxAttribute(attribute) &&
            ts.isIdentifier(attribute.name) &&
            attribute.name.text === 'storageKey',
        );
        const initializer =
          storageKeyAttribute && ts.isJsxAttribute(storageKeyAttribute)
            ? storageKeyAttribute.initializer
            : undefined;
        let storageKey: string | undefined;

        if (initializer && ts.isStringLiteral(initializer)) {
          storageKey = initializer.text;
        } else if (initializer && ts.isJsxExpression(initializer)) {
          const expression = initializer.expression;
          if (
            expression &&
            (ts.isStringLiteral(expression) ||
              ts.isNoSubstitutionTemplateLiteral(expression))
          ) {
            storageKey = expression.text;
          } else if (expression) {
            storageKey = expression.getText(sourceFile);
          }
        }

        usages.push({
          file: relative(sourceRoot, filePath),
          line:
            sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
              .line + 1,
          storageKey,
        });
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return usages;
  });
}

describe('F1-Grid storage keys', () => {
  const usages = collectGridUsages();

  it('assigns a storageKey to every rendered F1Grid and F1Tree', () => {
    const missingKeys = usages
      .filter((usage) => !usage.storageKey)
      .map((usage) => `${usage.file}:${usage.line}`);

    expect(missingKeys).toEqual([]);
  });

  it('uses a distinct storageKey for each grid instance', () => {
    const keysByUsage = new Map<string, string[]>();
    for (const usage of usages) {
      if (!usage.storageKey) continue;
      const matchingUsages = keysByUsage.get(usage.storageKey) ?? [];
      matchingUsages.push(`${usage.file}:${usage.line}`);
      keysByUsage.set(usage.storageKey, matchingUsages);
    }

    const duplicateKeys = [...keysByUsage.entries()]
      .filter(([, matchingUsages]) => matchingUsages.length > 1)
      .map(
        ([storageKey, matchingUsages]) => `${storageKey}: ${matchingUsages}`,
      );

    expect(duplicateKeys).toEqual([]);
  });
});

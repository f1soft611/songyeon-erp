import { sanitizeHtml } from '../../utils/sanitizeHtml';

const allowedCellStyleProperties = new Set([
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-left',
  'border-right',
  'border-top',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'line-height',
  'overflow-wrap',
  'text-align',
  'text-decoration',
  'vertical-align',
  'width',
  'white-space',
  'word-break',
]);

const allowedTextStyleProperties = new Set([
  'background-color',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'overflow-wrap',
  'text-decoration',
  'white-space',
  'word-break',
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isSafeCellStyleValue(value: string): boolean {
  return !/[{}<>]|url\s*\(|expression\s*\(|javascript\s*:/i.test(value);
}

function isSafeStyleDeclaration(property: string, value: string): boolean {
  if (!isSafeCellStyleValue(value)) return false;
  const normalized = value.trim().toLowerCase();
  if (property === 'white-space') {
    return [
      'normal',
      'pre',
      'nowrap',
      'pre-wrap',
      'pre-line',
      'break-spaces',
    ].includes(normalized);
  }
  if (property === 'word-break') {
    return ['normal', 'break-all', 'keep-all', 'break-word'].includes(
      normalized,
    );
  }
  if (property === 'overflow-wrap') {
    return ['normal', 'break-word', 'anywhere'].includes(normalized);
  }
  return true;
}

function expandFontShorthand(
  ownerDocument: Document,
  value: string,
): Array<readonly [string, string]> {
  if (!value || !isSafeCellStyleValue(value)) return [];

  const probe = ownerDocument.createElement('span');
  probe.style.setProperty('font', value);
  return (
    [
      ['font-style', probe.style.fontStyle],
      ['font-weight', probe.style.fontWeight],
      ['font-size', probe.style.fontSize],
      ['font-family', probe.style.fontFamily],
      ['line-height', probe.style.lineHeight],
    ] as const
  ).filter(([, declarationValue]) => Boolean(declarationValue));
}

function normalizeCellDimension(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return `${normalized}px`;
  }

  return /^(?:\d+(?:\.\d+)?)(?:px|pt|pc|cm|mm|in|em|rem|%|vh|vw)$/.test(
    normalized,
  )
    ? normalized
    : null;
}

function normalizeImageDimension(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return /^(?:\d+(?:\.\d+)?)(?:px|%)$/.test(normalized) ? normalized : null;
}

function normalizeColumnWidth(value: string | null): number | null {
  const normalized = normalizeCellDimension(value);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)(px|pt|pc|in|cm|mm)?$/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 'px';
  const pixels =
    unit === 'pt'
      ? (amount * 96) / 72
      : unit === 'pc'
        ? amount * 16
        : unit === 'in'
          ? amount * 96
          : unit === 'cm'
            ? (amount * 96) / 2.54
            : unit === 'mm'
              ? (amount * 96) / 25.4
              : amount;

  return Number.isFinite(pixels) && pixels > 0 && pixels <= 2000
    ? Math.max(1, Math.round(pixels))
    : null;
}

function getClipboardTableColumnWidths(table: Element): number[] {
  const columns = Array.from(table.querySelectorAll(':scope > colgroup > col'));

  return columns.flatMap((column) => {
    const width = normalizeColumnWidth(
      (column as HTMLElement).style.getPropertyValue('width') ||
        column.getAttribute('width'),
    );
    const span = Math.max(1, Number(column.getAttribute('span')) || 1);
    return Array.from({ length: span }, () => width ?? 0);
  });
}

export function parseClipboardTextGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && character === '\t') {
      row.push(field);
      field = '';
      continue;
    }
    if (!quoted && (character === '\r' || character === '\n')) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      continue;
    }
    field += character;
  }

  if (field || row.length > 0 || rows.length === 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function serializePlainTextCell(text: string, sourceCell: Element): string {
  const serializedText = serializePlainTextWithSourceMarks(text, sourceCell);
  const sourceParagraph = Array.from(sourceCell.children).find((child) =>
    ['p', 'div'].includes(child.tagName.toLowerCase()),
  );
  if (!sourceParagraph) return serializedText;

  const style = sanitizeTextStyle(sourceParagraph);
  const styleAttribute = style ? ` style="${escapeHtml(style)}"` : '';
  return `<p${styleAttribute}>${serializedText}</p>`;
}

function comparableCellText(text: string): string {
  return text.replace(/[\s\u00a0]/g, '');
}

type ClipboardTextMark = { tag: string; style?: string };

function getTextNodeMarks(node: Text, cell: Element): ClipboardTextMark[] {
  const ancestors: Element[] = [];
  let current = node.parentElement;
  while (current && current !== cell) {
    ancestors.unshift(current);
    current = current.parentElement;
  }

  const marks: ClipboardTextMark[] = [];
  for (const ancestor of ancestors) {
    const tag = ancestor.tagName.toLowerCase();
    if (['strong', 'b'].includes(tag)) marks.push({ tag: 'strong' });
    else if (['em', 'i'].includes(tag)) marks.push({ tag: 'em' });
    else if (['s', 'strike', 'del'].includes(tag)) marks.push({ tag: 's' });

    const style = sanitizeTextStyle(ancestor);
    if (style) marks.push({ tag: 'span', style });
  }
  return marks;
}

function collectClipboardTextMarks(cell: Element): ClipboardTextMark[][] {
  const marks: ClipboardTextMark[][] = [];
  const walker = cell.ownerDocument.createTreeWalker(
    cell,
    NodeFilter.SHOW_TEXT,
  );
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const nodeMarks = getTextNodeMarks(textNode, cell);
    for (const character of Array.from(textNode.textContent ?? '')) {
      if (!/[\s\u00a0]/.test(character)) marks.push(nodeMarks);
    }
    current = walker.nextNode();
  }
  return marks;
}

function sameClipboardMarks(
  left: ClipboardTextMark[],
  right: ClipboardTextMark[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function wrapClipboardText(text: string, marks: ClipboardTextMark[]): string {
  return [...marks].reverse().reduce((content, mark) => {
    if (mark.tag === 'span') {
      const styleAttribute = mark.style
        ? ` style="${escapeHtml(mark.style)}"`
        : '';
      return `<span${styleAttribute}>${content}</span>`;
    }
    return `<${mark.tag}>${content}</${mark.tag}>`;
  }, escapeHtml(text));
}

function serializePlainTextWithSourceMarks(
  text: string,
  sourceCell: Element,
): string {
  const sourceMarks = collectClipboardTextMarks(sourceCell);
  const characters = Array.from(text.replace(/\r\n?/g, '\n'));
  const output: string[] = [];
  let activeMarks: ClipboardTextMark[] | null = null;
  let segment = '';
  let sourceIndex = 0;

  const flush = () => {
    if (segment && activeMarks)
      output.push(wrapClipboardText(segment, activeMarks));
    segment = '';
  };

  for (const character of characters) {
    if (character === '\n') {
      flush();
      output.push('<br>');
      activeMarks = null;
      continue;
    }

    const marks: ClipboardTextMark[] = /[\s\u00a0]/.test(character)
      ? (activeMarks ?? sourceMarks[sourceIndex] ?? [])
      : (sourceMarks[sourceIndex++] ?? []);
    if (activeMarks && !sameClipboardMarks(activeMarks, marks)) flush();
    activeMarks = marks;
    segment += character;
  }
  flush();
  return output.join('');
}

function sanitizeCellStyle(cell: Element, omitWidth = false): string | null {
  const declarations: string[] = [];
  const style = (cell as HTMLElement).style;

  for (const property of allowedCellStyleProperties) {
    if (omitWidth && property === 'width') {
      continue;
    }

    const value = style.getPropertyValue(property).trim();
    if (!value || !isSafeStyleDeclaration(property, value)) {
      continue;
    }

    const normalizedValue =
      property === 'width' || property === 'height' || property === 'font-size'
        ? normalizeCellDimension(value)
        : value;
    if (normalizedValue) {
      declarations.push(`${property}:${normalizedValue}`);
    }
  }

  for (const [property, value] of expandFontShorthand(
    cell.ownerDocument,
    style.getPropertyValue('font'),
  )) {
    if (
      allowedCellStyleProperties.has(property) &&
      !declarations.some((declaration) =>
        declaration.startsWith(`${property}:`),
      ) &&
      isSafeStyleDeclaration(property, value)
    ) {
      declarations.push(`${property}:${value}`);
    }
  }

  for (const [property, attribute] of [
    ['width', 'width'],
    ['height', 'height'],
  ] as const) {
    if (omitWidth && property === 'width') {
      continue;
    }

    if (
      declarations.some((declaration) => declaration.startsWith(`${property}:`))
    ) {
      continue;
    }

    const normalizedValue = normalizeCellDimension(
      cell.getAttribute(attribute),
    );
    if (normalizedValue) {
      declarations.push(`${property}:${normalizedValue}`);
    }
  }

  return declarations.length > 0 ? declarations.join(';') : null;
}

function sanitizeTextStyle(element: Element): string | null {
  const declarations: string[] = [];
  const style = (element as HTMLElement).style;

  for (const property of allowedTextStyleProperties) {
    const value = style.getPropertyValue(property).trim();
    if (!value || !isSafeStyleDeclaration(property, value)) {
      continue;
    }

    const normalizedValue =
      property === 'font-size' ? normalizeCellDimension(value) : value;
    if (normalizedValue) {
      declarations.push(`${property}:${normalizedValue}`);
    }
  }

  for (const [property, value] of expandFontShorthand(
    element.ownerDocument,
    style.getPropertyValue('font'),
  )) {
    if (
      allowedTextStyleProperties.has(property) &&
      !declarations.some((declaration) =>
        declaration.startsWith(`${property}:`),
      ) &&
      isSafeStyleDeclaration(property, value)
    ) {
      declarations.push(`${property}:${value}`);
    }
  }

  if (element.tagName.toLowerCase() === 'font') {
    const legacyAttributes = [
      ['face', 'font-family'],
      ['color', 'color'],
    ] as const;
    for (const [attribute, property] of legacyAttributes) {
      const value = element.getAttribute(attribute)?.trim() ?? '';
      if (
        value &&
        !declarations.some((declaration) =>
          declaration.startsWith(`${property}:`),
        ) &&
        isSafeCellStyleValue(value) &&
        !value.includes(';')
      ) {
        declarations.push(`${property}:${value}`);
      }
    }

    const legacySize = element.getAttribute('size')?.trim() ?? '';
    const legacyFontSizes: Record<string, string> = {
      '1': '8pt',
      '2': '10pt',
      '3': '12pt',
      '4': '14pt',
      '5': '18pt',
      '6': '24pt',
      '7': '36pt',
    };
    const fontSize =
      legacyFontSizes[legacySize] ?? normalizeCellDimension(legacySize);
    if (
      fontSize &&
      !declarations.some((declaration) => declaration.startsWith('font-size:'))
    ) {
      declarations.push(`font-size:${fontSize}`);
    }
  }

  return declarations.length > 0 ? declarations.join(';') : null;
}

function normalizeLegacyClipboardFonts(root: HTMLElement): void {
  root.querySelectorAll('font').forEach((font) => {
    const style = sanitizeTextStyle(font);
    if (!style) {
      font.replaceWith(...Array.from(font.childNodes));
      return;
    }
    const span = font.ownerDocument.createElement('span');
    span.setAttribute('style', style);
    while (font.firstChild) {
      span.appendChild(font.firstChild);
    }
    font.replaceWith(span);
  });
}

function normalizeClipboardBlockTextStyles(root: HTMLElement): void {
  root
    .querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre')
    .forEach((block) => {
      const style = sanitizeTextStyle(block);
      if (!style) return;
      const span = block.ownerDocument.createElement('span');
      span.setAttribute('style', style);
      while (block.firstChild) {
        span.appendChild(block.firstChild);
      }
      block.appendChild(span);
      block.removeAttribute('style');
    });
}

function serializeClipboardChildren(parent: ParentNode): string {
  const nodes = Array.from(parent.childNodes);
  const serialized: string[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    serialized.push(serializeClipboardCellNode(nodes[index]));
  }

  return serialized.join('');
}

function normalizeClipboardTable(
  table: Element,
  plainTextRows?: string[][],
): string {
  const rows = Array.from(table.querySelectorAll('tr')).filter(
    (row) => row.closest('table') === table,
  );
  const columnWidths = getClipboardTableColumnWidths(table);
  const logicalColumnCount = Math.max(
    columnWidths.length,
    ...rows.map((row) =>
      Array.from(row.children)
        .filter(
          (cell) =>
            cell.tagName.toLowerCase() === 'td' ||
            cell.tagName.toLowerCase() === 'th',
        )
        .reduce(
          (total, cell) =>
            total + Math.max(1, Number(cell.getAttribute('colspan')) || 1),
          0,
        ),
    ),
  );
  const plainTextMatchesTable = Boolean(
    plainTextRows &&
    plainTextRows.length === rows.length &&
    plainTextRows.every((row) => row.length >= logicalColumnCount),
  );
  const occupiedUntil: number[] = [];
  const normalizedRows = rows
    .map((row, rowIndex) => {
      const cells = Array.from(row.children).filter(
        (cell) =>
          cell.tagName.toLowerCase() === 'td' ||
          cell.tagName.toLowerCase() === 'th',
      );
      if (cells.length === 0) {
        return '<tr></tr>';
      }

      let columnIndex = 0;
      const normalizedCells = cells.map((cell) => {
        const tagName = cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
        const colspan = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
        const rowspan = Math.max(1, Number(cell.getAttribute('rowspan')) || 1);
        const hasAvailableColumnRange = (startColumn: number) => {
          for (
            let spanColumn = startColumn;
            spanColumn < startColumn + colspan;
            spanColumn += 1
          ) {
            if ((occupiedUntil[spanColumn] ?? 0) > rowIndex) return false;
          }
          return true;
        };
        while (!hasAvailableColumnRange(columnIndex)) {
          columnIndex += 1;
        }
        const cellColumn = columnIndex;
        const cellColumnWidths = columnWidths.slice(
          cellColumn,
          cellColumn + colspan,
        );
        const colwidthAttribute =
          cellColumnWidths.length === colspan &&
          cellColumnWidths.every((width) => width > 0)
            ? ` colwidth="${cellColumnWidths.join(',')}"`
            : '';
        const spanAttributes = [
          colspan > 1 ? ` colspan="${colspan}"` : '',
          rowspan > 1 ? ` rowspan="${rowspan}"` : '',
        ].join('');
        for (
          let spanColumn = cellColumn;
          spanColumn < cellColumn + colspan;
          spanColumn += 1
        ) {
          occupiedUntil[spanColumn] = Math.max(
            occupiedUntil[spanColumn] ?? 0,
            rowIndex + rowspan,
          );
        }
        columnIndex += colspan;
        const style = sanitizeCellStyle(cell, Boolean(colwidthAttribute));
        const styleAttribute = style ? ` style="${escapeHtml(style)}"` : '';
        const plainTextCell = plainTextMatchesTable
          ? plainTextRows?.[rowIndex]?.[cellColumn]
          : undefined;
        const content =
          typeof plainTextCell === 'string' &&
          comparableCellText(plainTextCell) ===
            comparableCellText(cell.textContent ?? '')
            ? serializePlainTextCell(plainTextCell, cell)
            : serializeClipboardChildren(cell);

        return `<${tagName}${spanAttributes}${colwidthAttribute}${styleAttribute}>${content}</${tagName}>`;
      });

      return `<tr>${normalizedCells.join('')}</tr>`;
    })
    .filter(Boolean);

  return normalizedRows.length > 0
    ? `<table><tbody>${normalizedRows.join('')}</tbody></table>`
    : '';
}

function serializeClipboardCellNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\r\n?/g, '\n');
    if (!text.trim() && text.includes('\n')) {
      return '';
    }

    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  if (!(node instanceof Element)) {
    return '';
  }

  const tagName = node.tagName.toLowerCase();
  if (tagName === 'br') {
    return '<br>';
  }
  if (tagName === 'table') {
    return normalizeClipboardTable(node);
  }

  const content = serializeClipboardChildren(node);
  const style = sanitizeTextStyle(node);
  const styleAttribute = style ? ` style="${escapeHtml(style)}"` : '';
  const styledContent = style
    ? `<span${styleAttribute}>${content}</span>`
    : content;

  if (tagName === 'strong' || tagName === 'b') {
    return `<strong>${styledContent}</strong>`;
  }
  if (tagName === 'em' || tagName === 'i') {
    return `<em>${styledContent}</em>`;
  }
  if (tagName === 's' || tagName === 'strike' || tagName === 'del') {
    return `<s>${styledContent}</s>`;
  }
  if (tagName === 'p' || tagName === 'div') {
    return `<p>${styledContent}</p>`;
  }
  if (tagName === 'span' || tagName === 'font') {
    return style ? `<span${styleAttribute}>${content}</span>` : content;
  }

  return content;
}

function applyEmbeddedCellStyles(root: HTMLElement): void {
  const styleTargets = Array.from(
    root.querySelectorAll(
      'col, th, td, span, p, div, font, strong, b, em, i, s, del',
    ),
  );
  const styleProperties = Array.from(allowedCellStyleProperties);

  const applyDeclarationText = (
    selectorText: string,
    declarationText: string,
  ): void => {
    const declarations = declarationText
      .split(';')
      .map((declaration) => declaration.split(':'))
      .filter(([property, value]) => property && value)
      .map(
        ([property, value]) =>
          [property.trim().toLowerCase(), value.trim()] as const,
      )
      .flatMap(([property, value]) =>
        property === 'font'
          ? expandFontShorthand(root.ownerDocument, value)
          : [[property, value] as const],
      )
      .filter(
        ([property, value]) =>
          allowedCellStyleProperties.has(property) &&
          isSafeStyleDeclaration(property, value),
      );

    for (const selector of selectorText.split(',')) {
      for (const element of styleTargets) {
        try {
          if (!element.matches(selector.trim())) {
            continue;
          }
        } catch {
          continue;
        }

        const allowedProperties = element.matches('col')
          ? new Set(['width'])
          : element.matches('td, th')
            ? allowedCellStyleProperties
            : allowedTextStyleProperties;
        for (const [property, value] of declarations) {
          if (allowedProperties.has(property)) {
            (element as HTMLElement).style.setProperty(property, value);
          }
        }
      }
    }
  };

  const applyRules = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const styleRule = rule as CSSStyleRule;
        for (const element of styleTargets) {
          try {
            if (!element.matches(styleRule.selectorText)) {
              continue;
            }
          } catch {
            continue;
          }

          const allowedProperties = element.matches('col')
            ? ['width']
            : element.matches('td, th')
              ? styleProperties
              : Array.from(allowedTextStyleProperties);
          const fontShorthand = styleRule.style.getPropertyValue('font').trim();
          for (const [property, value] of expandFontShorthand(
            root.ownerDocument,
            fontShorthand,
          )) {
            if (
              allowedProperties.includes(property) &&
              isSafeStyleDeclaration(property, value)
            ) {
              (element as HTMLElement).style.setProperty(property, value);
            }
          }
          for (const property of allowedProperties) {
            const value = styleRule.style.getPropertyValue(property).trim();
            if (value && isSafeStyleDeclaration(property, value)) {
              (element as HTMLElement).style.setProperty(property, value);
            }
          }
        }
      } else if (rule.type !== CSSRule.IMPORT_RULE) {
        const nestedRules = (rule as CSSGroupingRule).cssRules;
        if (nestedRules) {
          applyRules(nestedRules);
        }
      }
    });
  };

  root.ownerDocument.querySelectorAll('style').forEach((styleElement) => {
    const runtimeStyle = root.ownerDocument.createElement('style');
    runtimeStyle.textContent = styleElement.textContent;
    root.ownerDocument.head.appendChild(runtimeStyle);

    if (runtimeStyle.sheet?.cssRules) {
      applyRules(runtimeStyle.sheet.cssRules);
    }

    const cssText = styleElement.textContent ?? '';
    const fallbackRulePattern = /([^{}]+)\{([^{}]*)\}/g;
    let fallbackMatch = fallbackRulePattern.exec(cssText);
    while (fallbackMatch) {
      applyDeclarationText(fallbackMatch[1], fallbackMatch[2]);
      fallbackMatch = fallbackRulePattern.exec(cssText);
    }

    runtimeStyle.remove();
  });
}

export function normalizeClipboardHtmlForEditor(
  rawHtml: string | null | undefined,
  rawPlainText = '',
): string {
  if (!rawHtml || !rawHtml.trim()) {
    return '';
  }

  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const root = doc.body;

  applyEmbeddedCellStyles(root);

  root
    .querySelectorAll('script,style,iframe,svg,object,embed,form,meta,link')
    .forEach((node) => node.remove());

  root.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src')?.trim() ?? '';
    if (!/^(?:https?:|\/)(?!\/)/i.test(src) && !/^https?:\/\//i.test(src)) {
      image.remove();
      return;
    }
    Array.from(image.attributes).forEach((attribute) => {
      if (
        !['src', 'alt', 'title', 'width', 'height'].includes(attribute.name)
      ) {
        image.removeAttribute(attribute.name);
      }
    });
    const width = normalizeImageDimension(image.getAttribute('width'));
    const height = normalizeImageDimension(image.getAttribute('height'));
    if (width) image.setAttribute('width', width);
    else image.removeAttribute('width');
    if (height) image.setAttribute('height', height);
    else image.removeAttribute('height');
  });

  const tables = Array.from(root.querySelectorAll('table')).filter(
    (table) => !table.parentElement?.closest('table'),
  );
  const plainTextRows = rawPlainText
    ? parseClipboardTextGrid(rawPlainText)
    : undefined;
  const normalizedTables = tables
    .map((table) => normalizeClipboardTable(table, plainTextRows))
    .filter(Boolean);
  if (normalizedTables.length > 0) {
    return normalizedTables.join('');
  }

  const textCells = Array.from(root.querySelectorAll('td, th'));
  if (textCells.length > 0) {
    const rows = textCells
      .map((cell) => {
        const value = (cell.textContent ?? '')
          .replace(/\u00a0/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return value ? value : '';
      })
      .filter(Boolean);

    if (rows.length > 0) {
      return rows.map((value) => `<p>${escapeHtml(value)}</p>`).join('');
    }
  }

  const plainTextCandidate = root.textContent ?? '';
  const normalizedText = plainTextCandidate
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' | ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalizedText) {
    return '';
  }

  normalizeLegacyClipboardFonts(root);
  normalizeClipboardBlockTextStyles(root);
  const normalizedHtml = sanitizeHtml(root.innerHTML, {
    preserveTextStyles: true,
  });
  if (normalizedHtml) {
    return normalizedHtml;
  }

  const blocks = normalizedText
    .split(/\n{2,}|\n/)
    .map((line) => line.replace(/\s+\|\s+/g, ' | ').trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

  return blocks || `<p>${escapeHtml(normalizedText)}</p>`;
}

export function normalizeClipboardTextForEditor(rawText: string): string {
  return rawText.replace(/\r\n?/g, '\n');
}

export function normalizeClipboardTextGridForEditor(rawText: string): string {
  const rows = parseClipboardTextGrid(rawText);
  const serializedRows = rows.map(
    (row) =>
      `<tr>${row
        .map((cell) => {
          const text = escapeHtml(cell.replace(/\r\n?/g, '\n')).replace(
            /\n/g,
            '<br>',
          );
          return `<td><p>${text}</p></td>`;
        })
        .join('')}</tr>`,
  );
  return serializedRows.length
    ? `<table><tbody>${serializedRows.join('')}</tbody></table>`
    : '';
}

export function hasSpreadsheetClipboardContent(
  clipboardData: DataTransfer | null | undefined,
): boolean {
  if (!clipboardData) {
    return false;
  }

  const html = clipboardData.getData('text/html') ?? '';
  const text = clipboardData.getData('text/plain') ?? '';

  if (/<table\b/i.test(html)) {
    return true;
  }

  const normalizedText = text.replace(/\r\n?/g, '\n').trim();
  if (!normalizedText) {
    return false;
  }

  return normalizedText.includes('\t') && normalizedText.includes('\n');
}

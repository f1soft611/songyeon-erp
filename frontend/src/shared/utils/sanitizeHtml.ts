const allowedTags = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'col',
  'colgroup',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'ol',
  'img',
  'p',
  'pre',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);

const allowedAttributes = new Set([
  'aria-label',
  'colspan',
  'colwidth',
  'height',
  'href',
  'alt',
  'data-file-id',
  'data-file-size',
  'data-mime-type',
  'data-object-key',
  'data-upload-token',
  'data-upload-state',
  'rel',
  'src',
  'rowspan',
  'style',
  'target',
  'width',
]);

const allowedStyleProperties = new Set([
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-left',
  'border-right',
  'border-top',
  'color',
  'font-weight',
  'height',
  'min-width',
  'overflow-wrap',
  'text-align',
  'vertical-align',
  'width',
  'white-space',
  'word-break',
]);

const allowedTextStyleProperties = new Set([
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'text-decoration',
  'overflow-wrap',
  'white-space',
  'word-break',
]);

const safeWrappingValues: Record<string, Set<string>> = {
  'white-space': new Set([
    'normal',
    'pre',
    'nowrap',
    'pre-wrap',
    'pre-line',
    'break-spaces',
  ]),
  'word-break': new Set(['normal', 'break-all', 'keep-all', 'break-word']),
  'overflow-wrap': new Set(['normal', 'break-word', 'anywhere']),
};

export type SanitizeHtmlOptions = {
  preserveTextStyles?: boolean;
};

function sanitizeStyle(value: string, styleProperties: Set<string>): string {
  return value
    .split(';')
    .map((declaration) => declaration.split(':'))
    .filter(([property, declarationValue]) => property && declarationValue)
    .map(([property, declarationValue]) => [
      property.trim().toLowerCase(),
      declarationValue.trim(),
    ])
    .filter(
      ([property, declarationValue]) =>
        styleProperties.has(property) &&
        (!safeWrappingValues[property] ||
          safeWrappingValues[property].has(declarationValue.toLowerCase())) &&
        !/[{}<>]|url\s*\(|expression\s*\(|javascript\s*:/i.test(
          declarationValue,
        ),
    )
    .map(([property, declarationValue]) => `${property}:${declarationValue}`)
    .join(';');
}

function appendStyleProperty(
  element: HTMLElement,
  property: string,
  value: string,
): void {
  const existing = element.getAttribute('style')?.trim() ?? '';
  const declarations = existing ? `${existing};` : '';
  element.setAttribute('style', `${declarations}${property}:${value}`);
}

function applyColwidthStyle(element: HTMLElement): void {
  if (!['td', 'th'].includes(element.tagName.toLowerCase())) {
    return;
  }

  if (element.style.width) {
    return;
  }

  const widths = (element.getAttribute('colwidth') ?? '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  const width = widths.reduce((total, value) => total + value, 0);
  if (width > 0) {
    appendStyleProperty(element, 'width', `${Math.round(width)}px`);
  }
}

function sanitizeImageDimension(value: string): string | null {
  const normalized = value.trim();
  return /^(?:\d+(?:\.\d+)?)(?:px|%)$/.test(normalized) ? normalized : null;
}

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (
    !normalized ||
    normalized.startsWith('#') ||
    (normalized.startsWith('/') && !normalized.startsWith('//'))
  ) {
    return true;
  }
  return /^(https?:|mailto:)/i.test(normalized);
}

export function sanitizeHtml(
  value: string,
  options: SanitizeHtmlOptions = {},
): string {
  if (typeof DOMParser === 'undefined') {
    return value
      .replace(/<(script|style|svg)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
      .replace(/\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(
        /\s+(?:href|src)\s*=\s*(?:"\s*(?:(?:javascript|data|vbscript):|\/\/)[^" ]*"|'\s*(?:(?:javascript|data|vbscript):|\/\/)[^' ]*'|[^\s>]*\s*)/gi,
        '',
      )
      .trim();
  }

  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const preserveTextStyles = options.preserveTextStyles === true;
  const tags = preserveTextStyles
    ? new Set([...allowedTags, 'span'])
    : allowedTags;
  const styleProperties = preserveTextStyles
    ? new Set([...allowedStyleProperties, ...allowedTextStyleProperties])
    : allowedStyleProperties;
  parsed
    .querySelectorAll('script, style, svg, iframe, object, embed, link, meta')
    .forEach((node) => node.remove());

  parsed.body.querySelectorAll('*').forEach((node) => {
    const element = node as HTMLElement;
    if (!tags.has(element.tagName.toLowerCase())) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const isUrl = name === 'href' || name === 'src';
      if (
        name.startsWith('on') ||
        !allowedAttributes.has(name) ||
        (isUrl && !isSafeUrl(attribute.value))
      ) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === 'style') {
        if (
          ![
            'td',
            'th',
            'col',
            'colgroup',
            ...(preserveTextStyles ? ['span'] : []),
          ].includes(element.tagName.toLowerCase())
        ) {
          element.removeAttribute(attribute.name);
          return;
        }

        const safeStyle = sanitizeStyle(attribute.value, styleProperties);
        if (safeStyle) {
          element.setAttribute('style', safeStyle);
        } else {
          element.removeAttribute('style');
        }
      }
    });

    applyColwidthStyle(element);

    if (element.tagName.toLowerCase() === 'img') {
      for (const attributeName of ['width', 'height']) {
        const value = element.getAttribute(attributeName);
        const safeValue = value ? sanitizeImageDimension(value) : null;
        if (safeValue) {
          element.setAttribute(attributeName, safeValue);
        } else if (value) {
          element.removeAttribute(attributeName);
        }
      }
    }

    if (element.tagName.toLowerCase() === 'a') {
      element.setAttribute('rel', 'noopener noreferrer');
      if (element.hasAttribute('target') === false) {
        element.setAttribute('target', '_blank');
      }
    }
  });

  return parsed.body.innerHTML.trim();
}

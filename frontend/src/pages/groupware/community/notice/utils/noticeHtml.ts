import { sanitizeHtml } from '../../../../../shared/utils/sanitizeHtml';

function removePrettyPrintBreakIndentation(root: HTMLElement): void {
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  const nodesToRemove: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (
      node.parentElement?.closest('table') &&
      node.previousSibling?.nodeName === 'BR'
    ) {
      const prettyPrintPrefix = node.data.match(/^\r?\n[\t ]*/)?.[0];
      if (prettyPrintPrefix) {
        node.data = node.data.slice(prettyPrintPrefix.length);
      }
      if (!node.data) nodesToRemove.push(node);
    }
  }

  nodesToRemove.forEach((node) => node.remove());
}

export function sanitizeNoticeBodyHtml(html: string): string {
  return sanitizeHtml(html, { preserveTextStyles: true });
}

export function prepareNoticeFeedHtml(html: string): string {
  const sanitizedHtml = sanitizeNoticeBodyHtml(html);
  if (typeof DOMParser === 'undefined') {
    return sanitizedHtml;
  }

  const document = new DOMParser().parseFromString(sanitizedHtml, 'text/html');
  removePrettyPrintBreakIndentation(document.body);
  Array.from(document.body.querySelectorAll('table')).forEach((table) => {
    if (table.parentElement?.closest('.tableWrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'tableWrapper';
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });

  return document.body.innerHTML.trim();
}

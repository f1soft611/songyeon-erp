import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export const COMMENT_MENTION_CLASS = 'comment-mention';

export type MentionCandidate =
  | { kind: 'all' }
  | { kind: 'user'; userId: string; name: string; departmentName?: string };

const ALL_KEYWORDS = ['all', '전체'];

export function filterMentionCandidates(
  options: Array<{ userId: string; name: string; departmentName?: string }>,
  query: string,
): MentionCandidate[] {
  const keyword = query.trim().toLowerCase();
  const users = options
    .filter((option) => !keyword
      || option.name.toLowerCase().includes(keyword)
      || (option.departmentName ?? '').toLowerCase().includes(keyword))
    .sort((left, right) => {
      if (!keyword) return 0;
      return Number(!left.name.toLowerCase().startsWith(keyword))
        - Number(!right.name.toLowerCase().startsWith(keyword));
    })
    .map((option): MentionCandidate => ({ kind: 'user', ...option }));
  const includeAll = !keyword || ALL_KEYWORDS.some((word) => word.startsWith(keyword));
  return includeAll ? [{ kind: 'all' }, ...users] : users;
}

const ALL_MENTION_PATTERN = /(^|\s)@ALL(?=$|[\s.,!?;:])/i;

function containsMentionOf(text: string, name: string): boolean {
  const token = `@${name}`;
  let index = text.indexOf(token);
  while (index >= 0) {
    const before = index === 0 ? '' : text[index - 1];
    const after = text[index + token.length] ?? '';
    if ((before === '' || /\s/.test(before)) && (after === '' || /[\s.,!?;:)]/.test(after))) return true;
    index = text.indexOf(token, index + 1);
  }
  return false;
}

// Selections are kept in state, so drop ones whose "@name" text was deleted before submitting.
export function resolveSubmittedMentions(
  text: string,
  selectedUserIds: string[],
  options: Array<{ userId: string; name: string }>,
  selectedAll: boolean,
): { mentionedUserIds: string[]; mentionAll: boolean } {
  const names = new Map(options.map((option) => [option.userId, option.name]));
  const mentionedUserIds = selectedUserIds.filter((userId, index) => {
    const name = names.get(userId);
    return selectedUserIds.indexOf(userId) === index && Boolean(name) && containsMentionOf(text, name as string);
  });
  return { mentionedUserIds, mentionAll: selectedAll && ALL_MENTION_PATTERN.test(text) };
}

// Mentions start a word: "@name" after start/whitespace, stopping at whitespace or punctuation.
const MENTION_PATTERN = /(^|\s)(@[^\s@.,!?;:()[\]{}<>"']+)/g;
const SKIPPED_TAGS = new Set(['A', 'CODE', 'PRE']);

function findMentionRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  MENTION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    const start = match.index + match[1].length;
    ranges.push({ start, end: start + match[2].length });
  }
  return ranges;
}

function isInsideSkippedTag(node: Node): boolean {
  let parent = node.parentElement;
  while (parent) {
    if (SKIPPED_TAGS.has(parent.tagName)) return true;
    parent = parent.parentElement;
  }
  return false;
}

export function highlightMentionsInHtml(html: string): string {
  if (typeof DOMParser === 'undefined' || !html.includes('@')) return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  textNodes.forEach((textNode) => {
    if (isInsideSkippedTag(textNode)) return;
    const text = textNode.data;
    const ranges = findMentionRanges(text);
    if (ranges.length === 0) return;
    const fragment = doc.createDocumentFragment();
    let cursor = 0;
    ranges.forEach(({ start, end }) => {
      if (start > cursor) fragment.appendChild(doc.createTextNode(text.slice(cursor, start)));
      const span = doc.createElement('span');
      span.className = COMMENT_MENTION_CLASS;
      span.textContent = text.slice(start, end);
      fragment.appendChild(span);
      cursor = end;
    });
    if (cursor < text.length) fragment.appendChild(doc.createTextNode(text.slice(cursor)));
    textNode.replaceWith(fragment);
  });
  return doc.body.innerHTML;
}

function buildMentionDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return;
    if (node.marks.some((mark) => mark.type.name === 'link' || mark.type.name === 'code')) return;
    findMentionRanges(node.text).forEach(({ start, end }) => {
      decorations.push(Decoration.inline(position + start, position + end, {
        class: COMMENT_MENTION_CLASS,
      }));
    });
  });
  return DecorationSet.create(doc, decorations);
}

export const MentionHighlight = Extension.create({
  name: 'mentionHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mentionHighlight'),
        props: {
          decorations: (state) => buildMentionDecorations(state.doc),
        },
      }),
    ];
  },
});

export const commentMentionSx = {
  [`& .${COMMENT_MENTION_CLASS}`]: {
    color: 'primary.main',
    bgcolor: 'rgba(25, 118, 210, 0.12)',
    borderRadius: '4px',
    fontWeight: 700,
    px: '3px',
    py: '1px',
  },
} as const;

export type NoticeCategoryPresentation = {
  backgroundColor: string;
};

const lightFallback: NoticeCategoryPresentation = {
  backgroundColor: '#1d4ed8',
};

const darkFallback: NoticeCategoryPresentation = {
  backgroundColor: '#60a5fa',
};

export function getNoticeCategoryPresentation(
  noticeGubunCode: string | null | undefined,
  isDark: boolean,
): NoticeCategoryPresentation {
  const normalizedCode = noticeGubunCode?.trim();

  if (!normalizedCode) {
    return isDark ? darkFallback : lightFallback;
  }

  let hash = 0;
  for (const character of normalizedCode) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined) {
      hash = (hash * 31 + codePoint) >>> 0;
    }
  }

  const hue = hash % 360;
  return {
    backgroundColor: isDark
      ? `hsl(${hue}, 65%, 55%)`
      : `hsl(${hue}, 75%, 42%)`,
  };
}

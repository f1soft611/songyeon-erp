import { useEffect, type RefObject } from 'react';

// 그리드 칸 편집창에서 앞의 고정 글자(예: 포장유형 'PACK-', 창고 'WH-')를 지우거나 그 앞에 끼워 넣지 못하게 한다.
// F1-Grid 는 편집창 앞에 고정 글자를 붙이는 기능이 없고(손대지 않는다), 편집창은 보통 input 이라
// 그 칸을 감싼 곳에서 입력 이벤트를 먼저 받아 고친다.

export type FixedPrefixEdit = { value: string; caret: number };

// 한 번의 입력(beforeinput)을 고정 글자 규칙으로 고친다.
// - 'pass': 그대로 둔다(고정 글자 뒤만 바뀜)
// - 'block': 막는다(고정 글자를 지우는 입력)
// - { value, caret }: 고정 글자는 두고 나머지만 바꾼 값으로 대신 넣는다
export function applyFixedPrefix(
  value: string,
  start: number,
  end: number,
  inputType: string,
  data: string | null,
  prefix: string,
): 'pass' | 'block' | FixedPrefixEdit {
  if (!value.startsWith(prefix)) return 'pass';
  const p = prefix.length;
  const collapsed = start === end;
  const backward = /Backward$/.test(inputType);
  const isDelete = inputType.startsWith('delete');
  if (collapsed) {
    if (isDelete && (backward ? start <= p : start < p)) return 'block';
    if (isDelete || start >= p) return 'pass';
  } else if (start >= p) {
    return 'pass';
  }
  // 고친 범위가 고정 글자 안쪽까지 걸친다: 고정 글자 뒤로 옮겨 적용한다
  const inserted = isDelete ? '' : data ?? '';
  const rest = value.slice(Math.max(end, p));
  return { value: prefix + inserted + rest, caret: p + inserted.length };
}

// 고정 글자가 통째로 빠진 값(예: 칸을 고르고 바로 글자를 쳐서 값이 바뀐 경우)에 다시 붙인다. 이미 있으면 그대로
export function withFixedPrefix(value: string, prefix: string): string {
  if (value.startsWith(prefix)) return value;
  const head = prefix.replace(/-$/, '');
  const upper = value.toUpperCase();
  const body = upper.startsWith(prefix) ? value.slice(prefix.length) : upper.startsWith(head) ? value.slice(head.length).replace(/^-/, '') : value;
  return prefix + body;
}

const setInputValue = (input: HTMLInputElement, next: string, caret: number) => {
  // React 가 관리하는 input 값은 원래 setter 로 바꾸고 input 이벤트를 다시 보내야 화면 상태에도 들어간다
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.setSelectionRange(caret, caret);
};

// container 안에서 cellClassName 이 붙은 칸의 편집창에만 고정 글자 규칙을 건다
export function useFixedPrefixInput(container: RefObject<HTMLElement | null>, cellClassName: string, prefix: string) {
  useEffect(() => {
    const root = container.current;
    if (!root) return undefined;
    const targetInput = (event: Event): HTMLInputElement | null => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return null;
      return input.closest(`.${cellClassName}`) ? input : null;
    };
    const onBeforeInput = (event: Event) => {
      const input = targetInput(event);
      if (!input) return;
      const e = event as InputEvent;
      const result = applyFixedPrefix(input.value, input.selectionStart ?? 0, input.selectionEnd ?? 0, e.inputType, e.data, prefix);
      if (result === 'pass') return;
      event.preventDefault();
      if (result !== 'block') setInputValue(input, result.value, result.caret);
    };
    const onInput = (event: Event) => {
      const input = targetInput(event);
      if (!input || input.value.startsWith(prefix)) return;
      const next = withFixedPrefix(input.value, prefix);
      setInputValue(input, next, next.length);
    };
    // 편집창에 들어오면 커서를 고정 글자 뒤로(앞에 놓이지 않게)
    const onFocusIn = (event: Event) => {
      const input = targetInput(event);
      if (!input) return;
      if (!input.value.startsWith(prefix)) {
        const next = withFixedPrefix(input.value, prefix);
        setInputValue(input, next, next.length);
      } else if ((input.selectionStart ?? 0) < prefix.length) {
        input.setSelectionRange(Math.max(prefix.length, input.selectionEnd ?? 0), Math.max(prefix.length, input.selectionEnd ?? 0));
      }
    };
    // 그리드는 편집 중에도 Delete 키를 '칸 비우기'로 받아 편집을 끝낸다. 이 칸에서는 글자 하나 지우기로만 쓰게 그리드에 넘기지 않는다
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && targetInput(event)) event.stopPropagation();
    };
    root.addEventListener('keydown', onKeyDown, true);
    root.addEventListener('beforeinput', onBeforeInput, true);
    root.addEventListener('input', onInput, true);
    root.addEventListener('focusin', onFocusIn, true);
    return () => {
      root.removeEventListener('keydown', onKeyDown, true);
      root.removeEventListener('beforeinput', onBeforeInput, true);
      root.removeEventListener('input', onInput, true);
      root.removeEventListener('focusin', onFocusIn, true);
    };
  }, [container, cellClassName, prefix]);
}

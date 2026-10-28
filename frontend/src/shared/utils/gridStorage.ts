// F1-Grid 는 storageKey 로 칸 순서 · 폭 · 숨김 · 고정을 브라우저(localStorage)에 저장한다.
// 저장된 순서에 없는 칸(새로 더한 칸)은 맨 끝에 붙는다(columns/GridColumnManagement.ts reorderGridColumns).
// 그러면 화면에 정해 둔 자리가 아니라 단추 칸 뒤 같은 엉뚱한 곳에 보인다.
// F1-Grid 는 S_ERP 것을 그대로 쓰므로 여기서 그리드를 그리기 전에 맞춰 둔다:
// 저장된 순서에 지금 칸이 하나라도 빠져 있으면 그 저장값을 지워 정해 둔 순서로 다시 시작한다(폭 · 숨김 설정도 함께 처음으로).
export function resetGridStorageIfColumnsChanged(storageKey: string, fields: string[]): boolean {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return false;
    const order: unknown = JSON.parse(raw)?.order;
    if (!Array.isArray(order)) return false;
    const saved = new Set(order.map(String));
    if (fields.every((field) => saved.has(field))) return false;
    window.localStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

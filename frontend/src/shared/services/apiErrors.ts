export class ApiResponseError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
  }
}

export class ApiNetworkError extends Error {
  constructor() {
    super('서버에 연결하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
    this.name = 'ApiNetworkError';
  }
}

export function isRequestAborted(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null &&
    'name' in cause && cause.name === 'AbortError';
}

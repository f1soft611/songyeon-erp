import type {
  F1GridEditorType,
  F1GridFilter,
  F1GridSort,
} from '../types/grid.types';
import { applyGridFilters } from '../filter/GridFilter';
import { sortGridRows } from '../sorting/GridSort';

export type GridQueryRequest<T extends object> = {
  requestId: number;
  rows: T[];
  sorts: F1GridSort<T>[];
  filters: F1GridFilter<T>[];
  columnTypes: Record<string, F1GridEditorType | undefined>;
};

export type GridQueryResponse<T extends object> = {
  requestId: number;
  rows: T[];
};

export function runGridQuery<T extends object>(
  request: GridQueryRequest<T>,
): GridQueryResponse<T> {
  const columns = Object.entries(request.columnTypes).map(([field, type]) => ({
    field: field as keyof T,
    headerName: field,
    type,
  }));
  const filtered = applyGridFilters(request.rows, request.filters, columns);
  return {
    requestId: request.requestId,
    rows: sortGridRows(filtered, request.sorts),
  };
}

export type GridQueryWorkerClient<T extends object> = {
  query(
    request: Omit<GridQueryRequest<T>, 'requestId'>,
  ): Promise<GridQueryResponse<T>>;
  dispose(): void;
};

export function createGridQueryWorkerClient<T extends object>(
  worker: Worker,
): GridQueryWorkerClient<T> {
  let nextRequestId = 0;
  let latestRequestId = 0;
  const pending = new Map<
    number,
    {
      resolve: (response: GridQueryResponse<T>) => void;
      reject: (error: Error) => void;
    }
  >();

  worker.onmessage = (event: MessageEvent<GridQueryResponse<T>>) => {
    const response = event.data;
    const request = pending.get(response.requestId);
    pending.delete(response.requestId);
    if (!request || response.requestId !== latestRequestId) return;
    request.resolve(response);
  };
  worker.onerror = () => {
    const error = new Error('F1Grid query worker failed.');
    pending.forEach(({ reject }) => reject(error));
    pending.clear();
  };

  return {
    query(request) {
      const requestId = ++nextRequestId;
      latestRequestId = requestId;
      pending.forEach(({ reject }) =>
        reject(new Error('F1Grid query superseded.')),
      );
      pending.clear();
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        worker.postMessage({ ...request, requestId });
      });
    },
    dispose() {
      worker.terminate();
      pending.forEach(({ reject }) =>
        reject(new Error('F1Grid query worker disposed.')),
      );
      pending.clear();
    },
  };
}

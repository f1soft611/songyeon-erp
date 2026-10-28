import type {
  F1GridDataSource,
  F1GridDataSourceQuery,
  F1GridDataSourceResult,
} from '../types/grid.types';

type QueryWithoutSignal<T extends object> = Omit<
  F1GridDataSourceQuery<T>,
  'signal'
>;

export type GridDataSourceController<T extends object> = {
  load(
    dataSource: F1GridDataSource<T>,
    query: QueryWithoutSignal<T>,
  ): Promise<F1GridDataSourceResult<T> | undefined>;
  dispose(): void;
};

export function createGridDataSourceController<
  T extends object,
>(): GridDataSourceController<T> {
  let requestId = 0;
  let abortController: AbortController | undefined;

  return {
    async load(dataSource, query) {
      abortController?.abort();
      abortController = new AbortController();
      const currentRequestId = ++requestId;
      try {
        const result = await dataSource.load({
          ...query,
          signal: abortController.signal,
        });
        return currentRequestId === requestId ? result : undefined;
      } catch (error) {
        if (abortController.signal.aborted || currentRequestId !== requestId) {
          return undefined;
        }
        throw error;
      }
    },
    dispose() {
      requestId += 1;
      abortController?.abort();
      abortController = undefined;
    },
  };
}

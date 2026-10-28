/// <reference lib="webworker" />

import { runGridQuery, type GridQueryRequest } from './GridQueryEngine';

self.onmessage = (
  event: MessageEvent<GridQueryRequest<Record<string, unknown>>>,
) => {
  self.postMessage(runGridQuery(event.data));
};

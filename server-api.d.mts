import type { IncomingMessage, ServerResponse } from 'node:http';
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>;
export function createSearchMiddleware(options?: {
  fetchImpl?: typeof fetch;
  contact?: string;
  searchLimit?: number;
  imageLimit?: number;
  windowMs?: number;
  now?: () => number;
}): Middleware;
export const searchMiddleware: Middleware;

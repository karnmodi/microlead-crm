/**
 * Fetch API `Response` shape when global `Response` is resolved to Express types
 * (e.g. Vercel TypeScript + @types/express).
 */
export type FetchHttpResponse = {
  json(): Promise<unknown>;
  text(): Promise<string>;
  ok: boolean;
  statusText: string;
  status: number;
};

import type { QueryClient } from '@tanstack/react-query';

export function invalidate(qc: QueryClient, prefixes: string[]) {
  return qc.invalidateQueries({ predicate: (q) => prefixes.includes(String(q.queryKey[0])) });
}

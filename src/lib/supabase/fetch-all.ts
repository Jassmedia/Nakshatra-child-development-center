import "server-only";

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * Supabase returns at most 1000 rows per request by default ("Max rows").
 * Reports and totals must see ALL rows, so this fetches page by page.
 * `make(from, to)` must build a fresh query with .range(from, to) and a stable order.
 */
export async function fetchAll<T>(make: (from: number, to: number) => Page<T>, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await make(from, from + pageSize - 1);
    if (error) throw new Error("Could not load data");
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) return out;
  }
}

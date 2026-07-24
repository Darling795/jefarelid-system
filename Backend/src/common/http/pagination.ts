/**
 * List envelope marker. Controllers/services return `new Paginated(rows, meta)`
 * and the TransformInterceptor serializes it as { data, meta }.
 */
export class Paginated<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: { page: number; pageSize: number; total: number },
  ) {}
}

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** Parse `page`/`pageSize` query params into safe skip/take values. */
export function parsePagination(query: {
  page?: string | number;
  pageSize?: string | number;
}): PageParams {
  const page = Math.max(1, Number(query.page) || 1);
  const rawSize = Number(query.pageSize) || 20;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

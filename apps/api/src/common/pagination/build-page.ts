export interface PageInfo {
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

/**
 * `rows` must come from a query with LIMIT limit + 1.
 * The extra row only signals that another page exists; it is never returned.
 */
export function buildPage<T>(
  rows: readonly T[],
  limit: number,
  cursorFor: (lastItem: T) => string,
): Page<T> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`);
  }
  if (rows.length <= limit) {
    return {
      items: [...rows],
      pageInfo: {
        hasNextPage: false,
        nextCursor: null,
      },
    };
  }

  const items = rows.slice(0, limit);

  return {
    items,
    pageInfo: {
      hasNextPage: true,
      nextCursor: cursorFor(items[items.length - 1]!),
    },
  };
}

export type PaginationQuery = {
  page: number;
  limit: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

export function paginationArgs({ page, limit }: PaginationQuery) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

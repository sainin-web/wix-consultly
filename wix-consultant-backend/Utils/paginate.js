/**
 * Optional pagination for list endpoints.
 * Returns null when the client sent no `page`/`limit` (legacy callers keep the
 * old "everything" response); otherwise { page, limit, skip }.
 */
function parsePage(query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) {
  if (query.page === undefined && query.limit === undefined) return null;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function pageMeta({ page, limit }, total) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasMore: page < totalPages };
}

module.exports = { parsePage, pageMeta };

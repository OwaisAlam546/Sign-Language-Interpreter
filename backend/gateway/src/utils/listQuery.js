// ─────────────────────────────────────────────────────────────
//  utils/listQuery.js — REUSABLE PAGINATION · SEARCH · FILTERING
//  One engine powers every list endpoint (translations, feedback,
//  notifications, prediction logs, admin users). Each service
//  declares WHAT it allows (whitelists), this util never trusts
//  the raw query string directly.
// ─────────────────────────────────────────────────────────────
const { PAGINATION } = require('../constants');

// Escape regex metacharacters so a search like "C++" is matched
// literally, not interpreted as a pattern.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parse an Express query object into safe query options.
 * @param {object} query           req.query
 * @param {object} opts
 * @param {string[]} opts.searchFields  fields regex-searched by ?search=
 * @param {object} opts.filterFields    { queryParam: modelField } — exact-match whitelist
 * @param {object} opts.sortMap         { sortKey: { field: dir } } whitelist for ?sort=
 * @returns {{conditions, sort, page, limit, skip}}
 */
function buildListQuery(query = {}, { searchFields = [], filterFields = {}, sortMap = {} } = {}) {
  // 1. Pagination — clamp the numbers so page=9999 or limit=10000 can't hurt us.
  const page = Math.max(1, parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT)
  );

  // 2. Search — case-insensitive regex across ONLY the whitelisted fields.
  const conditions = {};
  if (query.search && searchFields.length) {
    const re = new RegExp(escapeRegex(String(query.search)), 'i');
    conditions.$or = searchFields.map((field) => ({ [field]: re }));
  }

  // 3. Filtering — exact matches (enum/status/category...) from the whitelist.
  for (const [param, field] of Object.entries(filterFields)) {
    if (query[param] === undefined || query[param] === '') continue;
    conditions[field] = query[param];
  }

  // 4. Sorting — only named sorts from the whitelist; default = first entry.
  const [firstKey, firstSort] = Object.entries(sortMap)[0] || ['newest', { createdAt: -1 }];
  const sort = sortMap[query.sort] || firstSort || { createdAt: -1 };

  return {
    conditions,
    sort,
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

/**
 * Run a paginated query and count the total in parallel.
 * Returns { items, meta } — meta is the same shape everywhere so the
 * frontend can render ONE pager component for every list.
 */
async function paginate(model, conditions, { sort, page, limit, skip }) {
  const [total, items] = await Promise.all([
    model.countDocuments(conditions),
    model.find(conditions).sort(sort).skip(skip).limit(limit).lean(),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    },
  };
}

module.exports = { buildListQuery, paginate, escapeRegex };
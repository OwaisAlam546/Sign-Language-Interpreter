// ─────────────────────────────────────────────────────────────
//  utils/ApiResponse.js — STANDARD SUCCESS ENVELOPE
//  Every successful response is: { success:true, data, meta? }
//  Controllers use these helpers instead of res.json directly,
//  so the envelope can never drift between endpoints.
// ─────────────────────────────────────────────────────────────
function ok(res, data, meta, status = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, data, meta) {
  return ok(res, data, meta, 201);
}

function noContent(res) {
  return res.status(204).end();
}

module.exports = { ok, created, noContent };

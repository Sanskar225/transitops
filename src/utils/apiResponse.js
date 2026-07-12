function ok(res, data = null, meta = null, statusCode = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data = null, meta = null) {
  return ok(res, data, meta, 201);
}

module.exports = { ok, created };

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const NUMERIC_RE = /^\d+$/;

function sanitizeDocIds(docIds) {
  if (!Array.isArray(docIds)) return null;
  const clean = docIds
    .map(id => String(id).trim())
    .filter(id => UUID_RE.test(id) || NUMERIC_RE.test(id));
  return clean.length > 0 ? clean : null;
}

function buildNotebookFilter(notebookId, docIds) {
  const must = [{ key: "metadata.notebookId", match: { value: String(notebookId) } }];
  const sanitized = sanitizeDocIds(docIds);
  if (sanitized) {
    must.push({ key: "metadata.docId", match: { any: sanitized } });
  }
  return { must };
}

module.exports = { sanitizeDocIds, buildNotebookFilter };

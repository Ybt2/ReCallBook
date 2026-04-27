const { buildNotebookFilter } = require("./validation");

const TOP_K = 25;

function deduplicateSearchResults(rawResults) {
  const map = new Map();
  rawResults.flat().forEach(([doc, score]) => {
    const key = doc.metadata.source_ref + doc.pageContent.slice(0, 50);
    if (!map.has(key) || score > map.get(key).score) {
      map.set(key, { doc, score });
    }
  });
  return [...map.values()].sort((a, b) => b.score - a.score).map(item => item.doc);
}

async function searchDocuments(vectorStore, queries, notebookId, docIds = null) {
  const filter = buildNotebookFilter(notebookId, docIds);

  const rawResults = await Promise.all(
    queries.map(q => vectorStore.similaritySearchWithScore(q, TOP_K, filter))
  );
  return deduplicateSearchResults(rawResults);
}

module.exports = { searchDocuments };

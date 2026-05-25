const { getLabels } = require("./languageLabels");

function buildContext(docs, userLanguage = "English") {
  const L = getLabels(userLanguage);
  return docs
    .map((doc, i) => {
      return `[${L.document} ${i + 1}] (${L.location}: ${doc.metadata.source_ref})\n${L.content}: ${doc.pageContent.trim()}`;
    })
    .join("\n\n");
}

function parsePageNumber(ref) {
  if (!ref) return null;
  const m = String(ref).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function extractSources(answer, docs) {
  const citationMatches = [...answer.matchAll(/\[(\d+)\]/g)];

  const indices = [...new Set(
    citationMatches
      .map(m => parseInt(m[1], 10))
      .filter(i => i >= 1 && i <= docs.length)
  )];

  return indices.map(i => {
    const doc = docs[i - 1];
    const ref = doc.metadata.source_ref || "N/A";
    return {
      index: i,
      source: doc.metadata.source_name || "Document",
      source_name: doc.metadata.source_name || "Document",
      reference: ref,
      source_ref: ref,
      docId: doc.metadata.docId || null,
      page: parsePageNumber(ref),
      text: doc.pageContent.slice(0, 600).trim(),
    };
  });
}

module.exports = {
  buildContext,
  extractSources,
};

function buildContext(docs) {
  return docs
    .map((doc, i) => {
      return `[Documento ${i + 1}] (Localização: ${doc.metadata.source_ref})\nConteúdo: ${doc.pageContent.trim()}`;
    })
    .join("\n\n");
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
    return {
      index: i,
      source: doc.metadata.source_name || "Document",
      reference: doc.metadata.source_ref || "N/A",
      text: doc.pageContent.slice(0, 250).trim() + "..."
    };
  });
}

module.exports = {
  buildContext,
  extractSources,
};

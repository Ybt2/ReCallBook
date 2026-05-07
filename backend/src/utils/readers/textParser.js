const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const path = require("path");
const fs = require("fs");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 300,
  separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
});

async function parseText(filePath, notebookId, docId, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const sourceType = ext === ".md" ? "md" : "txt";
  const raw = fs.readFileSync(filePath, "utf8");

  const baseDoc = new Document({
    pageContent: raw,
    metadata: { source: filePath },
  });

  console.log(`Text loaded: ${originalname} | Characters: ${raw.length}`);

  const splittedDocs = await splitter.splitDocuments([baseDoc]);

  console.log(`Split into ${splittedDocs.length} chunks`);

  const processedChunks = splittedDocs.map((chunk, idx) => {
    return new Document({
      pageContent: chunk.pageContent.trim(),
      metadata: {
        notebookId: String(notebookId),
        docId: docId,
        source_type: sourceType,
        source_name: originalname,
        source_ref: `Part ${idx + 1}`,
        chunk_index: idx,
      },
    });
  });

  return {
    chunks: processedChunks,
    summary: {
      totalPages: 1,
      totalChunks: processedChunks.length,
      fileName: path.basename(filePath),
      avgChunkSize: processedChunks.length
        ? Math.round(processedChunks.reduce((sum, c) => sum + c.pageContent.length, 0) / processedChunks.length)
        : 0,
    },
  };
}

module.exports = { parseText };

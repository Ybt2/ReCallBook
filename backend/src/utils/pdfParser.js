const { Document } = require("@langchain/core/documents");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const path = require("path");
const fs = require("fs");

// Optimized splitter for better context preservation
// Larger chunks for better semantic coherence, good overlap for context continuity
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,      // Slightly larger chunks (was 1000)
  chunkOverlap: 300,    // Increased overlap (was 200) for better context
  separators: [
    "\n\n",             // Paragraph breaks (highest priority)
    "\n",               // Line breaks
    ". ",               // Sentence breaks
    "! ",
    "? ",
    " ",                // Words
    ""                  // Characters (last resort)
  ],
});

async function parsePDF(filePath, notebookId, docId, originalname) {
  const loader = new PDFLoader(filePath, { parsedItemSeparator: "" });
  const docs = await loader.load();
  
  console.log(`📄 PDF loaded: ${originalname} | Pages: ${docs.length}`);
  
  const splittedDocs = await splitter.splitDocuments(docs);
  
  console.log(`✂️ Split into ${splittedDocs.length} chunks`);

  // IMPORTANTE: Criar instâncias da classe Document com melhor metadata
  const processedChunks = splittedDocs.map((chunk, idx) => {
    return new Document({
      pageContent: chunk.pageContent.trim(), // Remove excess whitespace
      metadata: {
        notebookId: String(notebookId),
        docId: docId,
        source_type: "pdf",
        source_name: originalname,
        source_ref: chunk.metadata.loc?.pageNumber 
          ? `Pág. ${chunk.metadata.loc.pageNumber}` 
          : "S/N",
        chunk_index: idx, // Track chunk order for reference
      },
    });
  });

  return {
    chunks: processedChunks, 
    summary: {
      totalPages: docs.length,
      totalChunks: processedChunks.length,
      fileName: path.basename(filePath),
      avgChunkSize: Math.round(processedChunks.reduce((sum, c) => sum + c.pageContent.length, 0) / processedChunks.length)
    },
  };
}

async function cleanTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = { parsePDF, cleanTempFile };
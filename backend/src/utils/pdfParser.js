const { Document } = require("@langchain/core/documents");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const path = require("path");
const fs = require("fs");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,      
  chunkOverlap: 300,    
  separators: [
    "\n\n",             
    "\n",               
    ". ",               
    "! ",
    "? ",
    " ",                
    ""                  
  ],
});

async function parsePDF(filePath, notebookId, docId, originalname) {
  const loader = new PDFLoader(filePath, { parsedItemSeparator: "" });
  const docs = await loader.load();
  
  console.log(`PDF loaded: ${originalname} | Pages: ${docs.length}`);
  
  const splittedDocs = await splitter.splitDocuments(docs);
  
  console.log(`Split into ${splittedDocs.length} chunks`);

  const processedChunks = splittedDocs.map((chunk, idx) => {
    return new Document({
      pageContent: chunk.pageContent.trim(), 
      metadata: {
        notebookId: String(notebookId),
        docId: docId,
        source_type: "pdf",
        source_name: originalname,
        source_ref: chunk.metadata.loc?.pageNumber 
          ? `Pág. ${chunk.metadata.loc.pageNumber}` 
          : "S/N",
        chunk_index: idx, 
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
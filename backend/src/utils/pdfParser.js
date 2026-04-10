const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const path = require("path");
const fs = require("fs");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

async function parsePDF(filePath) {
  const loader = new PDFLoader(filePath, { parsedItemSeparator: "" });
  const docs = await loader.load();
  const chunks = await splitter.splitDocuments(docs);

  return {
    chunks: chunks.map((c) => c.pageContent),
    metadata: {
      totalPages: docs[0]?.metadata?.pdf?.totalPages || 0,
      source: path.basename(filePath),
    },
  };
}

async function cleanTempFile(filePath) {
  fs.unlinkSync(filePath);
}

module.exports = { parsePDF, cleanTempFile };
const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const fs = require("fs");
const path = require("path");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OCR_MODEL = "glm-ocr";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg"];

const EXT_TO_TYPE = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".svg": "svg",
};

const OCR_PROMPT = `Analyze this image carefully.

1. First, try to extract ALL text visible in the image. If you find text, return it faithfully preserving the original structure (paragraphs, lists, tables, headings, etc.).

2. If there is NO readable text in the image, provide a detailed description of what the image contains — objects, colors, layout, diagrams, charts, people, scenes, or any visual information that could be useful for understanding the image.

Always respond in the same language as any text found. If no text is found, respond in English.`;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 300,
  separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
});

async function doFetch(url, opts) {
  if (typeof fetch === "function") return fetch(url, opts);
  const nf = require("node-fetch");
  return nf(url, opts);
}

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function getImageType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return EXT_TO_TYPE[ext] || "image";
}

async function processImage(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString("base64");

  const response = await doFetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OCR_MODEL,
      prompt: OCR_PROMPT,
      images: [base64Image],
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`glm-ocr responded with status ${response.status}: ${body}`);
  }

  const json = await response.json();
  const content = json.response || "";

  return content.trim();
}

async function parseImage(filePath, notebookId, docId, originalname) {
  const extractedText = await processImage(filePath);
  const sourceType = getImageType(originalname);

  console.log(`Image OCR [${sourceType}]: ${originalname} | ${extractedText.length} chars`);

  const rawDoc = new Document({
    pageContent: extractedText,
    metadata: { source: originalname },
  });

  const splittedDocs = await splitter.splitDocuments([rawDoc]);

  console.log(`Split into ${splittedDocs.length} chunks`);

  const processedChunks = splittedDocs.map((chunk, idx) => {
    return new Document({
      pageContent: chunk.pageContent.trim(),
      metadata: {
        notebookId: String(notebookId),
        docId: docId,
        source_type: sourceType,
        source_name: originalname,
        source_ref: "Imagem",
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
      avgChunkSize: processedChunks.length > 0
        ? Math.round(processedChunks.reduce((sum, c) => sum + c.pageContent.length, 0) / processedChunks.length)
        : 0,
    },
  };
}

module.exports = { processImage, parseImage, isImageFile, getImageType, IMAGE_EXTENSIONS };

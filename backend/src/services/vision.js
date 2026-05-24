const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HumanMessage } = require("@langchain/core/messages");
const fs = require("fs");
const path = require("path");

const { createLlm } = require("./agent");

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg"];

const EXT_TO_TYPE = {
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".svg": "svg",
};

function buildVisionPrompt(userLanguage = "English") {
  const { getLabels } = require("../utils/languageLabels");
  const labels = getLabels(userLanguage);
  return `Analyze this image carefully.

1. First, try to extract ALL text visible in the image. If you find text, return it faithfully preserving the original structure (paragraphs, lists, tables, headings, etc.).

2. If there is NO readable text in the image, provide a detailed description of what the image contains — objects, colors, layout, diagrams, charts, people, scenes, or any visual information that could be useful for understanding the image.

Always respond in the same language as any text found. ${labels.visionFallback}`;
}

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 300,
  separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
});

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function getImageType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return EXT_TO_TYPE[ext] || "image";
}

async function processImage(filePath, visionModel, userLanguage = "English") {
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString("base64");
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";

  return processImageBase64(base64Image, mimeType, visionModel, userLanguage);
}

async function processImageBase64(base64, mimeType = "image/png", visionModel, userLanguage = "English") {
  if (!visionModel) return "";
  const message = new HumanMessage({
    content: [
      { type: "text", text: buildVisionPrompt(userLanguage) },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
    ],
  });

  const lm = createLlm(visionModel);
  const response = await lm.invoke([message]);
  return (response.content || "").trim();
}

async function parseImage(filePath, notebookId, docId, originalname, visionModel, userLanguage = "English") {
  const extractedText = await processImage(filePath, visionModel, userLanguage);
  const sourceType = getImageType(originalname);

  console.log(`Image Vision [${sourceType}]: ${originalname} | ${extractedText.length} chars`);

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

module.exports = { processImage, processImageBase64, parseImage, isImageFile, getImageType, IMAGE_EXTENSIONS };
const { Document } = require("@langchain/core/documents");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { processImageBase64 } = require("../../services/vision");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,
  chunkOverlap: 300,
  separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
});

const MIN_IMAGE_WIDTH = 100;
const MIN_IMAGE_HEIGHT = 100;
const MAX_IMAGES_PER_PAGE = 5;

async function extractPDFImages(filePath) {
  let pdfDocument = null;
  try {
    const { getDocument, GlobalWorkerOptions, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    GlobalWorkerOptions.workerSrc = `file://${require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")}`;

    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = getDocument({ data, disableFontFace: true, isEvalSupported: false });
    pdfDocument = await loadingTask.promise;

    const results = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const ops = await page.getOperatorList();
      const pageImages = [];

      const imageNames = new Set();
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        if (fn === OPS.paintImageXObject) {
          imageNames.add(ops.argsArray[i][0]);
        } else if (fn === OPS.paintInlineImageXObject) {
          const imgData = ops.argsArray[i][0];
          if (imgData && imgData.data && imgData.width >= MIN_IMAGE_WIDTH && imgData.height >= MIN_IMAGE_HEIGHT) {
            pageImages.push({ pageNum, imgData });
          }
        }
      }

      for (const name of imageNames) {
        if (pageImages.length >= MAX_IMAGES_PER_PAGE) break;
        try {
          const imgData = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("timeout")), 5000);
            page.objs.get(name, (data) => {
              clearTimeout(timer);
              resolve(data);
            });
          });
          if (imgData && imgData.data && imgData.width >= MIN_IMAGE_WIDTH && imgData.height >= MIN_IMAGE_HEIGHT) {
            pageImages.push({ pageNum, imgData });
          }
        } catch {
          // skip unresolvable image
        }
      }

      results.push(...pageImages.slice(0, MAX_IMAGES_PER_PAGE));
      page.cleanup();
    }

    return results;
  } catch (e) {
    console.warn(`[pdfParser] image extraction failed: ${e.message}`);
    return [];
  } finally {
    if (pdfDocument) {
      try { pdfDocument.destroy(); } catch (_) {}
    }
  }
}

async function imageDataToPngBase64(imgData) {
  const { width, height, data, kind } = imgData;
  // kind: 1=GRAYSCALE_1BPP(packed), 2=RGB_24BPP, 3=RGBA_32BPP
  if (kind === 1) {
    // Expand 1-bit packed grayscale to 8-bit
    const totalPixels = width * height;
    const expanded = Buffer.alloc(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      expanded[i] = (data[i >> 3] & (0x80 >> (i & 7))) ? 255 : 0;
    }
    return (await sharp(expanded, { raw: { width, height, channels: 1 } }).png().toBuffer()).toString("base64");
  }
  const channels = kind === 3 ? 4 : 3;
  return (await sharp(Buffer.from(data.buffer ? data.buffer : data, data.byteOffset || 0, data.byteLength || data.length), {
    raw: { width, height, channels },
  }).png().toBuffer()).toString("base64");
}

async function parsePDF(filePath, notebookId, docId, originalname) {
  const loader = new PDFLoader(filePath, { parsedItemSeparator: "" });
  const docs = await loader.load();

  console.log(`PDF loaded: ${originalname} | Pages: ${docs.length}`);

  const splittedDocs = await splitter.splitDocuments(docs);

  console.log(`Split into ${splittedDocs.length} chunks`);

  let chunkIdx = 0;
  const textChunks = splittedDocs.map((chunk) => {
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
        chunk_index: chunkIdx++,
      },
    });
  });

  // Extract and describe images embedded in the PDF
  const imageChunks = [];
  try {
    const images = await extractPDFImages(filePath);
    console.log(`[pdfParser] Found ${images.length} images in ${originalname}`);

    for (const { pageNum, imgData } of images) {
      try {
        const base64 = await imageDataToPngBase64(imgData);
        const description = await processImageBase64(base64, "image/png");
        if (!description) continue;

        const rawDoc = new Document({
          pageContent: description,
          metadata: { source: originalname },
        });
        const imageSplit = await splitter.splitDocuments([rawDoc]);

        for (const chunk of imageSplit) {
          imageChunks.push(new Document({
            pageContent: chunk.pageContent.trim(),
            metadata: {
              notebookId: String(notebookId),
              docId: docId,
              source_type: "pdf_image",
              source_name: originalname,
              source_ref: `Pág. ${pageNum}`,
              page: pageNum,
              chunk_index: chunkIdx++,
            },
          }));
        }
        console.log(`[pdfParser] Image on page ${pageNum} described: ${description.length} chars`);
      } catch (e) {
        console.warn(`[pdfParser] Failed to describe image on page ${pageNum}: ${e.message}`);
      }
    }
  } catch (e) {
    console.warn(`[pdfParser] Image pipeline error: ${e.message}`);
  }

  const allChunks = [...textChunks, ...imageChunks];

  return {
    chunks: allChunks,
    summary: {
      totalPages: docs.length,
      totalChunks: allChunks.length,
      fileName: path.basename(filePath),
      avgChunkSize: allChunks.length > 0
        ? Math.round(allChunks.reduce((sum, c) => sum + c.pageContent.length, 0) / allChunks.length)
        : 0,
    },
  };
}

async function cleanTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = { parsePDF, cleanTempFile };

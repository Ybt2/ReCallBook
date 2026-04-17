const { QdrantClient } = require("@qdrant/js-client-rest");
const { QdrantVectorStore } = require("@langchain/qdrant");
const embeddings = require("../services/embeddings");

const client = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });
const COLLECTION_NAME = "recallbook_chunks";

async function initQdrant() {
  const collections = await client.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

  if (!exists) {
    await client.createCollection(COLLECTION_NAME, {
      vectors: { 
        size: 1024, 
        distance: "Cosine" 
      },
      sparse_vectors: {
        "text-sparse": {
          index: {
            full_scan_threshold: 1000
          }
        }
      }
    });
    
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: "pageContent",
      field_schema: "text",
    });

    console.log(`Qdrant: Coleção ${COLLECTION_NAME} criada.`);
  }
}

async function getVectorStore() {
  return new QdrantVectorStore(embeddings, {
    client,
    collectionName: COLLECTION_NAME,
  });
}

module.exports = { client, initQdrant, getVectorStore, COLLECTION_NAME };
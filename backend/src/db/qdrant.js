const { QdrantClient } = require("@qdrant/js-client-rest");
const { QdrantVectorStore } = require("@langchain/qdrant");
const embeddings = require("../services/embeddings");

const client = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });
const COLLECTION_NAME = "recallbook_chunks";

/**
 * Garante que a coleção existe no Qdrant com a configuração correta
 */
async function initQdrant() {
  const collections = await client.getCollections();
  const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

  if (!exists) {
    // Para o BGE-M3, o tamanho do vetor costuma ser 1024. 
    // Nota: O LangChain pode criar automaticamente, mas é mais seguro definir aqui.
    await client.createCollection(COLLECTION_NAME, {
      vectors: { size: 1024, distance: "Cosine" }
    });
    console.log(`✅ Qdrant: Coleção ${COLLECTION_NAME} criada.`);
  }
}

/**
 * Retorna uma instância do VectorStore do LangChain para operações
 */
async function getVectorStore() {
  return new QdrantVectorStore(embeddings, {
    client,
    collectionName: COLLECTION_NAME,
  });
}

module.exports = { client, initQdrant, getVectorStore, COLLECTION_NAME };
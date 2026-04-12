const { pipeline, env } = require('@xenova/transformers');
const path = require('path');

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = path.join(__dirname, 'models');

let instance = null;

async function getReranker() {
    if (instance) return instance;

    try {
        // O nome aqui tem de corresponder à subpasta dentro de 'models/'
        // ex: models/cross-encoder/ → usa 'cross-encoder'
        instance = await pipeline('text-classification', 'cross-encoder', {
            quantized: true,   // true = procura model_int8.onnx, false = model.onnx
        });

        console.log("✅ Cross-Encoder carregado com sucesso (local)");
        return instance;

    } catch (err) {
        console.error("❌ Erro fatal ao carregar o modelo:");
        console.error(err);
        throw err;
    }
}

async function rerank(query, docs, finalK = 6) {
    if (!query || !docs || docs.length === 0) return [];

    try {
        const model = await getReranker();
        console.log(`--- Iniciando Rerank de ${docs.length} documentos ---`);

        const scoredDocs = await Promise.all(
            docs.map(async (doc, i) => {
                const output = await model(String(query), {
                    text_pair: String(doc.pageContent || ""),
                    top_k: 1
                });

                const score = output?.[0]?.score ?? 0;
                // Log de cada documento e o seu score
                console.log(`Doc ${i+1} [${doc.metadata.source_ref}]: Score ${score.toFixed(4)}`);
                return { doc, score };
            })
        );

        const sorted = scoredDocs.sort((a, b) => b.score - a.score);
        console.log(`✅ Rerank concluído. Melhor score: ${sorted[0]?.score.toFixed(4)}`);

        return sorted.slice(0, finalK).map(item => item.doc);

    } catch (error) {
        console.error("❌ Erro no Reranker:", error);
        return docs.slice(0, finalK);
    }
}

module.exports = {
    rerank
};
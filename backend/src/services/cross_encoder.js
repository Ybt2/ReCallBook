// cross_encoder.js
const { env, AutoTokenizer, XLMRobertaModel } = require('@huggingface/transformers');

env.cacheDir = './models';

const model_id = 'jinaai/jina-reranker-v2-base-multilingual';
let model = null;
let tokenizer = null;

async function initCross_encoder() {
    if (!model || !tokenizer) {
        console.log("A carregar tokenizer...");
        tokenizer = await AutoTokenizer.from_pretrained(model_id);
        console.log("Tokenizer OK. A carregar modelo...");
        model = await XLMRobertaModel.from_pretrained(model_id, { dtype: 'fp16' });
        console.log("✅ Modelo de reranking pronto.");
    }
}

async function rerank(query, documents, top_k = 6) { // top_k ajustado para 6
    if (!documents || documents.length === 0) return [];
    
    try {
        await initCross_encoder();
        console.log(`--- Iniciando Rerank de ${documents.length} documentos ---`);

        const textDocs = documents.map(d => d.pageContent);

        // Tokenização em Batch
        const inputs = tokenizer(
            new Array(textDocs.length).fill(String(query)),
            { text_pair: textDocs, padding: true, truncation: true }
        );

        // Inferência
        const { logits } = await model(inputs);

        // Normalização e Mapeamento
        const scoredDocs = logits.sigmoid().tolist()
            .map(([score], i) => {
                const doc = documents[i];
                // Log exatamente igual ao segundo código
                console.log(`Doc ${i + 1} [${doc.metadata?.source_ref ?? 'N/A'}]: Score ${score.toFixed(4)}`);
                return { doc, score };
            });

        // Ordenação
        const sorted = scoredDocs.sort((a, b) => b.score - a.score);
        
        console.log(`Rerank concluído. Melhor score: ${sorted[0]?.score.toFixed(4)}`);

        // Retorno igual ao segundo código
        return sorted.slice(0, top_k).map(res => res.doc);
        
    } catch (error) {
        console.error("Erro no Reranker:", error);
        return documents.slice(0, top_k);
    }
}

module.exports = {
    rerank,
    initCross_encoder
};
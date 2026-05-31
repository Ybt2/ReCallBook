const { env, AutoTokenizer, XLMRobertaModel } = require('@huggingface/transformers');

env.cacheDir = './models';

const model_id = 'jinaai/jina-reranker-v2-base-multilingual';
let model = null;
let tokenizer = null;
let unloadTimer = null;
let loadPromise = null;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function scheduleUnload() {
  if (unloadTimer) clearTimeout(unloadTimer);
  unloadTimer = setTimeout(() => {
    if (model) {
      model.dispose?.();
      model = null;
    }
    tokenizer = null;
    loadPromise = null;
    unloadTimer = null;
    console.log("[cross_encoder] Model unloaded from RAM after idle timeout");
  }, IDLE_TIMEOUT_MS);
}

async function initCross_encoder() {
    if (model && tokenizer) {
        scheduleUnload();
        return;
    }
    if (!loadPromise) {
        loadPromise = (async () => {
            console.log("[cross_encoder] Loading tokenizer...");
            tokenizer = await AutoTokenizer.from_pretrained(model_id);
            console.log("[cross_encoder] Tokenizer OK. Loading model...");
            model = await XLMRobertaModel.from_pretrained(model_id, { dtype: 'fp16' });
            console.log("[cross_encoder] Reranking model ready.");
        })();
    }
    await loadPromise;
    scheduleUnload();
}

async function rerank(query, documents, top_k = 6) {
    if (!documents || documents.length === 0) return [];
    
    try {
        await initCross_encoder();
        console.log(`[cross_encoder] Reranking ${documents.length} documents`);

        const textDocs = documents.map(d => d.pageContent);

        const inputs = tokenizer(
            new Array(textDocs.length).fill(String(query)),
            { text_pair: textDocs, padding: true, truncation: true }
        );

        const { logits } = await model(inputs);

        const scoredDocs = logits.sigmoid().tolist()
            .map(([score], i) => {
                const doc = documents[i];
                console.log(`[cross_encoder] Doc ${i + 1} [${doc.metadata?.source_ref ?? 'N/A'}]: Score ${score.toFixed(4)}`);
                return { doc, score };
            });

        const sorted = scoredDocs.sort((a, b) => b.score - a.score);
        
        console.log(`[cross_encoder] Rerank done. Best score: ${sorted[0]?.score.toFixed(4)}`);

        scheduleUnload();
        return sorted.slice(0, top_k).map(res => res.doc);
        
    } catch (error) {
        console.error("[cross_encoder] Reranker error:", error);
        return documents.slice(0, top_k);
    }
}

module.exports = {
    rerank,
    initCross_encoder
};
const { z } = require("zod");
const llm = require("./agent");
const { getVectorStore } = require("../db/qdrant");
const { getEncoding } = require("js-tiktoken");

const enc = getEncoding("cl100k_base");

const ChatResponseSchema = z.object({
  texto_final: z.string().describe("Resposta detalhada com marcadores [1], [2]"),
  fontes: z.array(
    z.object({
      indice: z.number().describe("O número correspondente ao marcador no texto"),
      documento_nome: z.string().describe("Nome do ficheiro PDF"),
      pagina: z.number().optional().describe("Número da página"),
      trecho_original: z.string().describe("O texto exato usado para a resposta")
    })
  ).default([])
});

const structuredChat = llm.withStructuredOutput(ChatResponseSchema);

async function chatWithAi(notebookId, userMessage, history) {
  const vectorStore = await getVectorStore();

  // 1. Corrigimos a filtragem. 
  // Se o teu log diz que o notebookId está dentro de 'metadata', 
  // o Qdrant geralmente indexa como 'metadata.notebookId' ou apenas 'notebookId'.
  // Vamos usar o caminho que o teu JSON confirmou:
  const searchResults = await vectorStore.similaritySearch(userMessage, 5, {
    must: [
      {
        key: "metadata.notebookId", 
        match: { value: String(notebookId) } // Convertemos para String por segurança
      }
    ]
  });

  // LOG DE DEBUG - Se isto der 0, muda a key acima para "notebookId" (sem o metadata.)
  console.log(`🔍 Chunks encontrados: ${searchResults.length} para o Notebook: ${notebookId}`);

  // 2. Formatar os pedaços (Ajustado para bater com o teu JSON)
  const contextText = searchResults
    .map((doc, i) => {
      // Verificamos onde estão as chaves no teu objeto real
      const source = doc.metadata.file_name || doc.metadata.docId || "Documento";
      const page = doc.metadata.page_number || "S/N";
      return `[Doc ${i + 1}]: ${doc.pageContent} (Fonte: ${source}, Pág: ${page})`;
    })
    .join("\n\n");

  const prompt = `
You are a specialized academic tutor. Your task is to answer the user's question based EXCLUSIVELY on the provided Context and Chat History.

INSTRUCTIONS:
1. Use the Context below to answer. If the information is not in the context, say "Não encontrei essa informação nos documentos."
2. IMPORTANT: The user is studying ALBERTO CAEIRO (Portuguese poet). Do NOT confuse him with Albert Einstein.
3. Every time you use information from a document, you MUST:
   - Insert a numerical marker like [1], [2] at the end of the sentence.
   - Add the source details to the "fontes" array in the JSON.

CONTEXT FROM DOCUMENTS:
${contextText}

CHAT HISTORY:
${history}

USER QUESTION:
${userMessage}

Respond ONLY with a valid JSON following the schema.
`;

  try {
    const response = await structuredChat.invoke(prompt);

    // CALCULAR TOKENS
    // Contamos o que enviámos + o que a IA devolveu (convertendo o JSON para string)
    const inputTokens = enc.encode(prompt).length;
    const outputTokens = enc.encode(JSON.stringify(response)).length;
    const totalTokens = inputTokens + outputTokens;

    return {
      ...response,
      usage: { totalTokens }
    };
  } catch (error) {
    console.error("Erro na invocação do LLM:", error);
    throw error;
  }
}

module.exports = { chatWithAi };
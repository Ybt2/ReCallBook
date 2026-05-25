/**
 * Language-aware labels and messages for the two supported languages.
 */

const LABELS = {
  English: {
    user: "User",
    assistant: "Assistant",
    document: "Document",
    location: "Location",
    content: "Content",
    noResults: "No relevant information found.",
    aiError: (msg) => `AI model error: ${msg}`,
    visionFallback: "If no text is found, respond in English.",
  },
  Portuguese: {
    user: "Utilizador",
    assistant: "Assistente",
    document: "Documento",
    location: "Localização",
    content: "Conteúdo",
    noResults: "Não foi encontrada informação relevante.",
    aiError: (msg) => `Erro do modelo de IA: ${msg}`,
    visionFallback: "Se não for encontrado texto, responda em Português.",
  },
};

function getLabels(userLanguage) {
  return LABELS[userLanguage] || LABELS.English;
}

module.exports = { getLabels };

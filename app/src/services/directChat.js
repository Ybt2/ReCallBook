const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

/**
 * Call Ollama /api/chat with proper message format.
 * Uses the model's chat template (correct behavior) but direct HTTP (fast).
 */
async function directChat(model, messages, options = {}) {
  const { temperature = 0, num_predict = 2048 } = options;
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature, num_predict },
    }),
  });
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
  const data = await res.json();
  const usage = {
    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    promptTokens: data.prompt_eval_count || 0,
    completionTokens: data.eval_count || 0,
  };
  return {
    text: (data.message?.content || "").trim().replace(/^```[a-z]*\n?|```$/gi, ""),
    usage,
    model,
  };
}

/**
 * Stream from Ollama /api/chat with proper message format.
 */
async function directChatStream(model, messages, onToken, options = {}) {
  const { temperature = 0, num_predict = 2048 } = options;
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature, num_predict },
    }),
  });
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`);

  let full = "";
  let lastUsage = null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("{")) continue;
        try {
          const obj = JSON.parse(trimmed);
          if (obj.message?.content) {
            full += obj.message.content;
            try { onToken(obj.message.content); } catch (_) {}
          }
          if (obj.done) {
            lastUsage = {
              totalTokens: (obj.prompt_eval_count || 0) + (obj.eval_count || 0),
              promptTokens: obj.prompt_eval_count || 0,
              completionTokens: obj.eval_count || 0,
            };
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    console.error("[directChatStream] Error:", e.message);
    throw e;
  }

  return {
    text: full.trim().replace(/^```[a-z]*\n?|```$/gi, ""),
    usage: lastUsage || null,
    model,
  };
}

/**
 * Generate structured JSON output via direct Ollama /api/chat.
 */
async function directChatJson(model, systemPrompt, userPrompt, schema, options = {}) {
  const { temperature = 0, num_predict = 4096, maxRetries = 1 } = options;
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt + "\n\nIMPORTANT: Your response must be ONLY valid JSON. No markdown, no code blocks, no explanations, no extra text." }
  ];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await directChat(model, messages, { temperature, num_predict });
    let text = result.text.trim();
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) text = jsonMatch[1].trim();
    try {
      const parsed = JSON.parse(text);
      if (schema) {
        const validated = schema.parse(parsed);
        return validated;
      }
      return parsed;
    } catch (err) {
      console.error(`[directChatJson] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, err.message);
      if (attempt === maxRetries) {
        throw new Error(`Failed to parse JSON after ${maxRetries + 1} attempts: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

module.exports = { directChat, directChatStream, directChatJson, OLLAMA_URL };

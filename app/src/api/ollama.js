const express = require("express");
const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

async function doFetch(url, opts, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) return res;
      if (res.status < 500) return res;
      if (i === retries) return res;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

// GET /api/ollama/models  -> list installed models
router.get("/models", async (req, res) => {
  try {
    const r = await doFetch(`${OLLAMA_URL}/api/tags`);
    if (!r.ok) throw new Error(`Ollama responded ${r.status}`);
    const json = await r.json();
    const models = (json.models || []).map((m) => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at,
      family: m.details?.family,
      parameterSize: m.details?.parameter_size,
    }));
    res.json({ models });
  } catch (err) {
    console.error("[ollama] list failed:", err.message);
    res.status(502).json({ error: `Ollama unavailable: ${err.message}` });
  }
});

// POST /api/ollama/show  -> get model details (capabilities)
router.post("/show", async (req, res) => {
  try {
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: "model is required." });

    const r = await doFetch(`${OLLAMA_URL}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    if (!r.ok) throw new Error(`Ollama responded ${r.status}`);
    const json = await r.json();
    res.json(json);
  } catch (err) {
    console.error("[ollama] show failed:", err.message);
    res.status(502).json({ error: `Ollama unavailable: ${err.message}` });
  }
});

// POST /api/ollama/pull  -> SSE-stream install progress
// body: { name: "llama3.2:3b" }
router.post("/pull", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required." });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const ollamaRes = await doFetch(`${OLLAMA_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, stream: true }),
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      send("error", { message: `Ollama responded ${ollamaRes.status}` });
      return res.end();
    }

    let buffer = "";
    const decoder = new TextDecoder();

    for await (const chunk of ollamaRes.body) {
      buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);
          // Normalise: { status, total?, completed? }
          const payload = {
            status: obj.status || "working",
            total: obj.total || 0,
            completed: obj.completed || 0,
            percent:
              obj.total && obj.completed
                ? Math.min(100, Math.round((obj.completed / obj.total) * 100))
                : null,
            error: obj.error || null,
          };
          send("progress", payload);
          if (obj.error) {
            send("error", { message: obj.error });
            return res.end();
          }
        } catch (_) {
          // ignore non-JSON line
        }
      }
    }

    send("done", { name });
    res.end();
  } catch (err) {
    console.error("[ollama] pull failed:", err.message);
    try { send("error", { message: err.message }); } catch (_) {}
    res.end();
  }
});

module.exports = router;

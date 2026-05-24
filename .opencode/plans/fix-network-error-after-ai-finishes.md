# Fix: Network error after AI finishes generating

## Root Cause

In `backend/src/api/chat.js`, the SSE stream endpoint sends the `done` event **after** performing database INSERT operations (lines 289-308). If the DB insert fails (connection issue, constraint violation, etc.), the catch block sends an `error` event instead, but `send("done")` was never called. This means:

1. AI generates answer → tokens stream to frontend ✅
2. `onStage("done")` called → stages show as complete ✅
3. DB INSERT fails ❌
4. `error` event sent → frontend shows "Error: ..." message bubble ❌
5. `done` event never sent → `onDone` never fires → assistant message never added to chat ❌

## Fix

### 1. Backend: Send `done` event BEFORE DB writes (`backend/src/api/chat.js`)

Move `send("done")` and `res.end()` to happen immediately after `chatWithAi()` returns, before any DB operations. The DB persistence should run as a fire-and-forget background task so the client gets a clean completion regardless of DB status.

**Replace lines 284-318** with:

```javascript
    const elapsedSecs = (Date.now() - startTime) / 1000;
    const tempoProc = secsToTime(elapsedSecs);
    const usedModel = aiResponse.model || chatModel;
    const totalTokens = aiResponse.usage?.totalTokens ?? 0;

    // Send "done" to client BEFORE DB writes so the stream completes cleanly
    // even if the background persistence fails.
    send("done", {
      id: 0, // Real ID will be available on next message fetch
      content: aiResponse.texto_final,
      sources: aiResponse.fontes,
      model: usedModel,
      tokens: totalTokens,
      processingTime: elapsedSecs.toFixed(2),
    });
    res.end();

    // Persist to DB in the background — client already received the response
    (async () => {
      try {
        const [result] = await pool.query(
          `INSERT INTO Mensagens
           (notebooks_ID, role, conteudo, modelo_ai, LOGS, tempo_processamento, num_tokens)
           VALUES (?, 'assistant', ?, ?, ?, ?, ?)`,
          [
            notebookId,
            JSON.stringify({ texto_final: aiResponse.texto_final, fontes: aiResponse.fontes }),
            usedModel,
            "SUCCESS",
            tempoProc,
            totalTokens,
          ]
        );

        await appendLog("NoteBooks", "ID", notebookId, "chat_answered", {
          messageId: result.insertId,
          model: usedModel,
          tokens: totalTokens,
          processingTime: elapsedSecs.toFixed(2),
        });
      } catch (dbError) {
        console.error("Background DB persistence failed:", dbError);
      }
    })();
```

Also **remove/update the catch block** (lines 319-327) since we no longer need to send error events after headers are sent for DB failures:

```javascript
  } catch (error) {
    console.error("Stream error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "An error occurred.", code: "STREAM_ERROR", status: 500 });
    }
    // If headers were already sent (done event sent), the client already has the response.
    // Log the error for debugging but don't send anything else.
  }
```

### 2. Frontend: Add guard in onError (`frontend/src/stores/notebook.js`)

Add a check so `onError` doesn't show an error message if `onDone` already completed (i.e., `this.streaming` is already null):

**In `onError` handler (around line 201-222), add early return:**

```javascript
            onError: (m) => {
              if (m === "Request cancelled") {
                this.streaming = null;
                this.streamAbortController = null;
                return;
              }
              // If onDone already fired, streaming is null — don't show error
              if (!this.streaming) return;
              
              this.messages = this.messages.filter(
                (msg) => msg.id !== optimistic.id
              );
              // ... rest of error handling
```

## Why this works

- The client receives the `done` event immediately after AI generation completes
- DB persistence happens asynchronously and failures are logged but don't affect the client
- The frontend has a defensive guard to prevent error messages after successful completion
- On next page load, messages are fetched from DB so the persisted data will appear correctly

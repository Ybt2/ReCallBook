const { pool } = require("../db/init");

function ts() {
  return new Date().toISOString();
}

function entry(event, details = {}) {
  return JSON.stringify({ ts: ts(), event, ...details });
}

/**
 * Append a log line to a row's LOGS TEXT column.
 * Safe: errors only emit warnings; never blocks the main flow.
 */
async function appendLog(table, pkColumn, pkValue, event, details = {}) {
  const line = entry(event, details);
  try {
    await pool.query(
      `UPDATE \`${table}\` SET LOGS = CONCAT_WS('\n', LOGS, ?) WHERE \`${pkColumn}\` = ?`,
      [line, pkValue]
    );
  } catch (e) {
    console.warn(`[logger] failed appending log on ${table}:`, e.message);
  }
}

function consoleLog(scope, event, details = {}) {
  console.log(`[${scope}] ${event}`, details && Object.keys(details).length ? details : "");
}

module.exports = { appendLog, consoleLog, entry };

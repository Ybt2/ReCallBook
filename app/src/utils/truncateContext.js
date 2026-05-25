/**
 * Truncate a string to a maximum number of characters.
 * If truncation occurs, a notice is appended so the LLM knows content was cut.
 */
function truncateContext(str, maxChars = 24000) {
  if (!str || str.length <= maxChars) return str;
  const notice = "\n\n[Additional content truncated due to length limits.]";
  const sliceLength = maxChars - notice.length;
  return str.slice(0, Math.max(sliceLength, 0)) + notice;
}

module.exports = { truncateContext };

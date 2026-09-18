/** Call directly from a user action. No clipboard read, DOM, telemetry or storage. */
export async function copyPlainText(text, environment = globalThis) {
  if (typeof text !== 'string') throw new TypeError('Expected a string');
  if (text.length === 0) return { status: 'empty' };
  if (!environment.isSecureContext || typeof environment.navigator?.clipboard?.writeText !== 'function') {
    return { status: 'manual', text, reason: 'unavailable' };
  }
  try {
    await environment.navigator.clipboard.writeText(text);
    return { status: 'copied' };
  } catch {
    // Do not log user content or browser permission errors to analytics.
    return { status: 'manual', text, reason: 'rejected' };
  }
}


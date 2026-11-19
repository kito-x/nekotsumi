/** Local seed/run-id helpers. Not security-sensitive; never sent anywhere. */
export function randomSeed(): number {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues !== undefined) {
    const words = new Uint32Array(1);
    cryptoApi.getRandomValues(words);
    const value = words[0] ?? 0;
    if (value !== 0) return value;
  }
  const fallback = (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) >>> 0;
  return fallback === 0 ? 0x6d2b79f5 : fallback;
}

export function newRunId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID();
  return `run-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

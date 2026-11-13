/**
 * Genuine uniform random integer generator from 1 to 20 using the browser or Node
 * Web Crypto API with rejection sampling to eliminate modulo bias.
 */
export function rollCryptographicD20(): number {
  const maxUnbiased = Math.floor(256 / 20) * 20; // 240
  const buffer = new Uint8Array(1);

  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    while (true) {
      globalThis.crypto.getRandomValues(buffer);
      const val = buffer[0];
      if (val < maxUnbiased) {
        return (val % 20) + 1;
      }
    }
  }

  // Fallback only for environments without Web Crypto
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Validates that a manual/physical or digital D20 roll is an integer in [1, 20].
 */
export function isValidD20Roll(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 20;
}

/**
 * Chooses a random starting player ('p1' | 'p2') using unbiased cryptographic randomness.
 */
export function chooseRandomStarter(): 'p1' | 'p2' {
  const d20 = rollCryptographicD20();
  return d20 <= 10 ? 'p1' : 'p2';
}

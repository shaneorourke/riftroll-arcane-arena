export function rollBand(naturalRoll: number): 'low' | 'mid' | 'high' {
  if (naturalRoll <= 5) return 'low';
  return naturalRoll >= 16 ? 'high' : 'mid';
}

export const rollPresentation = {
  low: { size: .72, particles: 16, pitch: 1.22, duration: .68 },
  mid: { size: 1, particles: 32, pitch: 1, duration: 1 },
  high: { size: 1.38, particles: 55, pitch: .8, duration: 1.3 },
};

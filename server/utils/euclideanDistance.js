/**
 * Compute Euclidean distance between two 128-dimension descriptor arrays.
 * Lower distance = more similar faces.
 * Threshold: <= 0.6 = same person, 0.6-0.7 = low confidence, > 0.7 = different person
 */
export function euclideanDistance(d1, d2) {
  if (d1.length !== d2.length) {
    throw new Error(`Descriptor length mismatch: ${d1.length} vs ${d2.length}`);
  }
  return Math.sqrt(d1.reduce((sum, val, i) => sum + Math.pow(val - d2[i], 2), 0));
}

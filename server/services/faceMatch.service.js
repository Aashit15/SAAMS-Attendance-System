import { euclideanDistance } from '../utils/euclideanDistance.js';

/**
 * Match one incoming descriptor against one student's stored descriptors.
 * Uses average of the best 3 distances instead of just the single best,
 * which is much more robust against false positives.
 */
export function matchStudent(incoming, student) {
  const distances = student.faceDescriptors.map(stored => euclideanDistance(incoming, stored));
  distances.sort((a, b) => a - b);
  
  // Use average of best 3 distances (if available) for more reliable matching
  const topN = Math.min(3, distances.length);
  const avgDistance = distances.slice(0, topN).reduce((sum, d) => sum + d, 0) / topN;
  const bestDistance = distances[0];
  
  return { 
    studentId: student._id, 
    name: student.name, 
    distance: avgDistance,    // Average of top-3 for reliability
    bestDistance: bestDistance // Keep single best for reference
  };
}

/**
 * Find the best matching student from a list (bulk mode).
 * Also checks that the best match is significantly better than the second-best
 * to avoid ambiguous matches.
 */
export function findBestMatch(incomingDescriptor, students, threshold = 0.35) {
  const results = students.map(s => matchStudent(incomingDescriptor, s));
  results.sort((a, b) => a.distance - b.distance);
  
  const best = results[0];
  if (!best || best.distance > threshold) return null;
  
  // Ensure the best match is significantly better than the 2nd best
  if (results.length >= 2) {
    const secondBest = results[1];
    const margin = secondBest.distance - best.distance;
    if (margin < 0.08) return null; // Too ambiguous — both faces are similarly close
  }
  
  return best;
}

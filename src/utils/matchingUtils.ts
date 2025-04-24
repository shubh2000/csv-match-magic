
/**
 * Utilities for fuzzy matching between CSV headers
 */

// Calculate similarity between two strings (simple Levenshtein-like implementation)
export const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Simple word matching - exact matches get 100%
  if (s1 === s2) return 100;
  
  // Check for word inclusion
  if (s1.includes(s2) || s2.includes(s1)) {
    // Length ratio determines how much of one string is in the other
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    return Math.floor(ratio * 80); // Max 80% for inclusion
  }
  
  // For more complex cases, use character-by-character comparison
  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    if (s2.includes(s1[i])) matches++;
  }
  
  const matchRatio = matches / Math.max(s1.length, s2.length);
  return Math.floor(matchRatio * 60); // Max 60% for partial character matching
};

// Find the best matches for a source header from target headers
export const findBestMatches = (
  sourceHeader: string,
  targetHeaders: string[],
  threshold: number = 30,
  maxMatches: number = 3
): Array<{ header: string; similarity: number }> => {
  const matches = targetHeaders.map(targetHeader => ({
    header: targetHeader,
    similarity: calculateSimilarity(sourceHeader, targetHeader)
  }));
  
  // Sort by similarity (highest first) and filter by threshold
  return matches
    .filter(match => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxMatches);
};

// Generate the complete mapping with suggestions
export const generateHeaderMapping = (
  sourceHeaders: string[],
  targetHeaders: string[],
  threshold: number = 30,
  maxMatches: number = 3
): Array<{
  sourceHeader: string;
  suggestions: Array<{ header: string; similarity: number }>;
  selectedMatch: string | null;
}> => {
  return sourceHeaders.map(sourceHeader => {
    const suggestions = findBestMatches(
      sourceHeader,
      targetHeaders,
      threshold,
      maxMatches
    );
    
    return {
      sourceHeader,
      suggestions,
      selectedMatch: suggestions.length > 0 ? suggestions[0].header : null
    };
  });
};

// Create the final mapping result
export const createMappingResult = (
  mapping: Array<{
    sourceHeader: string;
    selectedMatch: string | null;
  }>
): Record<string, string | null> => {
  return mapping.reduce((result, { sourceHeader, selectedMatch }) => {
    return {
      ...result,
      [sourceHeader]: selectedMatch
    };
  }, {});
};

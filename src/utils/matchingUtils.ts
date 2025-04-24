
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

// Check if a column could be a unique identifier by scanning data
export const detectPotentialUniqueKeys = (
  headers: string[], 
  data: string[][]
): string[] => {
  // Filter out columns that have empty values or duplicates
  const uniqueKeys: string[] = [];
  
  headers.forEach((header, index) => {
    // Extract all values for this column
    const columnValues = data.map(row => row[index]);
    
    // Check if all values are present and unique
    const hasEmptyValues = columnValues.some(value => !value || value.trim() === '');
    if (hasEmptyValues) return;
    
    // Check for duplicates
    const uniqueValues = new Set(columnValues);
    if (uniqueValues.size === columnValues.length) {
      uniqueKeys.push(header);
    }
  });

  return uniqueKeys;
};

// Find the best match for a unique key between two files
export const findMatchingUniqueKeys = (
  sourceHeaders: string[],
  sourceData: string[][],
  targetHeaders: string[],
  targetData: string[][]
): Array<{
  sourceHeader: string;
  targetHeader: string;
  confidence: number;
  matchingValues: number;
}> => {
  // First, detect potential unique keys in both files
  const sourceUniqueKeys = detectPotentialUniqueKeys(sourceHeaders, sourceData);
  const targetUniqueKeys = detectPotentialUniqueKeys(targetHeaders, targetData);
  
  if (sourceUniqueKeys.length === 0 || targetUniqueKeys.length === 0) {
    return [];
  }
  
  const matches: Array<{
    sourceHeader: string;
    targetHeader: string;
    confidence: number;
    matchingValues: number;
  }> = [];
  
  // For each potential source key, check against all target keys
  sourceUniqueKeys.forEach(sourceKey => {
    const sourceKeyIndex = sourceHeaders.indexOf(sourceKey);
    const sourceValues = sourceData.map(row => row[sourceKeyIndex]);
    
    targetUniqueKeys.forEach(targetKey => {
      const targetKeyIndex = targetHeaders.indexOf(targetKey);
      const targetValues = targetData.map(row => row[targetKeyIndex]);
      
      // Count matching values
      const matchingValueCount = sourceValues.filter(value => 
        targetValues.includes(value)
      ).length;
      
      // Calculate confidence based on matching percentage and name similarity
      const valueMatchPercentage = matchingValueCount / sourceValues.length * 100;
      const nameSimilarity = calculateSimilarity(sourceKey, targetKey);
      
      // Combined confidence (weighted average)
      const confidence = (valueMatchPercentage * 0.7) + (nameSimilarity * 0.3);
      
      matches.push({
        sourceHeader: sourceKey,
        targetHeader: targetKey,
        confidence: Math.round(confidence),
        matchingValues: matchingValueCount
      });
    });
  });
  
  // Sort by confidence (descending)
  return matches.sort((a, b) => b.confidence - a.confidence);
};


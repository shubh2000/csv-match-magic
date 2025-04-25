
/**
 * Utility functions for parsing and handling CSV files
 */

// Detect the most likely header row in a CSV file with potential metadata
const detectHeaderRow = (lines: string[]): number => {
  // Skip empty lines at the beginning
  let startIndex = 0;
  while (startIndex < lines.length && lines[startIndex].trim() === '') {
    startIndex++;
  }
  
  // If the file has fewer than 5 lines, assume the first non-empty line is the header
  if (lines.length < 5) {
    return startIndex;
  }
  
  // Score system for finding the most likely header row
  const rowScores: number[] = [];
  
  for (let i = startIndex; i < Math.min(startIndex + 20, lines.length); i++) {
    const line = lines[i];
    const cells = line.split(',').map(cell => cell.trim());
    
    // Empty rows get low scores
    if (cells.every(cell => cell === '')) {
      rowScores.push(-10);
      continue;
    }
    
    let score = 0;
    
    // Header characteristics:
    // 1. Headers often have shorter text than data rows
    const avgCellLength = cells.reduce((sum, cell) => sum + cell.length, 0) / cells.length;
    if (avgCellLength < 15) score += 5;
    
    // 2. Headers often don't contain numeric values
    const numericCellCount = cells.filter(cell => !isNaN(Number(cell)) && cell !== '').length;
    if (numericCellCount / cells.length < 0.3) score += 10;
    
    // 3. Headers typically don't have empty cells
    const emptyCellCount = cells.filter(cell => cell === '').length;
    if (emptyCellCount / cells.length < 0.1) score += 5;
    
    // 4. Headers often have capitalization or special words
    const specialWordCount = cells.filter(cell => 
      cell.includes("ID") || 
      cell.includes("Name") || 
      cell.includes("Date") || 
      /^[A-Z][a-z]+$/.test(cell) || // CamelCase
      cell.includes("_") // snake_case
    ).length;
    if (specialWordCount > 0) score += specialWordCount * 2;
    
    // 5. Check if next few rows after this one have similar structure
    // This helps identify table headers in files with multiple tables
    if (i + 1 < lines.length) {
      const nextRowCells = lines[i + 1].split(',').map(cell => cell.trim());
      // If next row has the same number of cells, it might be a data row
      if (nextRowCells.length === cells.length) {
        score += 10;
        
        // If the next row has more numeric values, this is likely a header
        const nextNumericCount = nextRowCells.filter(cell => !isNaN(Number(cell))).length;
        if (nextNumericCount > numericCellCount) score += 5;
      }
    }
    
    rowScores.push(score);
  }
  
  // Find row with highest score
  let maxScore = -Infinity;
  let headerRowIndex = startIndex;
  
  for (let i = 0; i < rowScores.length; i++) {
    if (rowScores[i] > maxScore) {
      maxScore = rowScores[i];
      headerRowIndex = i + startIndex;
    }
  }
  
  console.log('Detected header row at index:', headerRowIndex, 'with score:', maxScore);
  return headerRowIndex;
};

// Find common structure between two CSV files
const findCommonStructure = (
  sourceLines: string[], 
  targetLines: string[]
): { sourceHeaderIndex: number; targetHeaderIndex: number } => {
  const sourceHeaderIndex = detectHeaderRow(sourceLines);
  const targetHeaderIndex = detectHeaderRow(targetLines);
  
  return { sourceHeaderIndex, targetHeaderIndex };
};

// Parse a CSV file and extract headers and data, handling complex structures
export const parseCSVFile = async (file: File): Promise<{
  headers: string[];
  data: string[][];
  headerRowIndex: number;
}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      
      // Detect the most likely header row
      const headerRowIndex = detectHeaderRow(lines);
      
      // Extract headers from the detected header row
      const headers = lines[headerRowIndex].split(",").map(header => header.trim());
      
      // Extract data rows (all rows after the header)
      const data = lines.slice(headerRowIndex + 1)
        .map(line => line.split(",").map(cell => cell.trim()))
        .filter(row => row.length === headers.length && row.some(cell => cell.trim() !== '')); // Ensure complete non-empty rows
      
      console.log(`Parsed CSV with ${headers.length} headers and ${data.length} data rows`);
      
      resolve({ headers, data, headerRowIndex });
    };
    
    reader.readAsText(file);
  });
};

// Get a preview of the CSV data for display
export const getCSVPreview = (headers: string[], data: string[][]): string[][] => {
  return [headers, ...data.slice(0, 5)];
};

// Convert a parsed CSV object to a downloadable blob
export const createCSVBlob = (headers: string[], data: string[][]): Blob => {
  const csvContent = [
    headers.join(","),
    ...data.map(row => row.join(","))
  ].join("\n");
  
  return new Blob([csvContent], { type: "text/csv" });
};

// Detect potential unique identifiers in CSV data
export const detectUniqueKeys = (headers: string[], data: string[][]): string[] => {
  const uniqueKeys: string[] = [];
  
  headers.forEach((header, index) => {
    // Skip very small column names or generic-sounding ones
    if (header.length < 2 || ['id', 'no', 'num', '#'].includes(header.toLowerCase())) {
      return;
    }
    
    // Extract all values for this column
    const columnValues = data.map(row => row[index]);
    
    // Check if all values are present and unique
    const hasEmptyValues = columnValues.some(value => !value || value.trim() === '');
    if (hasEmptyValues) return;
    
    // Check for duplicates
    const uniqueValues = new Set(columnValues);
    
    // If all values are unique or almost unique (>95%), consider it a potential key
    const uniquenessRatio = uniqueValues.size / columnValues.length;
    if (uniquenessRatio > 0.95) {
      uniqueKeys.push(header);
    }
  });

  return uniqueKeys;
};

// Find matching unique keys between two datasets
export const findMatchingUniqueKeys = (
  sourceHeaders: string[],
  sourceData: string[][],
  targetHeaders: string[],
  targetData: string[][]
): Array<{
  sourceKey: string;
  targetKey: string;
  confidence: number;
  matchingValuesCount: number;
}> => {
  const sourceUniqueKeys = detectUniqueKeys(sourceHeaders, sourceData);
  const targetUniqueKeys = detectUniqueKeys(targetHeaders, targetData);
  
  if (sourceUniqueKeys.length === 0 || targetUniqueKeys.length === 0) {
    return [];
  }
  
  const results: Array<{
    sourceKey: string;
    targetKey: string;
    confidence: number;
    matchingValuesCount: number;
  }> = [];
  
  // Compare each source key with each target key
  sourceUniqueKeys.forEach(sourceKey => {
    const sourceKeyIndex = sourceHeaders.indexOf(sourceKey);
    const sourceValues = sourceData.map(row => row[sourceKeyIndex]);
    
    targetUniqueKeys.forEach(targetKey => {
      const targetKeyIndex = targetHeaders.indexOf(targetKey);
      const targetValues = targetData.map(row => row[targetKeyIndex]);
      
      // Count matching values
      let matchingCount = 0;
      const sourceValuesSet = new Set(sourceValues);
      
      targetValues.forEach(value => {
        if (sourceValuesSet.has(value)) {
          matchingCount++;
        }
      });
      
      // Calculate name similarity
      const nameSimilarity = calculateStringSimilarity(sourceKey, targetKey);
      
      // Calculate match percentage
      const matchPercentage = (matchingCount / Math.min(sourceValues.length, targetValues.length)) * 100;
      
      // Combined confidence score (weighted)
      const confidence = (matchPercentage * 0.7) + (nameSimilarity * 0.3);
      
      results.push({
        sourceKey,
        targetKey,
        confidence: Math.round(confidence),
        matchingValuesCount: matchingCount
      });
    });
  });
  
  // Sort by confidence
  return results.sort((a, b) => b.confidence - a.confidence);
};

// Calculate string similarity (used for header matching)
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return 100;
  
  // Check for inclusion
  if (s1.includes(s2) || s2.includes(s1)) {
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    return Math.round(ratio * 80); // Max 80% for inclusion
  }
  
  // Calculate Levenshtein distance (simplified version)
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100; // Both empty strings
  
  let matchCount = 0;
  const len = Math.min(s1.length, s2.length);
  
  for (let i = 0; i < len; i++) {
    if (s1[i] === s2[i]) {
      matchCount++;
    }
  }
  
  return Math.round((matchCount / maxLen) * 60); // Max 60% for character matching
};

// Analyze relationships between columns
export const analyzeColumnRelationship = (
  sourceColumns: string[],
  sourceData: string[][],
  sourceHeaders: string[],
  targetColumns: string[],
  targetData: string[][],
  targetHeaders: string[],
  uniqueKeyMapping: { sourceKey: string; targetKey: string }
): { formula: string; confidence: number } => {
  // Get indices for the columns and unique keys
  const sourceIndices = sourceColumns.map(col => sourceHeaders.indexOf(col));
  const targetIndices = targetColumns.map(col => targetHeaders.indexOf(col));
  const sourceKeyIndex = sourceHeaders.indexOf(uniqueKeyMapping.sourceKey);
  const targetKeyIndex = targetHeaders.indexOf(uniqueKeyMapping.targetKey);
  
  // Find matching rows based on the unique key
  const matchingPairs: Array<{ sourceRow: string[]; targetRow: string[] }> = [];
  
  // Build a map of target key values to rows for faster lookup
  const targetKeyMap = new Map<string, string[]>();
  targetData.forEach(row => {
    const keyValue = row[targetKeyIndex];
    if (keyValue && keyValue.trim()) {
      targetKeyMap.set(keyValue, row);
    }
  });
  
  // Find all matching rows
  sourceData.forEach(sourceRow => {
    const sourceKeyValue = sourceRow[sourceKeyIndex];
    if (sourceKeyValue && targetKeyMap.has(sourceKeyValue)) {
      matchingPairs.push({
        sourceRow,
        targetRow: targetKeyMap.get(sourceKeyValue)!
      });
    }
  });
  
  if (matchingPairs.length === 0) {
    return { formula: "No matching data found", confidence: 0 };
  }
  
  // Use the first matching pair to determine relationship
  const { sourceRow, targetRow } = matchingPairs[0];
  
  // Extract values for source and target columns
  const sourceValues = sourceIndices.map(idx => {
    const val = sourceRow[idx];
    return isNaN(Number(val)) ? val : Number(val);
  });
  
  const targetValues = targetIndices.map(idx => {
    const val = targetRow[idx];
    return isNaN(Number(val)) ? val : Number(val);
  });
  
  // For simplicity in this initial version, let's check for basic arithmetic relationships
  // if all values are numeric
  if (sourceValues.every(v => typeof v === 'number') && 
      targetValues.every(v => typeof v === 'number') &&
      sourceValues.length > 0 && targetValues.length === 1) {
    
    const targetValue = targetValues[0] as number;
    
    // Try addition
    const sumSourceValues = (sourceValues as number[]).reduce((sum, val) => sum + val, 0);
    if (Math.abs(sumSourceValues - targetValue) < 0.001) {
      const formula = `${sourceColumns.join(' + ')} = ${targetColumns[0]}`;
      return { formula, confidence: 95 };
    }
    
    // Try subtraction (if 2 source columns)
    if (sourceValues.length === 2) {
      const diff = Math.abs((sourceValues[0] as number) - (sourceValues[1] as number));
      if (Math.abs(diff - targetValue) < 0.001) {
        const formula = `|${sourceColumns[0]} - ${sourceColumns[1]}| = ${targetColumns[0]}`;
        return { formula, confidence: 90 };
      }
    }
    
    // Try multiplication
    const product = (sourceValues as number[]).reduce((prod, val) => prod * val, 1);
    if (Math.abs(product - targetValue) < 0.001) {
      const formula = `${sourceColumns.join(' × ')} = ${targetColumns[0]}`;
      return { formula, confidence: 85 };
    }
  }
  
  // Check for string concatenation
  if (sourceValues.every(v => typeof v === 'string') && 
      targetValues.every(v => typeof v === 'string') && 
      targetValues.length === 1) {
      
    const combined = (sourceValues as string[]).join('');
    if (combined === targetValues[0]) {
      const formula = `${sourceColumns.join(' + ')} = ${targetColumns[0]} (concatenation)`;
      return { formula, confidence: 90 };
    }
  }
  
  // If no clear pattern is found
  return { 
    formula: "Custom formula needed", 
    confidence: 0 
  };
};

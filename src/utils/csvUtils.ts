
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
      
      // Extract data rows (up to 100 rows after the header)
      const data = lines.slice(headerRowIndex + 1, Math.min(lines.length, headerRowIndex + 101))
        .map(line => line.split(",").map(cell => cell.trim()))
        .filter(row => row.length === headers.length); // Ensure complete rows
      
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

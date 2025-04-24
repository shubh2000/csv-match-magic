
/**
 * Utility functions for parsing and handling CSV files
 */

// Parse a CSV file and extract headers and data
export const parseCSVFile = async (file: File): Promise<{
  headers: string[];
  data: string[][];
}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      
      // Extract headers from the first line
      const headers = lines[0].split(",").map(header => header.trim());
      
      // Extract data (limit to 5 rows for preview)
      const data = lines.slice(1, 6).map(line => 
        line.split(",").map(cell => cell.trim())
      );
      
      resolve({ headers, data });
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

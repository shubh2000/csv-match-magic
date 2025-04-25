
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseCSVFile } from '@/utils/csvUtils';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FileText, Upload } from 'lucide-react';

interface FileUploadFormProps {
  onFilesUploaded: (sourceFile: {
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
    rowCount: number;
    columnCount: number;
  }, targetFile: {
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
    rowCount: number;
    columnCount: number;
  }) => void;
}

interface FileData {
  headers: string[];
  data: string[][];
  fileName: string;
  headerRowIndex: number;
  rowCount: number;
  columnCount: number;
  possibleHeaderRows: Array<{ index: number, headers: string[] }>;
  selectedHeaderRowIndex: number;
  rawLines: string[];
}

const FileUploadForm = ({ onFilesUploaded }: FileUploadFormProps) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceData, setSourceData] = useState<FileData | null>(null);
  const [targetData, setTargetData] = useState<FileData | null>(null);
  const [sourceMetadataOpen, setSourceMetadataOpen] = useState(false);
  const [targetMetadataOpen, setTargetMetadataOpen] = useState(false);
  
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  
  const handleSourceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceFile(file);
      setIsLoading(true);
      try {
        const parsedData = await parseCSVFile(file);
        const rawLines = await readFileAsLines(file);
        
        // Find possible header rows (first few non-empty rows)
        const possibleHeaderRows = findPossibleHeaderRows(rawLines, 5);
        
        setSourceData({
          ...parsedData,
          fileName: file.name,
          rowCount: parsedData.data.length,
          columnCount: parsedData.headers.length,
          possibleHeaderRows,
          selectedHeaderRowIndex: parsedData.headerRowIndex,
          rawLines
        });
        setSourceMetadataOpen(true);
      } catch (error) {
        toast.error('Error processing source file');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTargetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTargetFile(file);
      setIsLoading(true);
      try {
        const parsedData = await parseCSVFile(file);
        const rawLines = await readFileAsLines(file);
        
        // Find possible header rows
        const possibleHeaderRows = findPossibleHeaderRows(rawLines, 5);
        
        setTargetData({
          ...parsedData,
          fileName: file.name,
          rowCount: parsedData.data.length,
          columnCount: parsedData.headers.length,
          possibleHeaderRows,
          selectedHeaderRowIndex: parsedData.headerRowIndex,
          rawLines
        });
        setTargetMetadataOpen(true);
      } catch (error) {
        toast.error('Error processing target file');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const readFileAsLines = (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        resolve(lines);
      };
      reader.readAsText(file);
    });
  };
  
  const findPossibleHeaderRows = (lines: string[], maxRows: number): Array<{ index: number, headers: string[] }> => {
    const result: Array<{ index: number, headers: string[] }> = [];
    
    // Check first few non-empty rows
    for (let i = 0; i < Math.min(lines.length, maxRows); i++) {
      const line = lines[i];
      if (line && line.trim()) {
        const headers = line.split(',').map(h => h.trim());
        result.push({
          index: i,
          headers
        });
      }
    }
    
    return result;
  };
  
  const handleHeaderRowChange = (value: string, isSource: boolean) => {
    const rowIndex = parseInt(value, 10);
    
    if (isSource && sourceData && sourceData.rawLines) {
      const headers = sourceData.rawLines[rowIndex].split(',').map(h => h.trim());
      const newData = sourceData.rawLines
        .slice(rowIndex + 1)
        .map(line => line.split(',').map(cell => cell.trim()));
      
      setSourceData({
        ...sourceData,
        headers,
        data: newData,
        selectedHeaderRowIndex: rowIndex,
        headerRowIndex: rowIndex,
        rowCount: newData.length
      });
    } else if (!isSource && targetData && targetData.rawLines) {
      const headers = targetData.rawLines[rowIndex].split(',').map(h => h.trim());
      const newData = targetData.rawLines
        .slice(rowIndex + 1)
        .map(line => line.split(',').map(cell => cell.trim()));
      
      setTargetData({
        ...targetData,
        headers,
        data: newData,
        selectedHeaderRowIndex: rowIndex,
        headerRowIndex: rowIndex,
        rowCount: newData.length
      });
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceData || !targetData) {
      toast.error('Please upload and configure both CSV files');
      return;
    }
    
    // Finalize the data to be sent
    const finalSourceData = {
      headers: sourceData.headers,
      data: sourceData.data,
      fileName: sourceData.fileName,
      headerRowIndex: sourceData.selectedHeaderRowIndex,
      rowCount: sourceData.rowCount,
      columnCount: sourceData.columnCount
    };
    
    const finalTargetData = {
      headers: targetData.headers,
      data: targetData.data,
      fileName: targetData.fileName,
      headerRowIndex: targetData.selectedHeaderRowIndex,
      rowCount: targetData.rowCount,
      columnCount: targetData.columnCount
    };
    
    onFilesUploaded(finalSourceData, finalTargetData);
    toast.success('Files processed successfully!');
  };
  
  return (
    <Card className="p-6 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Source CSV</h3>
            <div className="border-2 border-dashed border-muted rounded-md p-4 text-center cursor-pointer hover:bg-muted/10 transition-colors"
                 onClick={() => sourceInputRef.current?.click()}>
              <input
                ref={sourceInputRef}
                type="file"
                accept=".csv"
                onChange={handleSourceFileChange}
                className="hidden"
              />
              <div className="py-4 flex flex-col items-center justify-center">
                {sourceFile ? (
                  <>
                    <FileText className="h-8 w-8 text-csv-blue mb-2" />
                    <p className="font-medium text-csv-blue">{sourceFile.name}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="block text-sm font-medium mb-1">Click to upload Source CSV</span>
                    <span className="text-xs text-muted-foreground">or drag and drop</span>
                  </>
                )}
              </div>
            </div>
            
            {sourceData && (
              <Collapsible open={sourceMetadataOpen} onOpenChange={setSourceMetadataOpen}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Source File Metadata</h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {sourceMetadataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="pt-2 pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">File name:</div>
                      <div className="font-medium">{sourceData.fileName}</div>
                      
                      <div className="text-muted-foreground">Rows:</div>
                      <div className="font-medium">{sourceData.rowCount}</div>
                      
                      <div className="text-muted-foreground">Columns:</div>
                      <div className="font-medium">{sourceData.columnCount}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sourceHeaderRow">Header Row</Label>
                      <Select
                        value={sourceData.selectedHeaderRowIndex.toString()}
                        onValueChange={(value) => handleHeaderRowChange(value, true)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a header row" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceData.possibleHeaderRows.map(({ index, headers }) => (
                            <SelectItem 
                              key={index} 
                              value={index.toString()}
                            >
                              Row {index + 1}: {headers.slice(0, 3).join(", ")}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Detected Headers</Label>
                      <div className="bg-muted p-2 rounded text-sm overflow-x-auto whitespace-nowrap">
                        {sourceData.headers.join(", ")}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Target File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Target CSV</h3>
            <div className="border-2 border-dashed border-muted rounded-md p-4 text-center cursor-pointer hover:bg-muted/10 transition-colors"
                 onClick={() => targetInputRef.current?.click()}>
              <input
                ref={targetInputRef}
                type="file"
                accept=".csv"
                onChange={handleTargetFileChange}
                className="hidden"
              />
              <div className="py-4 flex flex-col items-center justify-center">
                {targetFile ? (
                  <>
                    <FileText className="h-8 w-8 text-csv-blue mb-2" />
                    <p className="font-medium text-csv-blue">{targetFile.name}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="block text-sm font-medium mb-1">Click to upload Target CSV</span>
                    <span className="text-xs text-muted-foreground">or drag and drop</span>
                  </>
                )}
              </div>
            </div>
            
            {targetData && (
              <Collapsible open={targetMetadataOpen} onOpenChange={setTargetMetadataOpen}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Target File Metadata</h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {targetMetadataOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="pt-2 pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">File name:</div>
                      <div className="font-medium">{targetData.fileName}</div>
                      
                      <div className="text-muted-foreground">Rows:</div>
                      <div className="font-medium">{targetData.rowCount}</div>
                      
                      <div className="text-muted-foreground">Columns:</div>
                      <div className="font-medium">{targetData.columnCount}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="targetHeaderRow">Header Row</Label>
                      <Select
                        value={targetData.selectedHeaderRowIndex.toString()}
                        onValueChange={(value) => handleHeaderRowChange(value, false)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a header row" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetData.possibleHeaderRows.map(({ index, headers }) => (
                            <SelectItem 
                              key={index} 
                              value={index.toString()}
                            >
                              Row {index + 1}: {headers.slice(0, 3).join(", ")}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Detected Headers</Label>
                      <div className="bg-muted p-2 rounded text-sm overflow-x-auto whitespace-nowrap">
                        {targetData.headers.join(", ")}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-gradient-header text-white"
          disabled={!sourceData || !targetData || isLoading}
        >
          {isLoading ? 'Processing...' : 'Continue to Column Matching'}
        </Button>
      </form>
    </Card>
  );
};

export default FileUploadForm;

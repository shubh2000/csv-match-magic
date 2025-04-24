
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { parseCSVFile } from '@/utils/csvUtils';
import { toast } from 'sonner';

interface FileUploadFormProps {
  onFilesUploaded: (sourceFile: {
    headers: string[];
    data: string[][];
    fileName: string;
  }, targetFile: {
    headers: string[];
    data: string[][];
    fileName: string;
  }) => void;
}

const FileUploadForm = ({ onFilesUploaded }: FileUploadFormProps) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  
  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSourceFile(e.target.files[0]);
    }
  };

  const handleTargetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTargetFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sourceFile || !targetFile) {
      toast.error('Please upload both source and target CSV files');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const sourceData = await parseCSVFile(sourceFile);
      const targetData = await parseCSVFile(targetFile);
      
      if (sourceData.headers.length === 0 || targetData.headers.length === 0) {
        toast.error('One or both files do not contain valid CSV headers');
        return;
      }
      
      onFilesUploaded(
        { ...sourceData, fileName: sourceFile.name },
        { ...targetData, fileName: targetFile.name }
      );
      
      toast.success('Files processed successfully!');
    } catch (error) {
      toast.error('Error processing CSV files. Please ensure they are valid CSV format.');
      console.error('Error processing files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source File Upload */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Source CSV</h3>
            <p className="text-sm text-muted-foreground">
              Upload the file with headers you want to match from
            </p>
            <div className="border-2 border-dashed border-muted rounded-md p-4 text-center cursor-pointer hover:bg-muted/10 transition-colors"
                 onClick={() => sourceInputRef.current?.click()}>
              <input
                ref={sourceInputRef}
                type="file"
                accept=".csv"
                onChange={handleSourceFileChange}
                className="hidden"
              />
              <div className="py-4">
                {sourceFile ? (
                  <p className="font-medium text-csv-blue">{sourceFile.name}</p>
                ) : (
                  <>
                    <span className="block text-sm font-medium mb-1">Click to upload Source CSV</span>
                    <span className="text-xs text-muted-foreground">or drag and drop</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Target File Upload */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Target CSV</h3>
            <p className="text-sm text-muted-foreground">
              Upload the file with headers you want to match to
            </p>
            <div className="border-2 border-dashed border-muted rounded-md p-4 text-center cursor-pointer hover:bg-muted/10 transition-colors"
                 onClick={() => targetInputRef.current?.click()}>
              <input
                ref={targetInputRef}
                type="file"
                accept=".csv"
                onChange={handleTargetFileChange}
                className="hidden"
              />
              <div className="py-4">
                {targetFile ? (
                  <p className="font-medium text-csv-blue">{targetFile.name}</p>
                ) : (
                  <>
                    <span className="block text-sm font-medium mb-1">Click to upload Target CSV</span>
                    <span className="text-xs text-muted-foreground">or drag and drop</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-gradient-header text-white"
          disabled={!sourceFile || !targetFile || isLoading}
        >
          {isLoading ? 'Processing...' : 'Match Headers'}
        </Button>
      </form>
    </Card>
  );
};

export default FileUploadForm;


import { useState } from 'react';
import FileUploadForm from '@/components/FileUploadForm';
import MatchingInterface from '@/components/MatchingInterface';
import { Toaster } from 'sonner';

const Index = () => {
  const [stage, setStage] = useState<'upload' | 'matching'>('upload');
  const [sourceData, setSourceData] = useState<{
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
  } | null>(null);
  const [targetData, setTargetData] = useState<{
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
  } | null>(null);

  const handleFilesUploaded = (
    sourceFile: {
      headers: string[];
      data: string[][];
      fileName: string;
      headerRowIndex: number;
    },
    targetFile: {
      headers: string[];
      data: string[][];
      fileName: string;
      headerRowIndex: number;
    }
  ) => {
    setSourceData(sourceFile);
    setTargetData(targetFile);
    setStage('matching');
  };

  const handleReset = () => {
    setStage('upload');
    setSourceData(null);
    setTargetData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-header text-white py-6 px-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">CSV Match Magic</h1>
          <p className="mt-2 text-slate-100">Match and map columns between different CSV files with ease</p>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {stage === 'upload' && (
          <>
            <div className="max-w-3xl mx-auto mb-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Match CSV Headers Intelligently</h2>
              <p className="text-muted-foreground">
                Upload two CSV files to automatically find matching columns despite different header names.
                Review suggestions, make adjustments, and export your final mapping.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <FileUploadForm onFilesUploaded={handleFilesUploaded} />
            </div>
          </>
        )}
        
        {stage === 'matching' && sourceData && targetData && (
          <div className="max-w-5xl mx-auto">
            <MatchingInterface
              sourceData={sourceData}
              targetData={targetData}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-auto py-6 bg-gray-100 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CSV Match Magic &copy; {new Date().getFullYear()} - Quickly match headers between CSV files</p>
        </div>
      </footer>
      
      <Toaster position="top-center" />
    </div>
  );
};

export default Index;

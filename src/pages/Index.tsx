
import { useState } from 'react';
import FileUploadForm from '@/components/FileUploadForm';
import MatchingInterface from '@/components/MatchingInterface';
import ReconciliationInterface from '@/components/ReconciliationInterface';
import { Toaster } from 'sonner';

const Index = () => {
  const [stage, setStage] = useState<'upload' | 'matching' | 'reconciliation'>('upload');
  const [sourceData, setSourceData] = useState<{
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
    rowCount: number;
    columnCount: number;
  } | null>(null);
  const [targetData, setTargetData] = useState<{
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
    rowCount: number;
    columnCount: number;
  } | null>(null);
  const [uniqueKeyMapping, setUniqueKeyMapping] = useState<{
    sourceKey: string;
    targetKey: string;
    confidence: number;
  } | null>(null);
  const [reconciliationColumns, setReconciliationColumns] = useState<{
    sourceColumns: string[];
    targetColumns: string[];
    formula: string;
  } | null>(null);

  const handleFilesUploaded = (
    sourceFile: {
      headers: string[];
      data: string[][];
      fileName: string;
      headerRowIndex: number;
      rowCount: number;
      columnCount: number;
    },
    targetFile: {
      headers: string[];
      data: string[][];
      fileName: string;
      headerRowIndex: number;
      rowCount: number;
      columnCount: number;
    }
  ) => {
    setSourceData(sourceFile);
    setTargetData(targetFile);
    setStage('matching');
  };

  const handleUniqueKeySelected = (uniqueKey: {
    sourceKey: string;
    targetKey: string;
    confidence: number;
  }) => {
    setUniqueKeyMapping(uniqueKey);
  };

  const handleReconciliationColumnsSelected = (columns: {
    sourceColumns: string[];
    targetColumns: string[];
    formula: string;
  }) => {
    setReconciliationColumns(columns);
    setStage('reconciliation');
  };

  const handleReset = () => {
    setStage('upload');
    setSourceData(null);
    setTargetData(null);
    setUniqueKeyMapping(null);
    setReconciliationColumns(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-header text-white py-6 px-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">CSV Reconciliation Tool</h1>
          <p className="mt-2 text-slate-100">Match, reconcile, and analyze CSV files with ease</p>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {stage === 'upload' && (
          <>
            <div className="max-w-3xl mx-auto mb-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Upload Files for Reconciliation</h2>
              <p className="text-muted-foreground">
                Upload two CSV files to analyze and reconcile their data.
                The system will automatically detect headers, unique keys, and help you establish reconciliation logic.
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
              onUniqueKeySelected={handleUniqueKeySelected}
              onReconciliationColumnsSelected={handleReconciliationColumnsSelected}
              onReset={handleReset}
            />
          </div>
        )}
        
        {stage === 'reconciliation' && sourceData && targetData && uniqueKeyMapping && reconciliationColumns && (
          <div className="max-w-5xl mx-auto">
            <ReconciliationInterface
              sourceData={sourceData}
              targetData={targetData}
              uniqueKeyMapping={uniqueKeyMapping}
              reconciliationColumns={reconciliationColumns}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-auto py-6 bg-gray-100 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CSV Reconciliation Tool &copy; {new Date().getFullYear()} - Advanced data reconciliation</p>
        </div>
      </footer>
      
      <Toaster position="top-center" />
    </div>
  );
};

export default Index;


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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
      {/* Header with modern gradient and shadow */}
      <header className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 px-4 shadow-lg">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            CSV Reconciliation Tool
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl">
            Advanced data matching and reconciliation platform for your CSV files
          </p>
        </div>
        {/* Decorative element */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]" />
      </header>
      
      {/* Main content with improved spacing and container */}
      <main className="container mx-auto max-w-6xl px-4 py-12">
        {stage === 'upload' && (
          <div className="space-y-8">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">
                Upload Files for Reconciliation
              </h2>
              <p className="text-gray-600 text-lg">
                Upload two CSV files to analyze and reconcile their data.
                Our intelligent system will help you match and validate your data efficiently.
              </p>
            </div>
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200/50 p-8">
              <FileUploadForm onFilesUploaded={handleFilesUploaded} />
            </div>
          </div>
        )}
        
        {stage === 'matching' && sourceData && targetData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-8">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-8">
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
      
      {/* Footer with gradient fade */}
      <footer className="mt-auto py-8 bg-gradient-to-t from-gray-100 to-transparent border-t border-gray-200/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-600">
            CSV Reconciliation Tool &copy; {new Date().getFullYear()} - Advanced data reconciliation
          </p>
        </div>
      </footer>
      
      <Toaster position="top-center" />
    </div>
  );
};

export default Index;

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { findMatchingUniqueKeys, detectUniqueKeys, analyzeColumnRelationship } from '@/utils/csvUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, Key, Link, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import FormulaBuilder from './FormulaBuilder';

interface MatchingInterfaceProps {
  sourceData: {
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
    rowCount: number;
    columnCount: number;
  };
  targetData: {
    headers: string[];
    data: string[][];
    fileName: string;
    headerRowIndex: number;
    rowCount: number;
    columnCount: number;
  };
  onUniqueKeySelected: (uniqueKey: {
    sourceKey: string;
    targetKey: string;
    confidence: number;
  }) => void;
  onReconciliationColumnsSelected: (columns: {
    sourceColumns: string[];
    targetColumns: string[];
    formula: string;
  }) => void;
  onReset: () => void;
}

const STEPS = {
  IDENTIFY_KEY: 'IDENTIFY_KEY',
  CONFIRM_KEY: 'CONFIRM_KEY',
  SELECT_COLUMNS: 'SELECT_COLUMNS',
  CONFIRM_FORMULA: 'CONFIRM_FORMULA'
};

const MatchingInterface = ({ 
  sourceData, 
  targetData, 
  onUniqueKeySelected, 
  onReconciliationColumnsSelected,
  onReset 
}: MatchingInterfaceProps) => {
  const [step, setStep] = useState(STEPS.IDENTIFY_KEY);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Key identification state
  const [potentialKeys, setPotentialKeys] = useState<Array<{
    sourceKey: string;
    targetKey: string;
    confidence: number;
    matchingValuesCount: number;
  }>>([]);
  
  const [selectedUniqueKey, setSelectedUniqueKey] = useState<{
    sourceKey: string;
    targetKey: string;
    confidence: number;
  } | null>(null);
  
  const [manualKeySelection, setManualKeySelection] = useState(false);
  const [manualSourceKey, setManualSourceKey] = useState('');
  const [manualTargetKey, setManualTargetKey] = useState('');
  
  // Reconciliation columns state
  const [selectedSourceColumns, setSelectedSourceColumns] = useState<string[]>([]);
  const [selectedTargetColumns, setSelectedTargetColumns] = useState<string[]>([]);
  const [formulaResult, setFormulaResult] = useState<{formula: string; confidence: number} | null>(null);
  const [customFormula, setCustomFormula] = useState('');
  const [useCustomFormula, setUseCustomFormula] = useState(false);
  
  // Find potential unique keys when component mounts
  useEffect(() => {
    // Auto-detect potential unique keys for select dropdowns
    if (step === STEPS.IDENTIFY_KEY && manualKeySelection) {
      const sourceKeys = detectUniqueKeys(sourceData.headers, sourceData.data);
      const targetKeys = detectUniqueKeys(targetData.headers, targetData.data);
      
      if (sourceKeys.length > 0) {
        setManualSourceKey(sourceKeys[0]);
      }
      
      if (targetKeys.length > 0) {
        setManualTargetKey(targetKeys[0]);
      }
    }
  }, [step, manualKeySelection]);
  
  const handleFindUniqueKeys = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        const matchingKeys = findMatchingUniqueKeys(
          sourceData.headers, 
          sourceData.data, 
          targetData.headers, 
          targetData.data
        );
        
        setPotentialKeys(matchingKeys);
        setIsProcessing(false);
        
        if (matchingKeys.length > 0) {
          setSelectedUniqueKey({
            sourceKey: matchingKeys[0].sourceKey,
            targetKey: matchingKeys[0].targetKey,
            confidence: matchingKeys[0].confidence
          });
          
          toast.success(`Found ${matchingKeys.length} potential unique key matches`);
        } else {
          toast.warning('No matching unique keys detected automatically');
          setManualKeySelection(true);
        }
      } catch (error) {
        console.error('Error finding unique keys:', error);
        toast.error('Failed to identify unique keys');
        setIsProcessing(false);
      }
    }, 1000);
  };
  
  const handleConfirmUniqueKey = () => {
    let keyToUse = selectedUniqueKey;
    
    if (manualKeySelection) {
      // Use manually selected keys
      if (!manualSourceKey || !manualTargetKey) {
        toast.error('Please select both source and target keys');
        return;
      }
      
      keyToUse = {
        sourceKey: manualSourceKey,
        targetKey: manualTargetKey,
        confidence: 0 // User-defined has no auto-calculated confidence
      };
    } else if (!selectedUniqueKey) {
      toast.error('Please select a unique key mapping');
      return;
    }
    
    onUniqueKeySelected(keyToUse!);
    setStep(STEPS.SELECT_COLUMNS);
    toast.success('Unique key mapping confirmed');
  };
  
  const handleSelectUniqueKey = (index: number) => {
    const selected = potentialKeys[index];
    
    setSelectedUniqueKey({
      sourceKey: selected.sourceKey,
      targetKey: selected.targetKey,
      confidence: selected.confidence
    });
  };
  
  const toggleSourceColumn = (column: string) => {
    if (selectedSourceColumns.includes(column)) {
      setSelectedSourceColumns(selectedSourceColumns.filter(c => c !== column));
    } else {
      setSelectedSourceColumns([...selectedSourceColumns, column]);
    }
  };
  
  const toggleTargetColumn = (column: string) => {
    if (selectedTargetColumns.includes(column)) {
      setSelectedTargetColumns(selectedTargetColumns.filter(c => c !== column));
    } else {
      setSelectedTargetColumns([...selectedTargetColumns, column]);
    }
  };
  
  const handleDetermineFormula = () => {
    if (selectedSourceColumns.length === 0 || selectedTargetColumns.length === 0) {
      toast.error('Please select at least one column from both source and target');
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      try {
        // Analyze relationship between selected columns
        const result = analyzeColumnRelationship(
          selectedSourceColumns,
          sourceData.data,
          sourceData.headers,
          selectedTargetColumns,
          targetData.data,
          targetData.headers,
          {
            sourceKey: selectedUniqueKey!.sourceKey,
            targetKey: selectedUniqueKey!.targetKey
          }
        );
        
        setFormulaResult(result);
        setCustomFormula(result.formula);
        setStep(STEPS.CONFIRM_FORMULA);
        setIsProcessing(false);
        
        if (result.confidence > 0) {
          toast.success('Potential reconciliation formula identified');
        } else {
          toast.info('No clear formula detected, please define a custom formula');
          setUseCustomFormula(true);
        }
      } catch (error) {
        console.error('Error determining formula:', error);
        toast.error('Failed to determine reconciliation formula');
        setIsProcessing(false);
      }
    }, 1000);
  };
  
  const handleConfirmFormula = () => {
    const formula = useCustomFormula ? customFormula : (formulaResult?.formula || '');
    
    onReconciliationColumnsSelected({
      sourceColumns: selectedSourceColumns,
      targetColumns: selectedTargetColumns,
      formula
    });
    
    toast.success('Reconciliation formula confirmed');
  };

  const handleCustomFormulaChange = (formula: string) => {
    setCustomFormula(formula);
  };
  
  const renderUniqueKeyIdentification = () => {
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Unique Key Identification</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={manualKeySelection} 
                onCheckedChange={setManualKeySelection} 
                id="manual-selection"
              />
              <Label htmlFor="manual-selection">Manual Selection</Label>
            </div>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Source File</h3>
                <div className="text-sm space-y-1 mb-4">
                  <div><span className="text-muted-foreground">Filename:</span> {sourceData.fileName}</div>
                  <div><span className="text-muted-foreground">Rows:</span> {sourceData.rowCount}</div>
                  <div><span className="text-muted-foreground">Header Row:</span> {sourceData.headerRowIndex + 1}</div>
                </div>
                
                {manualKeySelection && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="sourceKey">Select Source Unique Key</Label>
                    <Select value={manualSourceKey} onValueChange={setManualSourceKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Target File</h3>
                <div className="text-sm space-y-1 mb-4">
                  <div><span className="text-muted-foreground">Filename:</span> {targetData.fileName}</div>
                  <div><span className="text-muted-foreground">Rows:</span> {targetData.rowCount}</div>
                  <div><span className="text-muted-foreground">Header Row:</span> {targetData.headerRowIndex + 1}</div>
                </div>
                
                {manualKeySelection && (
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="targetKey">Select Target Unique Key</Label>
                    <Select value={manualTargetKey} onValueChange={setManualTargetKey}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a column" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            
            {!manualKeySelection && (
              <>
                {potentialKeys.length === 0 ? (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={handleFindUniqueKeys}
                      className="bg-gradient-header text-white"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Analyzing...' : 'Identify Unique Keys'}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-medium">Potential Matching Keys</h3>
                    <div className="space-y-2">
                      {potentialKeys.map((key, index) => (
                        <div 
                          key={index}
                          className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedUniqueKey?.sourceKey === key.sourceKey && 
                            selectedUniqueKey?.targetKey === key.targetKey ? 
                            'border-primary bg-primary/5' : ''
                          }`}
                          onClick={() => handleSelectUniqueKey(index)}
                        >
                          <div className="flex items-center space-x-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                              <div className="font-medium">{key.sourceKey}</div>
                              <ChevronRight className="h-4 w-4 hidden sm:block" />
                              <div className="font-medium">{key.targetKey}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="whitespace-nowrap">
                              {key.matchingValuesCount} matches
                            </Badge>
                            <Badge className={`${
                              key.confidence > 80 ? 'bg-green-500' :
                              key.confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}>
                              {key.confidence}% match
                            </Badge>
                            {selectedUniqueKey?.sourceKey === key.sourceKey && 
                             selectedUniqueKey?.targetKey === key.targetKey && (
                              <Check className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={onReset}>
            Back
          </Button>
          <Button 
            onClick={handleConfirmUniqueKey}
            className="bg-gradient-header text-white"
            disabled={(!selectedUniqueKey && !manualKeySelection) || 
                     (manualKeySelection && (!manualSourceKey || !manualTargetKey))}
          >
            Confirm Key Mapping
          </Button>
        </div>
      </>
    );
  };
  
  const renderSelectColumns = () => {
    const keyInfo = manualKeySelection ? 
      { sourceKey: manualSourceKey, targetKey: manualTargetKey, confidence: 0 } :
      selectedUniqueKey!;
    
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Select Reconciliation Columns</h2>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">Source Columns</h3>
                  <Badge variant="outline" className="font-normal">
                    Key: {keyInfo.sourceKey}
                  </Badge>
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-3">
                  {sourceData.headers
                    .filter(header => header !== keyInfo.sourceKey) // Exclude the key column
                    .map(header => (
                      <div key={header} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`source-${header}`} 
                          checked={selectedSourceColumns.includes(header)}
                          onCheckedChange={() => toggleSourceColumn(header)}
                        />
                        <Label htmlFor={`source-${header}`} className="cursor-pointer">
                          {header}
                        </Label>
                      </div>
                    ))
                  }
                </div>
                
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedSourceColumns.length} columns
                  </p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium">Target Columns</h3>
                  <Badge variant="outline" className="font-normal">
                    Key: {keyInfo.targetKey}
                  </Badge>
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-3">
                  {targetData.headers
                    .filter(header => header !== keyInfo.targetKey) // Exclude the key column
                    .map(header => (
                      <div key={header} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`target-${header}`} 
                          checked={selectedTargetColumns.includes(header)}
                          onCheckedChange={() => toggleTargetColumn(header)}
                        />
                        <Label htmlFor={`target-${header}`} className="cursor-pointer">
                          {header}
                        </Label>
                      </div>
                    ))
                  }
                </div>
                
                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedTargetColumns.length} columns
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="bg-muted rounded-md p-4">
                <div className="text-sm mb-2">
                  <span className="font-medium">Selected Key Mapping: </span> 
                  {keyInfo.sourceKey} <ChevronRight className="inline h-3 w-3" /> {keyInfo.targetKey}
                  {keyInfo.confidence > 0 && (
                    <Badge className="ml-2">
                      {keyInfo.confidence}% confidence
                    </Badge>
                  )}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Selected Source Columns: </span> 
                  {selectedSourceColumns.length > 0 ? selectedSourceColumns.join(', ') : 'None'}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Selected Target Columns: </span> 
                  {selectedTargetColumns.length > 0 ? selectedTargetColumns.join(', ') : 'None'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(STEPS.IDENTIFY_KEY)}>
            Back
          </Button>
          <Button 
            onClick={handleDetermineFormula}
            className="bg-gradient-header text-white"
            disabled={selectedSourceColumns.length === 0 || selectedTargetColumns.length === 0 || isProcessing}
          >
            {isProcessing ? 'Analyzing...' : 'Identify Reconciliation Logic'}
          </Button>
        </div>
      </>
    );
  };
  
  const renderConfirmFormula = () => {
    const keyInfo = manualKeySelection ? 
      { sourceKey: manualSourceKey, targetKey: manualTargetKey, confidence: 0 } :
      selectedUniqueKey!;
      
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Confirm Reconciliation Logic</h2>
        </div>
        
        <Card className="mb-6">
          <CardContent className="p-6 space-y-6">
            {!useCustomFormula && formulaResult && (
              <div>
                <h3 className="text-lg font-medium mb-4">Detected Formula</h3>
                <div className="bg-muted p-4 rounded-md space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-mono text-lg">
                      {formulaResult.formula || 'No formula detected'}
                    </div>
                    
                    {formulaResult.confidence > 0 && (
                      <Badge className={`${
                        formulaResult.confidence > 80 ? 'bg-green-500' :
                        formulaResult.confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {formulaResult.confidence}% confidence
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={useCustomFormula} 
                  onCheckedChange={setUseCustomFormula} 
                  id="custom-formula"
                />
                <Label htmlFor="custom-formula">Build custom formula</Label>
              </div>
              
              {useCustomFormula && (
                <FormulaBuilder
                  sourceColumns={selectedSourceColumns}
                  targetColumns={selectedTargetColumns}
                  sourceData={sourceData.data}
                  targetData={targetData.data}
                  sourceHeaders={sourceData.headers}
                  targetHeaders={targetData.headers}
                  uniqueKeyMapping={{
                    sourceKey: keyInfo.sourceKey,
                    targetKey: keyInfo.targetKey
                  }}
                  onFormulaChange={handleCustomFormulaChange}
                />
              )}
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-2">Final Formula Preview</h3>
              <div className="bg-slate-100 p-4 rounded-md">
                <div className="font-mono break-all">
                  {useCustomFormula ? customFormula : (formulaResult?.formula || 'No formula available')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(STEPS.SELECT_COLUMNS)}>
            Back
          </Button>
          <Button 
            onClick={handleConfirmFormula}
            className="bg-gradient-header text-white"
          >
            Start Reconciliation
          </Button>
        </div>
      </>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between mb-6">
        <div className="hidden sm:flex w-full max-w-3xl mx-auto justify-between">
          {Object.entries(STEPS).map(([key, value], index, array) => (
            <div key={key} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                step === value ? 'bg-primary text-primary-foreground' :
                Object.values(STEPS).indexOf(step) > index ? 'bg-primary/80 text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              <div className={`ml-2 text-sm font-medium ${
                step === value ? 'text-primary' :
                Object.values(STEPS).indexOf(step) > index ? 'text-muted-foreground' :
                'text-muted-foreground'
              }`}>
                {key.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
              </div>
              
              {index < array.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  Object.values(STEPS).indexOf(step) > index ? 'bg-primary/60' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {step === STEPS.IDENTIFY_KEY && renderUniqueKeyIdentification()}
      {step === STEPS.SELECT_COLUMNS && renderSelectColumns()}
      {step === STEPS.CONFIRM_FORMULA && renderConfirmFormula()}
    </div>
  );
};

export default MatchingInterface;

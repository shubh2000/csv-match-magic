
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Equal } from 'lucide-react';

interface FormulaBuilderProps {
  sourceColumns: string[];
  targetColumns: string[];
  sourceData: string[][];
  targetData: string[][];
  sourceHeaders: string[];
  targetHeaders: string[];
  uniqueKeyMapping: { sourceKey: string; targetKey: string };
  onFormulaChange: (formula: string) => void;
}

type FormulaItem = {
  id: string;
  type: 'column' | 'operator';
  value: string;
  source: 'source' | 'target' | 'manual';
};

type FormulaPartType = 'source' | 'target';

const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
  sourceColumns,
  targetColumns,
  sourceData,
  targetData,
  sourceHeaders,
  targetHeaders,
  uniqueKeyMapping,
  onFormulaChange,
}) => {
  const [formulaItems, setFormulaItems] = useState<FormulaItem[]>([]);
  const [previewResult, setPreviewResult] = useState<{
    sourceResult: string | number | null;
    targetResult: string | number | null;
    matched: boolean;
  } | null>(null);

  const [exampleMatch, setExampleMatch] = useState<{
    sourceRow: string[];
    targetRow: string[];
  } | null>(null);

  // Track whether we're building the source or target part of the formula
  const [currentPart, setCurrentPart] = useState<FormulaPartType>('source');

  useEffect(() => {
    findExampleMatch();
  }, [uniqueKeyMapping]);

  useEffect(() => {
    // Format the formula to send to parent
    const formula = formatFormula();
    onFormulaChange(formula);
    updatePreviewResult();
  }, [formulaItems, exampleMatch, currentPart]);

  const formatFormula = () => {
    // Find the equals sign position
    const equalsIndex = formulaItems.findIndex(
      item => item.type === 'operator' && item.value === '='
    );
    
    if (equalsIndex === -1) {
      // No equals sign yet, just join all items
      return formulaItems.map(item => item.value).join('');
    }
    
    // Format with source and target parts
    const sourcePart = formulaItems
      .slice(0, equalsIndex)
      .map(item => item.value)
      .join('');
      
    const targetPart = formulaItems
      .slice(equalsIndex + 1)
      .map(item => item.value)
      .join('');
      
    return `${sourcePart} = ${targetPart}`;
  };

  const findExampleMatch = () => {
    if (!uniqueKeyMapping || !sourceData.length || !targetData.length) {
      setExampleMatch(null);
      return;
    }

    const sourceKeyIndex = sourceHeaders.indexOf(uniqueKeyMapping.sourceKey);
    const targetKeyIndex = targetHeaders.indexOf(uniqueKeyMapping.targetKey);

    if (sourceKeyIndex === -1 || targetKeyIndex === -1) {
      setExampleMatch(null);
      return;
    }

    const targetKeyMap = new Map<string, string[]>();
    targetData.forEach(row => {
      const keyValue = row[targetKeyIndex];
      if (keyValue && keyValue.trim()) {
        targetKeyMap.set(keyValue, row);
      }
    });

    for (const sourceRow of sourceData) {
      const sourceKeyValue = sourceRow[sourceKeyIndex];
      if (sourceKeyValue && targetKeyMap.has(sourceKeyValue)) {
        setExampleMatch({
          sourceRow,
          targetRow: targetKeyMap.get(sourceKeyValue)!
        });
        return;
      }
    }

    setExampleMatch(null);
  };

  const updatePreviewResult = () => {
    if (!exampleMatch) {
      setPreviewResult(null);
      return;
    }

    // Find the position of equals sign
    const equalsIndex = formulaItems.findIndex(
      item => item.type === 'operator' && item.value === '='
    );

    // If no equals sign, we can't compare
    if (equalsIndex === -1) {
      setPreviewResult(null);
      return;
    }

    try {
      // Split items into source and target parts
      const sourceItems = formulaItems.slice(0, equalsIndex);
      const targetItems = formulaItems.slice(equalsIndex + 1);

      // Evaluate both parts
      const sourceResult = evaluateFormulaPart(sourceItems);
      const targetResult = evaluateFormulaPart(targetItems);

      // Check if they match
      const matched = sourceResult !== null && 
                      targetResult !== null && 
                      typeof sourceResult === typeof targetResult &&
                      (
                        typeof sourceResult === 'number' 
                          ? Math.abs((sourceResult as number) - (targetResult as number)) < 0.001
                          : sourceResult === targetResult
                      );

      setPreviewResult({
        sourceResult,
        targetResult,
        matched
      });
    } catch (error) {
      console.error('Error evaluating formula:', error);
      setPreviewResult({
        sourceResult: 'Error',
        targetResult: 'Error',
        matched: false
      });
    }
  };

  const evaluateFormulaPart = (items: FormulaItem[]): string | number | null => {
    if (items.length === 0) return null;

    // Build expression with replaced values
    let expression = '';
    
    items.forEach(item => {
      if (item.type === 'column') {
        const value = getColumnValue(item.value, item.source);
        if (typeof value === 'number') {
          expression += value;
        } else {
          expression += `"${value}"`;
        }
      } else if (item.type === 'operator') {
        expression += item.value;
      }
    });

    if (!expression) return null;

    // Evaluate the expression
    try {
      // Handle string operations
      if (expression.includes('"')) {
        // Simple string concatenation for now
        return expression.replace(/"/g, '');
      }
      
      // Handle numeric operations
      return eval(expression);
    } catch (error) {
      console.error('Error evaluating part:', error, expression);
      return 'Error';
    }
  };

  const getColumnValue = (columnName: string, source: 'source' | 'target' | 'manual') => {
    if (!exampleMatch) return '';

    if (source === 'source') {
      const columnIndex = sourceHeaders.indexOf(columnName);
      return columnIndex !== -1 ? parseValueIfNumeric(exampleMatch.sourceRow[columnIndex]) : '';
    } else if (source === 'target') {
      const columnIndex = targetHeaders.indexOf(columnName);
      return columnIndex !== -1 ? parseValueIfNumeric(exampleMatch.targetRow[columnIndex]) : '';
    }
    
    return '';
  };

  const parseValueIfNumeric = (value: string): string | number => {
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }
    return value;
  };

  const addColumn = (columnName: string, source: 'source' | 'target') => {
    // Toggle the currentPart if needed
    if (source !== currentPart) {
      // If we're switching sides and there's no equals sign, add it
      const hasEquals = formulaItems.some(item => item.type === 'operator' && item.value === '=');
      if (!hasEquals) {
        addOperator('=');
      }
    }
    
    setFormulaItems([
      ...formulaItems, 
      { 
        id: `item-${Date.now()}`, 
        type: 'column', 
        value: columnName, 
        source 
      }
    ]);

    // Update current part if we've passed an equals sign
    if (formulaItems.some(item => item.type === 'operator' && item.value === '=')) {
      setCurrentPart('target');
    }
  };

  const addOperator = (operator: string) => {
    // Don't add operator at beginning or after another operator
    if (formulaItems.length === 0 || formulaItems[formulaItems.length - 1].type === 'operator') {
      return;
    }
    
    // If it's an equals sign, switch to target part
    if (operator === '=') {
      // Don't allow multiple equals signs
      if (formulaItems.some(item => item.type === 'operator' && item.value === '=')) {
        return;
      }
      setCurrentPart('target');
    }
    
    setFormulaItems([
      ...formulaItems, 
      { 
        id: `op-${Date.now()}`, 
        type: 'operator', 
        value: operator,
        source: 'manual'
      }
    ]);
  };

  const removeItem = (id: string) => {
    const newItems = formulaItems.filter(item => item.id !== id);
    
    // If we removed the equals sign, reset current part to source
    if (
      formulaItems.some(item => item.id === id && item.type === 'operator' && item.value === '=') &&
      !newItems.some(item => item.type === 'operator' && item.value === '=')
    ) {
      setCurrentPart('source');
    }
    
    setFormulaItems(newItems);
  };

  const clearFormula = () => {
    setFormulaItems([]);
    setCurrentPart('source');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const operatorKeys = ['+', '-', '*', '/', '=', '(', ')'];
    const pressedKey = e.key;

    if (operatorKeys.includes(pressedKey)) {
      e.preventDefault();
      if (formulaItems.length === 0 || formulaItems[formulaItems.length - 1].type === 'operator') {
        return;
      }
      addOperator(pressedKey);
    }
  };

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
        <div className="w-full sm:w-1/2">
          <h3 className="text-sm font-medium mb-2">Source Columns</h3>
          <div className="h-40 overflow-y-auto border rounded-md p-2 bg-white">
            {sourceColumns.map(column => (
              <Badge 
                key={`source-${column}`}
                variant="outline"
                className={`m-1 cursor-pointer hover:bg-primary/20 transition-colors ${
                  currentPart === 'source' ? 'border-blue-400' : ''
                }`}
                onClick={() => addColumn(column, 'source')}
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="w-full sm:w-1/2">
          <h3 className="text-sm font-medium mb-2">Target Columns</h3>
          <div className="h-40 overflow-y-auto border rounded-md p-2 bg-white">
            {targetColumns.map(column => (
              <Badge 
                key={`target-${column}`}
                variant="outline"
                className={`m-1 cursor-pointer hover:bg-primary/20 transition-colors ${
                  currentPart === 'target' ? 'border-green-400' : ''
                }`}
                onClick={() => addColumn(column, 'target')}
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Formula Builder</h3>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFormula}
            >
              Clear
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2 min-h-12 mb-4">
            {formulaItems.length > 0 ? (
              formulaItems.map(item => (
                <div 
                  key={item.id} 
                  className={`
                    flex items-center px-2 py-1 rounded 
                    ${item.type === 'column' 
                      ? (item.source === 'source' ? 'bg-blue-100' : 'bg-green-100') 
                      : item.value === '=' ? 'bg-amber-100' : 'bg-gray-100'}
                  `}
                >
                  <span className="mr-1">
                    {item.value}
                  </span>
                  <button 
                    className="text-gray-500 hover:text-gray-700" 
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-gray-400 italic">Click columns and type operators to build formula</div>
            )}
          </div>

          <div className="text-sm text-muted-foreground mb-3">
            Type operators (+, -, *, /, =, (, )) or click columns to build your formula
          </div>

          {exampleMatch ? (
            <div className="bg-muted p-3 rounded-md mt-3">
              <div className="text-xs text-muted-foreground mb-1">Preview with sample data:</div>
              
              {previewResult ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm text-blue-600">
                      Source: {previewResult.sourceResult !== null ? previewResult.sourceResult : 'N/A'}
                    </span>
                    <span className="text-sm">{previewResult.matched ? '✓' : '≠'}</span>
                    <span className="font-mono text-sm text-green-600">
                      Target: {previewResult.targetResult !== null ? previewResult.targetResult : 'N/A'}
                    </span>
                  </div>
                  
                  {previewResult.matched ? (
                    <div className="text-green-600 text-sm font-medium">
                      Values match! Reconciliation successful.
                    </div>
                  ) : previewResult.sourceResult !== null && previewResult.targetResult !== null ? (
                    <div className="text-amber-600 text-sm font-medium">
                      Values don't match. Adjust your formula.
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      Complete the formula to compare values.
                    </div>
                  )}
                </div>
              ) : (
                <div className="font-mono text-sm">
                  Build a complete formula with = sign to see preview
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">
              No matching data available for preview
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default FormulaBuilder;

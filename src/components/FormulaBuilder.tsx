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
  const [previewResult, setPreviewResult] = useState<string | number | null>(null);

  // Find an example row with matching unique keys
  const [exampleMatch, setExampleMatch] = useState<{
    sourceRow: string[];
    targetRow: string[];
  } | null>(null);
  
  useEffect(() => {
    findExampleMatch();
  }, [uniqueKeyMapping]);

  useEffect(() => {
    // Update the formula string whenever formula items change
    const formulaString = formulaItems.map(item => {
      if (item.type === 'column') {
        return `${item.value}`;
      } else {
        return ` ${item.value} `;
      }
    }).join('');
    
    onFormulaChange(formulaString.trim());
    updatePreviewResult();
  }, [formulaItems, exampleMatch]);

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

    // Build a map of target key values to rows
    const targetKeyMap = new Map<string, string[]>();
    targetData.forEach(row => {
      const keyValue = row[targetKeyIndex];
      if (keyValue && keyValue.trim()) {
        targetKeyMap.set(keyValue, row);
      }
    });

    // Find the first matching source row
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
      setPreviewResult('No matching data found');
      return;
    }

    try {
      const formula = buildFormulaExpression();
      if (!formula) {
        setPreviewResult(null);
        return;
      }

      // Evaluate the formula with the example data
      const result = evaluateFormula(formula);
      setPreviewResult(result);
    } catch (error) {
      console.error('Error evaluating formula:', error);
      setPreviewResult('Error in formula');
    }
  };

  const buildFormulaExpression = () => {
    if (formulaItems.length === 0) return '';

    let expression = '';
    
    formulaItems.forEach(item => {
      if (item.type === 'column') {
        const value = getColumnValue(item.value, item.source);
        expression += typeof value === 'number' ? value : `"${value}"`;
      } else {
        expression += item.value;
      }
    });

    return expression;
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

  const evaluateFormula = (formula: string): string | number => {
    try {
      // Simple evaluation of basic mathematical operations
      // This is a simplified version - in a real app, you'd want a more robust solution
      // with proper validation, sanitization, and error handling
      
      // Extract all column values and replace them in the formula
      let evaluableFormula = formula;
      
      // If the formula contains only strings, return their concatenation
      if (evaluableFormula.includes('"')) {
        const parts = evaluableFormula.match(/"([^"]*)"/g);
        if (parts) {
          return parts.map(p => p.replace(/"/g, '')).join('');
        }
      }
      
      // Otherwise evaluate as a mathematical expression
      // eslint-disable-next-line no-eval
      const result = eval(evaluableFormula);
      return typeof result === 'number' ? Number(result.toFixed(4)) : result;
    } catch (error) {
      console.error('Error evaluating formula:', error, formula);
      return 'Invalid formula';
    }
  };

  const addColumn = (columnName: string, source: 'source' | 'target') => {
    // If last item was a column, add a default operator first
    if (formulaItems.length > 0 && formulaItems[formulaItems.length - 1].type === 'column') {
      addOperator('+');
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
  };

  const addOperator = (operator: string) => {
    // Don't add operator if no columns added yet or last item was already an operator
    if (formulaItems.length === 0 || formulaItems[formulaItems.length - 1].type === 'operator') {
      return;
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
    setFormulaItems(formulaItems.filter(item => item.id !== id));
  };

  const clearFormula = () => {
    setFormulaItems([]);
  };

  const getColumnsFromSource = (source: 'source' | 'target') => {
    return source === 'source' ? sourceColumns : targetColumns;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
        <div className="w-full sm:w-1/2">
          <h3 className="text-sm font-medium mb-2">Source Columns</h3>
          <div className="h-40 overflow-y-auto border rounded-md p-2 bg-white">
            {sourceColumns.map(column => (
              <Badge 
                key={`source-${column}`}
                variant="outline"
                className="m-1 cursor-pointer hover:bg-primary/20 transition-colors"
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
                className="m-1 cursor-pointer hover:bg-primary/20 transition-colors"
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
                      : 'bg-gray-100'}
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
              <div className="text-gray-400 italic">Click or drag columns to build formula</div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={() => addOperator('+')}>+</Button>
              <Button variant="outline" size="sm" onClick={() => addOperator('-')}>-</Button>
              <Button variant="outline" size="sm" onClick={() => addOperator('*')}>×</Button>
              <Button variant="outline" size="sm" onClick={() => addOperator('/')}>÷</Button>
              <Button variant="outline" size="sm" onClick={() => addOperator('(')}>(</Button>
              <Button variant="outline" size="sm" onClick={() => addOperator(')')}>)</Button>
            </div>
            
            {exampleMatch ? (
              <div className="bg-muted p-3 rounded-md mt-3">
                <div className="text-xs text-muted-foreground mb-1">Preview with sample data:</div>
                <div className="font-mono text-sm">
                  {previewResult !== null ? previewResult : 'Build a formula to see preview'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-2">
                No matching data available for preview
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FormulaBuilder;

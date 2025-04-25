
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ReconciliationInterfaceProps {
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
  uniqueKeyMapping: {
    sourceKey: string;
    targetKey: string;
    confidence: number;
  };
  reconciliationColumns: {
    sourceColumns: string[];
    targetColumns: string[];
    formula: string;
  };
  onReset: () => void;
}

interface ReconciliationResult {
  matched: Array<{
    sourceRow: Record<string, string>;
    targetRow: Record<string, string>;
    sourceValue: number | string;
    targetValue: number | string;
    difference: number | null;
    key: string;
  }>;
  unmatched: Array<{
    type: 'source' | 'target';
    row: Record<string, string>;
    key: string;
  }>;
  summary: {
    totalTransactions: number;
    matchedTransactions: number;
    unmatchedTransactions: number;
    matchPercentage: number;
    totalSourceValue: number;
    totalTargetValue: number;
    totalDifference: number;
  };
}

const COLORS = ['#4caf50', '#f44336', '#2196f3', '#ff9800'];

const ReconciliationInterface = ({ 
  sourceData, 
  targetData, 
  uniqueKeyMapping, 
  reconciliationColumns,
  onReset 
}: ReconciliationInterfaceProps) => {
  const [isReconciling, setIsReconciling] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  
  const performReconciliation = () => {
    setIsReconciling(true);
    
    // Simulate a delay for processing
    setTimeout(() => {
      try {
        // Convert source data to map for easy lookup by key
        const sourceMap = new Map();
        const sourceKeyIndex = sourceData.headers.indexOf(uniqueKeyMapping.sourceKey);
        const sourceColumnIndices = reconciliationColumns.sourceColumns.map(col => 
          sourceData.headers.indexOf(col)
        );
        
        sourceData.data.forEach(row => {
          const keyValue = row[sourceKeyIndex];
          if (keyValue) {
            // Create structured row object
            const rowObj: Record<string, string> = {};
            sourceData.headers.forEach((header, idx) => {
              rowObj[header] = row[idx];
            });
            
            // Calculate the source value based on columns (basic implementation for now)
            let sourceValue: number | string = 0;
            if (sourceColumnIndices.length === 1) {
              sourceValue = isNaN(Number(row[sourceColumnIndices[0]])) 
                ? row[sourceColumnIndices[0]] 
                : Number(row[sourceColumnIndices[0]]);
            } else {
              // Sum all numeric values for simplicity
              sourceValue = sourceColumnIndices.reduce((sum, idx) => {
                const val = row[idx];
                return sum + (isNaN(Number(val)) ? 0 : Number(val));
              }, 0);
            }
            
            sourceMap.set(keyValue, { row: rowObj, value: sourceValue });
          }
        });
        
        // Process target data
        const targetKeyIndex = targetData.headers.indexOf(uniqueKeyMapping.targetKey);
        const targetColumnIndices = reconciliationColumns.targetColumns.map(col => 
          targetData.headers.indexOf(col)
        );
        
        const matched: ReconciliationResult['matched'] = [];
        const unmatchedSource: Array<{ type: 'source'; row: Record<string, string>; key: string }> = [];
        const unmatchedTarget: Array<{ type: 'target'; row: Record<string, string>; key: string }> = [];
        
        let totalSourceValue = 0;
        let totalTargetValue = 0;
        let totalDifference = 0;
        
        // Process target rows and find matches
        targetData.data.forEach(row => {
          const keyValue = row[targetKeyIndex];
          if (!keyValue) return;
          
          // Create structured row object
          const rowObj: Record<string, string> = {};
          targetData.headers.forEach((header, idx) => {
            rowObj[header] = row[idx];
          });
          
          // Calculate the target value based on columns
          let targetValue: number | string = 0;
          if (targetColumnIndices.length === 1) {
            targetValue = isNaN(Number(row[targetColumnIndices[0]])) 
              ? row[targetColumnIndices[0]] 
              : Number(row[targetColumnIndices[0]]);
          } else {
            // Sum all numeric values for simplicity
            targetValue = targetColumnIndices.reduce((sum, idx) => {
              const val = row[idx];
              return sum + (isNaN(Number(val)) ? 0 : Number(val));
            }, 0);
          }
          
          if (sourceMap.has(keyValue)) {
            const sourceItem = sourceMap.get(keyValue);
            sourceMap.delete(keyValue); // Remove from source map to track unmatched later
            
            // Calculate difference if numeric
            let difference = null;
            if (typeof sourceItem.value === 'number' && typeof targetValue === 'number') {
              difference = sourceItem.value - targetValue;
              totalSourceValue += sourceItem.value;
              totalTargetValue += targetValue;
              totalDifference += difference;
            }
            
            matched.push({
              sourceRow: sourceItem.row,
              targetRow: rowObj,
              sourceValue: sourceItem.value,
              targetValue,
              difference,
              key: keyValue
            });
          } else {
            // Target row has no matching source
            unmatchedTarget.push({ 
              type: 'target', 
              row: rowObj,
              key: keyValue 
            });
          }
        });
        
        // All remaining items in sourceMap are unmatched
        sourceMap.forEach((value, key) => {
          unmatchedSource.push({ 
            type: 'source', 
            row: value.row,
            key 
          });
          
          if (typeof value.value === 'number') {
            totalSourceValue += value.value;
          }
        });
        
        // Combine unmatched from both sources
        const unmatched = [...unmatchedSource, ...unmatchedTarget];
        
        // Calculate summary statistics
        const totalTransactions = matched.length + unmatched.length;
        const matchedTransactions = matched.length;
        const unmatchedTransactions = unmatched.length;
        const matchPercentage = totalTransactions > 0 
          ? Math.round((matchedTransactions / totalTransactions) * 100)
          : 0;
        
        setResult({
          matched,
          unmatched,
          summary: {
            totalTransactions,
            matchedTransactions,
            unmatchedTransactions,
            matchPercentage,
            totalSourceValue,
            totalTargetValue,
            totalDifference
          }
        });
        
        toast.success('Reconciliation completed successfully');
      } catch (error) {
        console.error('Reconciliation error:', error);
        toast.error('Failed to complete reconciliation');
      } finally {
        setIsReconciling(false);
      }
    }, 1500);
  };
  
  const renderSummaryCharts = () => {
    if (!result) return null;
    
    const { summary } = result;
    
    const matchData = [
      { name: 'Matched', value: summary.matchedTransactions },
      { name: 'Unmatched', value: summary.unmatchedTransactions },
    ];
    
    const valueData = [
      { name: 'Source', value: summary.totalSourceValue },
      { name: 'Target', value: summary.totalTargetValue },
      { name: 'Difference', value: Math.abs(summary.totalDifference) },
    ];
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Transaction Match Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={matchData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {matchData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} transactions`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Value Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={valueData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)}`, 'Amount']} />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderSummaryStats = () => {
    if (!result) return null;
    
    const { summary } = result;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Total Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summary.matchedTransactions}</div>
            <p className="text-xs text-muted-foreground">Matched Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{summary.unmatchedTransactions}</div>
            <p className="text-xs text-muted-foreground">Unmatched Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{summary.matchPercentage}%</div>
            <p className="text-xs text-muted-foreground">Match Rate</p>
          </CardContent>
        </Card>
        
        <Card className="col-span-2">
          <CardContent className="p-4">
            <div className="text-xl font-bold">{summary.totalSourceValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total Source Value</p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4">
            <div className="text-xl font-bold">{summary.totalTargetValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total Target Value</p>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderDataTable = (data: Array<any>, type: 'matched' | 'unmatched') => {
    if (!data.length) return <p className="text-center py-4">No {type} transactions found</p>;
    
    // Define columns based on type
    let columns: string[] = [];
    if (type === 'matched') {
      columns = [
        uniqueKeyMapping.sourceKey,
        ...reconciliationColumns.sourceColumns,
        ...reconciliationColumns.targetColumns,
        'Difference'
      ];
    } else {
      columns = type === 'unmatched' 
        ? ['Source/Target', uniqueKeyMapping.sourceKey || uniqueKeyMapping.targetKey]
        : [uniqueKeyMapping.sourceKey];
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              {columns.map(column => (
                <th key={column} className="p-2 text-left text-xs font-medium text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="border-b hover:bg-muted/50">
                {type === 'matched' ? (
                  <>
                    <td className="p-2 text-sm">{item.key}</td>
                    {reconciliationColumns.sourceColumns.map(col => (
                      <td key={col} className="p-2 text-sm">{item.sourceRow[col]}</td>
                    ))}
                    {reconciliationColumns.targetColumns.map(col => (
                      <td key={col} className="p-2 text-sm">{item.targetRow[col]}</td>
                    ))}
                    <td className="p-2 text-sm">
                      {item.difference !== null ? (
                        <span className={item.difference === 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.difference.toFixed(2)}
                        </span>
                      ) : 'N/A'}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-sm">
                      <Badge variant={item.type === 'source' ? 'outline' : 'secondary'}>
                        {item.type === 'source' ? 'Source' : 'Target'}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm">{item.key}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Data Reconciliation</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={onReset}>
            Start Over
          </Button>
        </div>
      </div>
      
      {/* Reconciliation setup info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Unique Key Mapping</h3>
              <div className="rounded-md bg-white p-3 shadow-sm">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Source Key:</span>
                  <span className="font-medium">{uniqueKeyMapping.sourceKey}</span>
                  
                  <span className="text-muted-foreground">Target Key:</span>
                  <span className="font-medium">{uniqueKeyMapping.targetKey}</span>
                  
                  <span className="text-muted-foreground">Confidence:</span>
                  <span className="font-medium">{uniqueKeyMapping.confidence}%</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Reconciliation Formula</h3>
              <div className="rounded-md bg-white p-3 shadow-sm">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <span className="text-muted-foreground">Source Columns:</span>
                  <span className="font-medium">{reconciliationColumns.sourceColumns.join(', ')}</span>
                  
                  <span className="text-muted-foreground">Target Columns:</span>
                  <span className="font-medium">{reconciliationColumns.targetColumns.join(', ')}</span>
                  
                  <span className="text-muted-foreground">Formula:</span>
                  <span className="font-medium font-mono bg-muted/50 p-1 rounded">
                    {reconciliationColumns.formula}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {!result ? (
        <div className="flex justify-center p-8">
          <Button 
            size="lg" 
            onClick={performReconciliation}
            disabled={isReconciling}
            className="bg-gradient-header text-white"
          >
            {isReconciling ? 'Processing...' : 'Start Reconciliation'}
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="summary" className="w-full" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="matched">Matched ({result.matched.length})</TabsTrigger>
            <TabsTrigger value="unmatched">Unmatched ({result.unmatched.length})</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="summary" className="space-y-6">
              <h3 className="text-xl font-semibold">Reconciliation Summary</h3>
              {renderSummaryStats()}
              <Separator />
              {renderSummaryCharts()}
              <div className="pt-4">
                <Button onClick={() => setActiveTab('matched')} className="mr-2">
                  View Matched Transactions
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('unmatched')}>
                  View Unmatched Transactions
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="matched" className="space-y-4">
              <h3 className="text-xl font-semibold">Matched Transactions</h3>
              <Card>
                <CardContent className="p-3">
                  {renderDataTable(result.matched, 'matched')}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="unmatched" className="space-y-4">
              <h3 className="text-xl font-semibold">Unmatched Transactions</h3>
              <Card>
                <CardContent className="p-3">
                  {renderDataTable(result.unmatched, 'unmatched')}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
};

export default ReconciliationInterface;


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { type ReconciliationData, type ReconciliationKeyMapping, type ReconciliationFormula, type ReconciliationResult } from '@/types/reconciliation';
import { evaluateFormulaForRow } from '@/utils/formulaUtils';
import { SummaryStats } from './reconciliation/SummaryStats';
import { SummaryCharts } from './reconciliation/SummaryCharts';
import { MatchedTransactionsTable } from './reconciliation/MatchedTransactionsTable';
import { UnmatchedTransactionsTable } from './reconciliation/UnmatchedTransactionsTable';

interface ReconciliationInterfaceProps {
  sourceData: ReconciliationData;
  targetData: ReconciliationData;
  uniqueKeyMapping: ReconciliationKeyMapping;
  reconciliationColumns: ReconciliationFormula;
  onReset: () => void;
}

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

    setTimeout(() => {
      try {
        const sourceMap = new Map();
        const sourceKeyIndex = sourceData.headers.indexOf(uniqueKeyMapping.sourceKey);

        sourceData.data.forEach(row => {
          const keyValue = row[sourceKeyIndex];
          if (keyValue) {
            const rowObj: Record<string, string> = {};
            sourceData.headers.forEach((header, idx) => {
              rowObj[header] = row[idx];
            });

            const sourceValue = evaluateFormulaForRow(
              reconciliationColumns.sourceColumns,
              rowObj,
              reconciliationColumns.formula,
              true
            );

            sourceMap.set(keyValue, { row: rowObj, value: sourceValue });
          }
        });

        const targetKeyIndex = targetData.headers.indexOf(uniqueKeyMapping.targetKey);
        const matched = [];
        const unmatchedSource = [];
        const unmatchedTarget = [];

        let totalSourceValue = 0;
        let totalTargetValue = 0;
        let totalDifference = 0;
        let perfectMatches = 0;
        let valueMismatches = 0;

        targetData.data.forEach(row => {
          const keyValue = row[targetKeyIndex];
          if (!keyValue) return;

          const rowObj: Record<string, string> = {};
          targetData.headers.forEach((header, idx) => {
            rowObj[header] = row[idx];
          });

          const targetValue = evaluateFormulaForRow(
            reconciliationColumns.targetColumns,
            rowObj,
            reconciliationColumns.formula,
            false
          );

          if (sourceMap.has(keyValue)) {
            const sourceItem = sourceMap.get(keyValue);
            sourceMap.delete(keyValue);

            let difference = null;
            let status: 'matched' | 'value_mismatch' = 'matched';

            if (typeof sourceItem.value === 'number' && typeof targetValue === 'number') {
              difference = sourceItem.value - targetValue;
              totalSourceValue += sourceItem.value;
              totalTargetValue += targetValue;
              totalDifference += difference;

              if (Math.abs(difference) < 0.001) {
                difference = 0;
                perfectMatches++;
              } else {
                status = 'value_mismatch';
                valueMismatches++;
              }
            } else if (sourceItem.value !== targetValue) {
              status = 'value_mismatch';
              valueMismatches++;
            } else {
              perfectMatches++;
            }

            matched.push({
              sourceRow: sourceItem.row,
              targetRow: rowObj,
              sourceValue: sourceItem.value,
              targetValue,
              difference,
              key: keyValue,
              status
            });
          } else {
            unmatchedTarget.push({
              type: 'target',
              row: rowObj,
              key: keyValue,
              reason: `No matching transaction with ID '${keyValue}' found in source data`
            });
          }
        });

        sourceMap.forEach((value, key) => {
          unmatchedSource.push({
            type: 'source',
            row: value.row,
            key,
            reason: `No matching transaction with ID '${key}' found in target data`
          });

          if (typeof value.value === 'number') {
            totalSourceValue += value.value;
          }
        });

        const unmatched = [...unmatchedSource, ...unmatchedTarget];
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
            totalDifference,
            perfectMatches,
            valueMismatches
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

      <Card className="bg-muted/30">
        <div className="pt-6 px-6">
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
        </div>
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
              <SummaryStats summary={result.summary} />
              <div className="my-6 border-t" />
              <SummaryCharts summary={result.summary} />
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
                <div className="p-3">
                  <MatchedTransactionsTable transactions={result.matched} />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="unmatched" className="space-y-4">
              <h3 className="text-xl font-semibold">Unmatched Transactions</h3>
              <Card>
                <div className="p-3">
                  <UnmatchedTransactionsTable transactions={result.unmatched} />
                </div>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
};

export default ReconciliationInterface;

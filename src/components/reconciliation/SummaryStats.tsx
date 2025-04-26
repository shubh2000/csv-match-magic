
import { Card, CardContent } from '@/components/ui/card';
import { type ReconciliationSummary } from '@/types/reconciliation';

interface SummaryStatsProps {
  summary: ReconciliationSummary;
}

export const SummaryStats = ({ summary }: SummaryStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="overflow-hidden">
        <CardContent className="p-4 relative">
          <div className="text-2xl font-bold">{summary.totalTransactions}</div>
          <p className="text-xs text-muted-foreground">Total Transactions</p>
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-4 relative">
          <div className="text-2xl font-bold text-green-600">{summary.perfectMatches}</div>
          <p className="text-xs text-muted-foreground">Perfect Matches</p>
          <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-4 relative">
          <div className="text-2xl font-bold text-amber-600">{summary.valueMismatches}</div>
          <p className="text-xs text-muted-foreground">Value Mismatches</p>
          <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-4 relative">
          <div className="text-2xl font-bold text-red-600">{summary.unmatchedTransactions}</div>
          <p className="text-xs text-muted-foreground">Unmatched Transactions</p>
          <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
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

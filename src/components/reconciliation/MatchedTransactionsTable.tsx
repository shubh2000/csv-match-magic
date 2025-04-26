
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type MatchedTransaction } from '@/types/reconciliation';

interface MatchedTransactionsTableProps {
  transactions: MatchedTransaction[];
}

export const MatchedTransactionsTable = ({ transactions }: MatchedTransactionsTableProps) => {
  if (!transactions.length) {
    return <p className="text-center py-4">No matched transactions found</p>;
  }

  const hasDifferences = transactions.some(item => item.status === 'value_mismatch');

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Transaction ID</TableHead>
            <TableHead>Source Value</TableHead>
            <TableHead>Target Value</TableHead>
            {hasDifferences && <TableHead>Difference</TableHead>}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((item, idx) => (
            <TableRow
              key={idx}
              className={
                item.status === 'value_mismatch'
                  ? 'bg-amber-50 hover:bg-amber-100/80'
                  : 'hover:bg-muted/50'
              }
            >
              <TableCell className="font-medium">{item.key}</TableCell>
              <TableCell>
                {typeof item.sourceValue === 'number'
                  ? item.sourceValue.toFixed(2)
                  : item.sourceValue}
              </TableCell>
              <TableCell>
                {typeof item.targetValue === 'number'
                  ? item.targetValue.toFixed(2)
                  : item.targetValue}
              </TableCell>
              {hasDifferences && (
                <TableCell
                  className={
                    item.difference !== 0 && item.difference !== null ? 'text-red-600' : ''
                  }
                >
                  {typeof item.difference === 'number' ? item.difference.toFixed(2) : '-'}
                </TableCell>
              )}
              <TableCell>
                {item.status === 'value_mismatch' ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200"
                  >
                    Value mismatch
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    Perfect match
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

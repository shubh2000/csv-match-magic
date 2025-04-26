
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type UnmatchedTransaction } from '@/types/reconciliation';

interface UnmatchedTransactionsTableProps {
  transactions: UnmatchedTransaction[];
}

export const UnmatchedTransactionsTable = ({ transactions }: UnmatchedTransactionsTableProps) => {
  if (!transactions.length) {
    return <p className="text-center py-4">No unmatched transactions found</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Source/Target</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((item, idx) => (
            <TableRow key={idx} className="hover:bg-muted/50">
              <TableCell>
                <Badge
                  variant={item.type === 'source' ? 'outline' : 'secondary'}
                  className={
                    item.type === 'source'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }
                >
                  {item.type === 'source' ? 'Source' : 'Target'}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{item.key}</TableCell>
              <TableCell>{item.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

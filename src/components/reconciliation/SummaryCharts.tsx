
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ReconciliationSummary } from '@/types/reconciliation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4caf50', '#f44336', '#2196f3', '#ff9800'];

interface SummaryChartsProps {
  summary: ReconciliationSummary;
}

export const SummaryCharts = ({ summary }: SummaryChartsProps) => {
  const matchData = [
    { name: 'Perfect Match', value: summary.perfectMatches },
    { name: 'Value Mismatch', value: summary.valueMismatches },
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
                <Tooltip formatter={(value: number) => [`${value} transactions`, 'Count']} />
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

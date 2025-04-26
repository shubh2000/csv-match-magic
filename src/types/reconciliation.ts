
export interface ReconciliationData {
  headers: string[];
  data: string[][];
  fileName: string;
  headerRowIndex: number;
  rowCount: number;
  columnCount: number;
}

export interface ReconciliationKeyMapping {
  sourceKey: string;
  targetKey: string;
  confidence: number;
}

export interface ReconciliationFormula {
  sourceColumns: string[];
  targetColumns: string[];
  formula: string;
}

export interface MatchedTransaction {
  sourceRow: Record<string, string>;
  targetRow: Record<string, string>;
  sourceValue: number | string;
  targetValue: number | string;
  difference: number | null;
  key: string;
  status: 'matched' | 'value_mismatch';
}

export interface UnmatchedTransaction {
  type: 'source' | 'target';
  row: Record<string, string>;
  key: string;
  reason: string;
}

export interface ReconciliationSummary {
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  matchPercentage: number;
  totalSourceValue: number;
  totalTargetValue: number;
  totalDifference: number;
  perfectMatches: number;
  valueMismatches: number;
}

export interface ReconciliationResult {
  matched: MatchedTransaction[];
  unmatched: UnmatchedTransaction[];
  summary: ReconciliationSummary;
}
